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

const defaultImpl = async (params: {
	output_path: string;
	viewport_width?: number;
}) => ({
	file_path: params.output_path,
	width: params.viewport_width ?? 1200,
	height: -1,
	file_size_bytes: 1234,
	format: "png",
});

beforeEach(() => {
	(
		takeScreenshot as unknown as {
			mockReset: () => void;
			mockImplementation: (fn: unknown) => void;
		}
	).mockReset();
	(
		takeScreenshot as unknown as {
			mockImplementation: (fn: unknown) => void;
		}
	).mockImplementation(defaultImpl);
});

describe("captureAll", () => {
	it("captures the default two breakpoints (desktop, mobile) with the configured widths", async () => {
		const result = await captureAll({
			url: "https://example.com",
			breakpoints: ["desktop", "mobile"],
			widths: [1440, 375],
			use_device_emulation: false,
			page_timeout_ms: 30000,
			selector_timeout_ms: 10000,
			wait_for_timeout: 300,
			elements_to_hide: [],
		});

		expect(takeScreenshot).toHaveBeenCalledTimes(2);
		expect(result.breakpoints).toHaveLength(2);
		const calls = (
			takeScreenshot as unknown as { mock: { calls: unknown[][] } }
		).mock.calls;
		expect((calls[0][0] as { viewport_width: number }).viewport_width).toBe(
			1440,
		);
		expect((calls[1][0] as { viewport_width: number }).viewport_width).toBe(
			375,
		);
		for (const call of calls) {
			expect((call[0] as { full_page: boolean }).full_page).toBe(true);
		}
	});

	it("captures three breakpoints when tablet is included", async () => {
		const result = await captureAll({
			url: "https://example.com",
			breakpoints: ["desktop", "tablet", "mobile"],
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
	});

	it("retries with domcontentloaded after a PAGE_LOAD_TIMEOUT error", async () => {
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
				if (calls === 1)
					throw new Error("PAGE_LOAD_TIMEOUT: Timeout 30000ms exceeded");
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
			breakpoints: ["desktop", "tablet", "mobile"],
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

	it("does not retry on a SELECTOR_TIMEOUT error", async () => {
		let calls = 0;
		(
			takeScreenshot as unknown as { mockImplementation: (fn: unknown) => void }
		).mockImplementation(async () => {
			calls++;
			throw new Error("SELECTOR_TIMEOUT: Timeout 10000ms exceeded");
		});
		await expect(
			captureAll({
				url: "https://example.com",
				breakpoints: ["desktop", "tablet", "mobile"],
				widths: [1440, 768, 375],
				use_device_emulation: false,
				page_timeout_ms: 30000,
				selector_timeout_ms: 10000,
				wait_for_timeout: 300,
				elements_to_hide: [],
			}),
		).rejects.toThrow(/SELECTOR_TIMEOUT/);
		expect(calls).toBe(1);
	});

	it("does not retry when retry_on_timeout is false", async () => {
		let calls = 0;
		(
			takeScreenshot as unknown as { mockImplementation: (fn: unknown) => void }
		).mockImplementation(async () => {
			calls++;
			throw new Error("PAGE_LOAD_TIMEOUT: Timeout 30000ms exceeded");
		});
		await expect(
			captureAll({
				url: "https://example.com",
				breakpoints: ["desktop", "tablet", "mobile"],
				widths: [1440, 768, 375],
				use_device_emulation: false,
				page_timeout_ms: 30000,
				selector_timeout_ms: 10000,
				wait_for_timeout: 300,
				elements_to_hide: [],
				retry_on_timeout: false,
			}),
		).rejects.toThrow(/PAGE_LOAD_TIMEOUT/);
		expect(calls).toBe(1);
	});

	it("translates use_device_emulation into device_name only for the requested breakpoints", async () => {
		await captureAll({
			url: "https://example.com",
			breakpoints: ["desktop", "tablet", "mobile"],
			widths: [1440, 768, 375],
			use_device_emulation: true,
			page_timeout_ms: 30000,
			selector_timeout_ms: 10000,
			wait_for_timeout: 300,
			elements_to_hide: [],
		});
		const calls = (
			takeScreenshot as unknown as { mock: { calls: unknown[][] } }
		).mock.calls;
		expect(
			(calls[0][0] as { device_name?: string }).device_name,
		).toBeUndefined();
		expect((calls[1][0] as { device_name?: string }).device_name).toBe(
			"iPad Pro 11",
		);
		expect((calls[2][0] as { device_name?: string }).device_name).toBe(
			"iPhone 13",
		);
	});

	it("omits the tablet device_name entirely when tablet is not in breakpoints", async () => {
		await captureAll({
			url: "https://example.com",
			breakpoints: ["desktop", "mobile"],
			widths: [1440, 375],
			use_device_emulation: true,
			page_timeout_ms: 30000,
			selector_timeout_ms: 10000,
			wait_for_timeout: 300,
			elements_to_hide: [],
		});
		const calls = (
			takeScreenshot as unknown as { mock: { calls: unknown[][] } }
		).mock.calls;
		expect(calls.length).toBe(2);
		expect(
			(calls[0][0] as { device_name?: string }).device_name,
		).toBeUndefined();
		expect((calls[1][0] as { device_name?: string }).device_name).toBe(
			"iPhone 13",
		);
	});

	it("retries the breakpoint once when the browser crashes", async () => {
		let calls = 0;
		(
			takeScreenshot as unknown as { mockImplementation: (fn: unknown) => void }
		).mockImplementation(
			async (params: { output_path: string; viewport_width?: number }) => {
				calls++;
				if (calls === 1) throw new Error("Target closed");
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
			breakpoints: ["desktop", "tablet", "mobile"],
			widths: [1440, 768, 375],
			use_device_emulation: false,
			page_timeout_ms: 30000,
			selector_timeout_ms: 10000,
			wait_for_timeout: 300,
			elements_to_hide: [],
		});
		expect(out.breakpoints).toHaveLength(3);
		expect(calls).toBe(4);
	});

	it("rejects when widths length does not match breakpoints length", async () => {
		await expect(
			captureAll({
				url: "https://example.com",
				breakpoints: ["desktop", "tablet", "mobile"],
				widths: [1440, 768],
				use_device_emulation: false,
				page_timeout_ms: 30000,
				selector_timeout_ms: 10000,
				wait_for_timeout: 300,
				elements_to_hide: [],
			}),
		).rejects.toThrow(/widths length .* must match breakpoints length/i);
	});

	it("rejects an empty breakpoints array", async () => {
		await expect(
			captureAll({
				url: "https://example.com",
				breakpoints: [],
				widths: [],
				use_device_emulation: false,
				page_timeout_ms: 30000,
				selector_timeout_ms: 10000,
				wait_for_timeout: 300,
				elements_to_hide: [],
			}),
		).rejects.toThrow(/breakpoints/i);
	});
});
