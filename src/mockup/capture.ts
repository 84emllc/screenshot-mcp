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
	retry_on_timeout?: boolean;
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

const DEVICE_NAMES: Record<CapturedBreakpoint["name"], string | undefined> = {
	desktop: undefined,
	tablet: "iPad Pro 11",
	mobile: "iPhone 13",
};

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
		const deviceName = opts.use_device_emulation
			? DEVICE_NAMES[name]
			: undefined;
		const baseParams = {
			url: opts.url,
			output_path: outputPath,
			viewport_width: width,
			viewport_height: Math.round((width * 9) / 16),
			device_scale_factor: 1,
			full_page: true,
			wait_for_selector: opts.wait_for_selector,
			wait_for_timeout: opts.wait_for_timeout,
			elements_to_hide: opts.elements_to_hide,
			page_timeout_ms: opts.page_timeout_ms,
			selector_timeout_ms: opts.selector_timeout_ms,
			...(deviceName ? { device_name: deviceName } : {}),
		};
		let result: ScreenshotResult;
		try {
			result = await takeScreenshot(baseParams);
		} catch (err) {
			const message = (err as Error).message;
			if (
				opts.retry_on_timeout !== false &&
				message.startsWith("PAGE_LOAD_TIMEOUT:")
			) {
				result = await takeScreenshot({
					...baseParams,
					wait_until: "domcontentloaded",
				});
			} else {
				throw err;
			}
		}
		breakpoints.push({ name, width, path: outputPath, result });
	}

	return { breakpoints, sessionDir };
}
