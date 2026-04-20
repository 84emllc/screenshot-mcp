// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { constants as fsConstants } from "node:fs";
import { access, copyFile, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { URL } from "node:url";
import type {
	MockupBreakpointResult,
	MockupParams,
	MockupResult,
} from "../types.js";
import { captureAll } from "./capture.js";
import { stitch } from "./composite.js";
import { frameImage } from "./frame.js";
import { loadFrames } from "./frames.js";

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

export async function run(params: MockupParams): Promise<MockupResult> {
	validateUrl(params.url);

	const widths = params.widths ?? [1440, 768, 375];
	if (!Array.isArray(widths) || widths.length !== 3) {
		throw new Error(
			"widths must contain exactly three values: [desktop, tablet, mobile]",
		);
	}

	await ensureWritableDir(params.output_dir);

	const frameSet = await loadFrames(params.frame_set ?? "default");
	const prefix = params.filename_prefix ?? slugifyHost(params.url);
	const writtenByThisRun: string[] = [];
	let sessionDir: string | null = null;

	try {
		const captured = await captureAll({
			url: params.url,
			widths: widths as [number, number, number],
			use_device_emulation: params.use_device_emulation ?? false,
			page_timeout_ms: params.page_timeout_ms ?? 30000,
			selector_timeout_ms: params.selector_timeout_ms ?? 10000,
			wait_for_timeout: params.wait_for_timeout ?? 300,
			elements_to_hide: params.elements_to_hide ?? [],
			wait_for_selector: params.wait_for_selector,
		});
		sessionDir = captured.sessionDir;

		const fit = params.fit_mode ?? "top-crop";
		const breakpointResults: MockupBreakpointResult[] = [];
		const framedPaths: { desktop: string; tablet: string; mobile: string } = {
			desktop: "",
			tablet: "",
			mobile: "",
		};

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
			await mkdir(rawDir, { recursive: true });
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
		throw err;
	} finally {
		if (sessionDir) {
			await rm(sessionDir, { recursive: true, force: true });
		}
	}
}
