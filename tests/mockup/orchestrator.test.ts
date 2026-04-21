// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { describe, expect, it } from "vitest";
import { run } from "../../src/mockup/index.js";
import type { BreakpointName } from "../../src/types.js";

describe("run (input validation)", () => {
	it("rejects when widths length does not match breakpoints length", async () => {
		await expect(
			run({
				url: "https://example.com",
				output_dir: "/tmp/out-mockup-orch-test",
				widths: [1440],
			}),
		).rejects.toThrow(/widths length .* must match breakpoints length/i);
	});

	it("rejects when output_dir cannot be created", async () => {
		await expect(
			run({
				url: "https://example.com",
				output_dir: "/proc/cannot-create-here",
			}),
		).rejects.toThrow();
	});

	it("rejects an invalid URL before launching the browser", async () => {
		await expect(
			run({ url: "not a url", output_dir: "/tmp/out-mockup-orch-test" }),
		).rejects.toThrow(/url/i);
	});

	it("rejects an empty breakpoints array", async () => {
		await expect(
			run({
				url: "https://example.com",
				output_dir: "/tmp/out-mockup-orch-test",
				breakpoints: [],
			}),
		).rejects.toThrow(/breakpoints/i);
	});

	it("rejects an unknown breakpoint name", async () => {
		await expect(
			run({
				url: "https://example.com",
				output_dir: "/tmp/out-mockup-orch-test",
				breakpoints: ["desktop", "phone" as BreakpointName],
			}),
		).rejects.toThrow(/unknown breakpoint/i);
	});

	it("rejects duplicate breakpoint names", async () => {
		await expect(
			run({
				url: "https://example.com",
				output_dir: "/tmp/out-mockup-orch-test",
				breakpoints: ["desktop", "desktop"],
			}),
		).rejects.toThrow(/duplicate/i);
	});
});
