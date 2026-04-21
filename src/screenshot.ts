// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { mkdir, stat } from "node:fs/promises";
import { dirname } from "node:path";
import {
	type Browser,
	type BrowserContext,
	chromium,
	devices,
} from "playwright";
import type { ScreenshotParams, ScreenshotResult } from "./types.js";

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
	if (!browser || !browser.isConnected()) {
		browser = await chromium.launch({ headless: true });
	}
	return browser;
}

export async function closeBrowser(): Promise<void> {
	if (browser?.isConnected()) {
		await browser.close();
		browser = null;
	}
}

export async function takeScreenshot(
	params: ScreenshotParams,
): Promise<ScreenshotResult> {
	const width = params.viewport_width ?? 1200;
	const height = params.viewport_height ?? 630;
	const scaleFactor = params.device_scale_factor ?? 1;
	const colorScheme = params.color_scheme ?? "no-preference";
	const elementsToHide = params.elements_to_hide ?? [];
	const waitTimeout = params.wait_for_timeout ?? 300;
	const fullPage = params.full_page ?? false;
	const pageTimeoutMs = params.page_timeout_ms ?? 30000;
	const selectorTimeoutMs = params.selector_timeout_ms ?? 10000;

	let deviceProfile: (typeof devices)[string] | undefined;
	if (params.device_name) {
		deviceProfile = devices[params.device_name];
		if (!deviceProfile) {
			throw new Error(`Unknown Playwright device: ${params.device_name}`);
		}
	}

	const b = await getBrowser();

	let context: BrowserContext | null = null;
	try {
		context = deviceProfile
			? await b.newContext({
					...deviceProfile,
					colorScheme,
				})
			: await b.newContext({
					viewport: { width, height },
					deviceScaleFactor: scaleFactor,
					colorScheme,
				});

		const page = await context.newPage();

		try {
			await page.goto(params.url, {
				waitUntil: params.wait_until ?? "networkidle",
				timeout: pageTimeoutMs,
			});
		} catch (err) {
			const e = err as Error;
			if (e.name === "TimeoutError") {
				throw new Error(`PAGE_LOAD_TIMEOUT: ${e.message}`);
			}
			throw err;
		}

		// Wait for fonts to finish loading
		await page.evaluate(() => document.fonts.ready);

		// Wait for a specific selector if requested
		if (params.wait_for_selector) {
			try {
				await page.waitForSelector(params.wait_for_selector, {
					timeout: selectorTimeoutMs,
				});
			} catch (err) {
				const e = err as Error;
				if (e.name === "TimeoutError") {
					throw new Error(`SELECTOR_TIMEOUT: ${e.message}`);
				}
				throw err;
			}
		}

		// Hide elements
		if (elementsToHide.length > 0) {
			await page.evaluate((selectors: string[]) => {
				for (const sel of selectors) {
					const els = document.querySelectorAll(sel);
					for (const el of els) {
						(el as HTMLElement).style.display = "none";
					}
				}
			}, elementsToHide);
		}

		// Extra wait for final paint
		if (waitTimeout > 0) {
			await page.waitForTimeout(waitTimeout);
		}

		// Ensure output directory exists
		await mkdir(dirname(params.output_path), { recursive: true });

		await page.screenshot({
			path: params.output_path,
			type: "png",
			fullPage,
			omitBackground: false,
		});

		await page.close();

		const fileStat = await stat(params.output_path);

		const reportedWidth = deviceProfile?.viewport?.width ?? width;
		const reportedHeight = deviceProfile?.viewport?.height ?? height;
		const reportedScale = deviceProfile?.deviceScaleFactor ?? scaleFactor;

		return {
			file_path: params.output_path,
			width: fullPage ? reportedWidth : reportedWidth * reportedScale,
			height: fullPage ? -1 : reportedHeight * reportedScale,
			file_size_bytes: fileStat.size,
			format: "png",
		};
	} finally {
		if (context) {
			await context.close();
		}
	}
}
