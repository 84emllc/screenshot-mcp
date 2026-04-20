// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { describe, expect, it } from "vitest";
import { run } from "../../src/mockup/index.js";

describe("run (input validation)", () => {
	it("rejects when widths is not exactly length 3", async () => {
		await expect(
			run({
				url: "https://example.com",
				output_dir: "/tmp/out-mockup-orch-test",
				widths: [1440] as unknown as [number, number, number],
			}),
		).rejects.toThrow(/exactly three/i);
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
});
