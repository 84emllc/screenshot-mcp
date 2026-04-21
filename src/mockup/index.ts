// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { constants as fsConstants } from "node:fs";
import {
	access,
	copyFile,
	mkdir,
	rm,
	rmdir,
	stat,
	writeFile,
} from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { URL } from "node:url";
import type {
	BreakpointName,
	MockupBreakpointResult,
	MockupParams,
	MockupResult,
} from "../types.js";
import { captureAll } from "./capture.js";
import { stitch } from "./composite.js";
import { frameImage } from "./frame.js";
import { loadFrames } from "./frames.js";

const DEFAULT_BREAKPOINTS: BreakpointName[] = ["desktop", "mobile"];
const DEFAULT_WIDTHS: Record<BreakpointName, number> = {
	desktop: 1440,
	tablet: 768,
	mobile: 375,
};
const VALID_BREAKPOINTS: ReadonlySet<BreakpointName> = new Set([
	"desktop",
	"tablet",
	"mobile",
]);

function slugifyHost(urlStr: string): string {
	const u = new URL(urlStr);
	return u.hostname.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

async function ensureWritableDir(targetDir: string): Promise<void> {
	const abs = resolve(targetDir);
	let cursor = abs;
	const segments: string[] = [];
	while (true) {
		try {
			const s = await stat(cursor);
			if (!s.isDirectory()) {
				throw new Error(`Path "${cursor}" exists and is not a directory`);
			}
			try {
				await access(cursor, fsConstants.W_OK);
			} catch {
				throw new Error(`Directory "${cursor}" is not writable`);
			}
			break;
		} catch (err) {
			const code = (err as NodeJS.ErrnoException).code;
			if (code === "ENOENT") {
				segments.unshift(basename(cursor));
				const parent = dirname(cursor);
				if (parent === cursor) {
					throw new Error(`Cannot create directory "${targetDir}"`);
				}
				cursor = parent;
				continue;
			}
			throw err;
		}
	}
	if (segments.length === 0) return;
	for (const seg of segments) {
		cursor = join(cursor, seg);
		try {
			await mkdir(cursor);
		} catch (err) {
			const code = (err as NodeJS.ErrnoException).code;
			if (code === "EEXIST") continue;
			throw new Error(
				`Cannot create directory "${cursor}": ${(err as Error).message}`,
			);
		}
	}
}

function validateUrl(urlStr: string): void {
	try {
		const u = new URL(urlStr);
		if (u.protocol !== "http:" && u.protocol !== "https:") {
			throw new Error(`URL protocol must be http or https, got ${u.protocol}`);
		}
	} catch (err) {
		throw new Error(`Invalid URL "${urlStr}": ${(err as Error).message}`);
	}
}

function validateBreakpoints(input: unknown): BreakpointName[] {
	if (!Array.isArray(input) || input.length === 0) {
		throw new Error("breakpoints must be a non-empty array");
	}
	const seen = new Set<string>();
	const result: BreakpointName[] = [];
	for (const entry of input) {
		if (
			typeof entry !== "string" ||
			!VALID_BREAKPOINTS.has(entry as BreakpointName)
		) {
			throw new Error(
				`Unknown breakpoint "${String(entry)}" (must be one of: desktop, tablet, mobile)`,
			);
		}
		if (seen.has(entry)) {
			throw new Error(`Duplicate breakpoint "${entry}"`);
		}
		seen.add(entry);
		result.push(entry as BreakpointName);
	}
	return result;
}

function validateWidths(
	input: number[] | undefined,
	breakpoints: BreakpointName[],
): number[] {
	if (input === undefined) {
		return breakpoints.map((name) => DEFAULT_WIDTHS[name]);
	}
	if (!Array.isArray(input)) {
		throw new Error("widths must be an array of positive integers");
	}
	if (input.length !== breakpoints.length) {
		throw new Error(
			`widths length (${input.length}) must match breakpoints length (${breakpoints.length})`,
		);
	}
	for (const w of input) {
		if (
			typeof w !== "number" ||
			!Number.isFinite(w) ||
			!Number.isInteger(w) ||
			w <= 0
		) {
			throw new Error(
				`widths must contain positive finite integers, got ${String(w)}`,
			);
		}
	}
	return input;
}

export async function run(params: MockupParams): Promise<MockupResult> {
	validateUrl(params.url);

	const breakpoints = validateBreakpoints(
		params.breakpoints ?? DEFAULT_BREAKPOINTS,
	);
	const widths = validateWidths(params.widths, breakpoints);

	await ensureWritableDir(params.output_dir);

	const frameSet = await loadFrames(params.frame_set ?? "default");
	const prefix = params.filename_prefix ?? slugifyHost(params.url);
	const writtenByThisRun: string[] = [];
	let sessionDir: string | null = null;
	let createdRawDir: string | null = null;

	try {
		const captured = await captureAll({
			url: params.url,
			breakpoints,
			widths,
			use_device_emulation: params.use_device_emulation ?? false,
			page_timeout_ms: params.page_timeout_ms ?? 30000,
			selector_timeout_ms: params.selector_timeout_ms ?? 10000,
			wait_for_timeout: params.wait_for_timeout ?? 300,
			elements_to_hide: params.elements_to_hide ?? [],
			wait_for_selector: params.wait_for_selector,
			retry_on_timeout: params.retry_on_timeout,
		});
		sessionDir = captured.sessionDir;

		const fit = params.fit_mode ?? "top-crop";
		const breakpointResults: MockupBreakpointResult[] = [];
		const framedPaths: Partial<Record<BreakpointName, string>> = {};

		for (const cap of captured.breakpoints) {
			const frame = frameSet[cap.name];
			const buf = await frameImage(cap.path, frame, fit);
			const outPath = join(params.output_dir, `${prefix}-${cap.name}.png`);
			await writeFile(outPath, buf);
			writtenByThisRun.push(outPath);
			framedPaths[cap.name] = outPath;
			const sizeStat = await stat(outPath);
			breakpointResults.push({
				name: cap.name,
				width: cap.width,
				framed_dimensions: [frame.canvas.width, frame.canvas.height],
				file_size_bytes: sizeStat.size,
			});
		}

		let compositePath: string | null = null;
		if (params.composite) {
			const compositeBuf = await stitch(
				framedPaths,
				params.background ?? "transparent",
			);
			compositePath = join(params.output_dir, `${prefix}-composite.png`);
			await writeFile(compositePath, compositeBuf);
			writtenByThisRun.push(compositePath);
		}

		if (params.keep_raw) {
			const rawDir = join(params.output_dir, "raw");
			try {
				await mkdir(rawDir);
				createdRawDir = rawDir;
			} catch (err) {
				if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
			}
			for (const cap of captured.breakpoints) {
				const dest = join(rawDir, basename(cap.path));
				await copyFile(cap.path, dest);
				writtenByThisRun.push(dest);
			}
		}

		return {
			output_dir: params.output_dir,
			files: { ...framedPaths, composite: compositePath },
			breakpoints: breakpointResults,
		};
	} catch (err) {
		for (const p of writtenByThisRun) {
			await rm(p, { force: true });
		}
		if (createdRawDir) {
			try {
				await rmdir(createdRawDir);
			} catch {
				// not empty (pre-existing files), leave it
			}
		}
		throw err;
	} finally {
		if (sessionDir) {
			await rm(sessionDir, { recursive: true, force: true });
		}
	}
}
