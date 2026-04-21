// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { takeScreenshot } from "../screenshot.js";
import type { BreakpointName, ScreenshotResult } from "../types.js";

export interface CaptureOpts {
	url: string;
	breakpoints: BreakpointName[];
	widths: number[];
	use_device_emulation: boolean;
	page_timeout_ms: number;
	selector_timeout_ms: number;
	wait_for_timeout: number;
	elements_to_hide: string[];
	wait_for_selector?: string;
	retry_on_timeout?: boolean;
}

export interface CapturedBreakpoint {
	name: BreakpointName;
	width: number;
	path: string;
	result: ScreenshotResult;
}

export interface CaptureAllResult {
	breakpoints: CapturedBreakpoint[];
	sessionDir: string;
}

const DEVICE_NAMES: Record<BreakpointName, string | undefined> = {
	desktop: undefined,
	tablet: "iPad Pro 11",
	mobile: "iPhone 13",
};

export async function captureAll(opts: CaptureOpts): Promise<CaptureAllResult> {
	if (!Array.isArray(opts.breakpoints) || opts.breakpoints.length === 0) {
		throw new Error("breakpoints must be a non-empty array");
	}
	if (!Array.isArray(opts.widths) || opts.widths.length === 0) {
		throw new Error("widths must be a non-empty array");
	}
	if (opts.breakpoints.length !== opts.widths.length) {
		throw new Error(
			`widths length (${opts.widths.length}) must match breakpoints length (${opts.breakpoints.length})`,
		);
	}

	const sessionDir = join(tmpdir(), `mockup-${Date.now()}-${process.pid}`);
	await mkdir(sessionDir, { recursive: true });
	const breakpoints: CapturedBreakpoint[] = [];

	for (let i = 0; i < opts.breakpoints.length; i++) {
		const name = opts.breakpoints[i];
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
		const captureOne = async (): Promise<ScreenshotResult> => {
			try {
				return await takeScreenshot(baseParams);
			} catch (err) {
				const message = (err as Error).message;
				if (
					opts.retry_on_timeout !== false &&
					message.startsWith("PAGE_LOAD_TIMEOUT:")
				) {
					return await takeScreenshot({
						...baseParams,
						wait_until: "domcontentloaded",
					});
				}
				throw err;
			}
		};

		let result: ScreenshotResult;
		try {
			result = await captureOne();
		} catch (err) {
			const message = (err as Error).message;
			if (
				/target closed|browser (?:has been )?closed|browserContext\.newPage/i.test(
					message,
				)
			) {
				result = await captureOne();
			} else {
				throw err;
			}
		}
		breakpoints.push({ name, width, path: outputPath, result });
	}

	return { breakpoints, sessionDir };
}
