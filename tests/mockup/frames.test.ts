// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadFrames } from "../../src/mockup/frames.js";

const tmp = join(tmpdir(), `frames-test-${Date.now()}`);

beforeAll(async () => {
	await mkdir(tmp, { recursive: true });
	const onePxPng = Buffer.from(
		"89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63000100000005000100" +
			"0d0a2db40000000049454e44ae426082",
		"hex",
	);
	for (const name of ["desktop.png", "tablet.png", "mobile.png"]) {
		await writeFile(join(tmp, name), onePxPng);
	}
	await writeFile(
		join(tmp, "frames.json"),
		JSON.stringify({
			default: {
				desktop: {
					image: "desktop.png",
					canvas: { width: 1480, height: 920 },
					screen: { x: 40, y: 40, width: 1400, height: 800 },
				},
				tablet: {
					image: "tablet.png",
					canvas: { width: 720, height: 1000 },
					screen: { x: 36, y: 80, width: 648, height: 840 },
				},
				mobile: {
					image: "mobile.png",
					canvas: { width: 360, height: 720 },
					screen: { x: 20, y: 70, width: 320, height: 580 },
				},
			},
		}),
	);
});

afterAll(async () => {
	await rm(tmp, { recursive: true, force: true });
});

describe("loadFrames", () => {
	it("loads the default set from a directory and resolves image paths", async () => {
		const set = await loadFrames("default", tmp);
		expect(set.desktop.canvas.width).toBe(1480);
		expect(set.desktop.image).toBe(join(tmp, "desktop.png"));
		expect(set.mobile.screen.width).toBe(320);
	});

	it("throws if the requested set is missing", async () => {
		await expect(loadFrames("does-not-exist", tmp)).rejects.toThrow(
			/frame set/i,
		);
	});

	it("throws if a frame PNG is missing", async () => {
		const broken = join(tmp, "broken");
		await mkdir(broken, { recursive: true });
		await writeFile(
			join(broken, "frames.json"),
			JSON.stringify({
				default: {
					desktop: {
						image: "missing.png",
						canvas: { width: 10, height: 10 },
						screen: { x: 0, y: 0, width: 5, height: 5 },
					},
					tablet: {
						image: "missing.png",
						canvas: { width: 10, height: 10 },
						screen: { x: 0, y: 0, width: 5, height: 5 },
					},
					mobile: {
						image: "missing.png",
						canvas: { width: 10, height: 10 },
						screen: { x: 0, y: 0, width: 5, height: 5 },
					},
				},
			}),
		);
		await expect(loadFrames("default", broken)).rejects.toThrow(/missing\.png/);
	});

	it("throws if a screen dimension is zero or negative", async () => {
		const broken = join(tmp, "zero-dim");
		await mkdir(broken, { recursive: true });
		await writeFile(join(broken, "frame.png"), Buffer.alloc(0));
		await writeFile(
			join(broken, "frames.json"),
			JSON.stringify({
				default: {
					desktop: {
						image: "frame.png",
						canvas: { width: 100, height: 100 },
						screen: { x: 0, y: 0, width: 0, height: 50 },
					},
					tablet: {
						image: "frame.png",
						canvas: { width: 100, height: 100 },
						screen: { x: 0, y: 0, width: 50, height: 50 },
					},
					mobile: {
						image: "frame.png",
						canvas: { width: 100, height: 100 },
						screen: { x: 0, y: 0, width: 50, height: 50 },
					},
				},
			}),
		);
		await expect(loadFrames("default", broken)).rejects.toThrow(
			/screen dimensions must be positive/,
		);
	});

	it("throws if screen extends beyond canvas", async () => {
		const broken = join(tmp, "oob");
		await mkdir(broken, { recursive: true });
		await writeFile(join(broken, "frame.png"), Buffer.alloc(0));
		await writeFile(
			join(broken, "frames.json"),
			JSON.stringify({
				default: {
					desktop: {
						image: "frame.png",
						canvas: { width: 100, height: 100 },
						screen: { x: 50, y: 50, width: 100, height: 100 },
					},
					tablet: {
						image: "frame.png",
						canvas: { width: 100, height: 100 },
						screen: { x: 0, y: 0, width: 50, height: 50 },
					},
					mobile: {
						image: "frame.png",
						canvas: { width: 100, height: 100 },
						screen: { x: 0, y: 0, width: 50, height: 50 },
					},
				},
			}),
		);
		await expect(loadFrames("default", broken)).rejects.toThrow(
			/screen.*exceeds/i,
		);
	});
});
