// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { takeScreenshot } from "../screenshot.js";
import type { ScreenshotResult } from "../types.js";

export interface CaptureOpts {
	url: string;
	widths: [number, number, number];
	use_device_emulation: boolean;
	page_timeout_ms: number;
	selector_timeout_ms: number;
	wait_for_timeout: number;
	elements_to_hide: string[];
	wait_for_selector?: string;
}

export interface CapturedBreakpoint {
	name: "desktop" | "tablet" | "mobile";
	width: number;
	path: string;
	result: ScreenshotResult;
}

export interface CaptureAllResult {
	breakpoints: CapturedBreakpoint[];
	sessionDir: string;
}

const NAMES: Array<CapturedBreakpoint["name"]> = [
	"desktop",
	"tablet",
	"mobile",
];

export async function captureAll(opts: CaptureOpts): Promise<CaptureAllResult> {
	if (!Array.isArray(opts.widths) || opts.widths.length !== 3) {
		throw new Error(
			"widths must contain exactly three values: [desktop, tablet, mobile]",
		);
	}

	const sessionDir = join(tmpdir(), `mockup-${Date.now()}-${process.pid}`);
	await mkdir(sessionDir, { recursive: true });
	const breakpoints: CapturedBreakpoint[] = [];

	for (let i = 0; i < 3; i++) {
		const name = NAMES[i];
		const width = opts.widths[i];
		const outputPath = join(sessionDir, `${name}.png`);
		const result = await takeScreenshot({
			url: opts.url,
			output_path: outputPath,
			viewport_width: width,
			viewport_height: Math.round((width * 9) / 16),
			device_scale_factor: 1,
			full_page: true,
			wait_for_selector: opts.wait_for_selector,
			wait_for_timeout: opts.wait_for_timeout,
			elements_to_hide: opts.elements_to_hide,
		});
		breakpoints.push({ name, width, path: outputPath, result });
	}

	return { breakpoints, sessionDir };
}
