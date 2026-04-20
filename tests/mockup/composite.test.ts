// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { stitch } from "../../src/mockup/composite.js";

const tmp = join(tmpdir(), `composite-test-${Date.now()}`);

async function makeSolidPng(
	path: string,
	width: number,
	height: number,
	rgba: [number, number, number, number],
) {
	await sharp({
		create: {
			width,
			height,
			channels: 4,
			background: { r: rgba[0], g: rgba[1], b: rgba[2], alpha: rgba[3] / 255 },
		},
	})
		.png()
		.toFile(path);
}

beforeAll(async () => {
	await mkdir(tmp, { recursive: true });
	await makeSolidPng(join(tmp, "d.png"), 400, 300, [255, 0, 0, 255]);
	await makeSolidPng(join(tmp, "t.png"), 200, 250, [0, 255, 0, 255]);
	await makeSolidPng(join(tmp, "m.png"), 100, 200, [0, 0, 255, 255]);
});

afterAll(async () => {
	await rm(tmp, { recursive: true, force: true });
});

describe("stitch", () => {
	it("produces a horizontal canvas sized for inputs + gaps + padding, transparent by default", async () => {
		const out = await stitch(
			{
				desktop: join(tmp, "d.png"),
				tablet: join(tmp, "t.png"),
				mobile: join(tmp, "m.png"),
			},
			"transparent",
		);
		const meta = await sharp(out).metadata();
		expect(meta.width).toBe(980);
		expect(meta.height).toBe(460);
		expect(meta.channels).toBe(4);

		const { data, info } = await sharp(out)
			.raw()
			.toBuffer({ resolveWithObject: true });
		const i = (0 * info.width + 0) * info.channels;
		expect(data[i + 3]).toBe(0);
	});

	it("flattens onto a solid background when a hex color is given", async () => {
		const out = await stitch(
			{
				desktop: join(tmp, "d.png"),
				tablet: join(tmp, "t.png"),
				mobile: join(tmp, "m.png"),
			},
			"#ffffff",
		);
		const { data, info } = await sharp(out)
			.raw()
			.toBuffer({ resolveWithObject: true });
		const i = (0 * info.width + 0) * info.channels;
		expect(data[i]).toBe(255);
		expect(data[i + 1]).toBe(255);
		expect(data[i + 2]).toBe(255);
	});
});
