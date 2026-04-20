// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/screenshot.js", () => {
	return {
		takeScreenshot: vi.fn(async (params) => ({
			file_path: params.output_path,
			width: params.viewport_width ?? 1200,
			height: -1,
			file_size_bytes: 1234,
			format: "png",
		})),
		closeBrowser: vi.fn(async () => {}),
	};
});

import { captureAll } from "../../src/mockup/capture.js";
import { takeScreenshot } from "../../src/screenshot.js";

beforeEach(() => {
	(takeScreenshot as unknown as { mockClear: () => void }).mockClear();
});

describe("captureAll", () => {
	it("captures three breakpoints with the configured widths", async () => {
		const result = await captureAll({
			url: "https://example.com",
			widths: [1440, 768, 375],
			use_device_emulation: false,
			page_timeout_ms: 30000,
			selector_timeout_ms: 10000,
			wait_for_timeout: 300,
			elements_to_hide: [],
		});

		expect(takeScreenshot).toHaveBeenCalledTimes(3);
		expect(result.breakpoints).toHaveLength(3);
		const calls = (
			takeScreenshot as unknown as { mock: { calls: unknown[][] } }
		).mock.calls;
		expect((calls[0][0] as { viewport_width: number }).viewport_width).toBe(
			1440,
		);
		expect((calls[1][0] as { viewport_width: number }).viewport_width).toBe(
			768,
		);
		expect((calls[2][0] as { viewport_width: number }).viewport_width).toBe(
			375,
		);
		for (const call of calls) {
			expect((call[0] as { full_page: boolean }).full_page).toBe(true);
		}
	});

	it("retries with domcontentloaded after a timeout error", async () => {
		let calls = 0;
		(
			takeScreenshot as unknown as { mockImplementation: (fn: unknown) => void }
		).mockImplementation(
			async (params: {
				wait_until?: string;
				viewport_width?: number;
				output_path: string;
			}) => {
				calls++;
				if (calls === 1) throw new Error("Timeout 30000ms exceeded");
				return {
					file_path: params.output_path,
					width: params.viewport_width ?? 1200,
					height: -1,
					file_size_bytes: 1,
					format: "png",
				};
			},
		);
		const out = await captureAll({
			url: "https://example.com",
			widths: [1440, 768, 375],
			use_device_emulation: false,
			page_timeout_ms: 30000,
			selector_timeout_ms: 10000,
			wait_for_timeout: 300,
			elements_to_hide: [],
		});
		expect(out.breakpoints).toHaveLength(3);
		expect(
			(takeScreenshot as unknown as { mock: { calls: unknown[][] } }).mock.calls
				.length,
		).toBe(4);
	});

	it("rejects widths arrays that are not exactly length 3", async () => {
		await expect(
			captureAll({
				url: "https://example.com",
				widths: [1440, 768] as unknown as [number, number, number],
				use_device_emulation: false,
				page_timeout_ms: 30000,
				selector_timeout_ms: 10000,
				wait_for_timeout: 300,
				elements_to_hide: [],
			}),
		).rejects.toThrow(/exactly three/i);
	});
});
