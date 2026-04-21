// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { describe, expect, it } from "vitest";
import { parseArgs } from "../../src/cli/mockup.js";

describe("CLI parseArgs", () => {
	it("parses required and default options", () => {
		const opts = parseArgs(["https://example.com", "--out", "/tmp/x"]);
		expect(opts.url).toBe("https://example.com");
		expect(opts.output_dir).toBe("/tmp/x");
		expect(opts.composite).toBeUndefined();
		expect(opts.breakpoints).toBeUndefined();
		expect(opts.widths).toBeUndefined();
	});

	it("parses widths and fit and background and composite flag", () => {
		const opts = parseArgs([
			"https://example.com",
			"--out",
			"/tmp/x",
			"--widths",
			"1920,800,400",
			"--fit",
			"full",
			"--background",
			"#ffffff",
			"--composite",
			"--hide",
			".foo,.bar",
		]);
		expect(opts.widths).toEqual([1920, 800, 400]);
		expect(opts.fit_mode).toBe("full");
		expect(opts.background).toBe("#ffffff");
		expect(opts.composite).toBe(true);
		expect(opts.elements_to_hide).toEqual([".foo", ".bar"]);
	});

	it("parses variable-length --widths without --breakpoints (length checked downstream)", () => {
		const opts = parseArgs([
			"https://example.com",
			"--out",
			"/tmp/x",
			"--widths",
			"1920,400",
		]);
		expect(opts.widths).toEqual([1920, 400]);
	});

	it("parses --breakpoints", () => {
		const opts = parseArgs([
			"https://example.com",
			"--out",
			"/tmp",
			"--breakpoints",
			"desktop,mobile",
		]);
		expect(opts.breakpoints).toEqual(["desktop", "mobile"]);
	});

	it("rejects --breakpoints with an unknown name", () => {
		expect(() =>
			parseArgs(["url", "--out", "/tmp", "--breakpoints", "desktop,foo"]),
		).toThrow(/unknown name/i);
	});

	it("rejects --breakpoints with duplicates", () => {
		expect(() =>
			parseArgs(["url", "--out", "/tmp", "--breakpoints", "desktop,desktop"]),
		).toThrow(/duplicate/i);
	});

	it("throws on missing --out", () => {
		expect(() => parseArgs(["https://example.com"])).toThrow(/--out/);
	});

	it("throws on missing url", () => {
		expect(() => parseArgs(["--out", "/tmp/x"])).toThrow(/url/i);
	});

	it("rejects non-numeric --wait-ms", () => {
		expect(() =>
			parseArgs(["url", "--out", "/tmp", "--wait-ms", "abc"]),
		).toThrow(/--wait-ms/);
	});

	it("rejects non-numeric --page-timeout", () => {
		expect(() =>
			parseArgs(["url", "--out", "/tmp", "--page-timeout", "abc"]),
		).toThrow(/--page-timeout/);
	});

	it("rejects non-numeric --selector-timeout", () => {
		expect(() =>
			parseArgs(["url", "--out", "/tmp", "--selector-timeout", "abc"]),
		).toThrow(/--selector-timeout/);
	});

	it("parses --page-timeout, --selector-timeout, and --no-retry", () => {
		const opts = parseArgs([
			"https://example.com",
			"--out",
			"/tmp/x",
			"--page-timeout",
			"45000",
			"--selector-timeout",
			"5000",
			"--no-retry",
		]);
		expect(opts.page_timeout_ms).toBe(45000);
		expect(opts.selector_timeout_ms).toBe(5000);
		expect(opts.retry_on_timeout).toBe(false);
	});
});
