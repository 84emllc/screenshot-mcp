// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { frameImage } from "../../src/mockup/frame.js";
import type { FrameDef } from "../../src/types.js";

const tmp = join(tmpdir(), `frame-test-${Date.now()}`);

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
});

afterAll(async () => {
	await rm(tmp, { recursive: true, force: true });
});

describe("frameImage", () => {
	it("produces an image matching frame canvas dimensions with transparent surround and screenshot inside the screen rect", async () => {
		const screenshotPath = join(tmp, "shot.png");
		const framePath = join(tmp, "frame.png");
		await makeSolidPng(screenshotPath, 200, 1000, [255, 0, 0, 255]);
		const greenBorder = await sharp({
			create: {
				width: 100,
				height: 100,
				channels: 4,
				background: { r: 0, g: 255, b: 0, alpha: 1 },
			},
		})
			.composite([
				{
					input: await sharp({
						create: {
							width: 80,
							height: 80,
							channels: 4,
							background: { r: 0, g: 0, b: 0, alpha: 1 },
						},
					})
						.png()
						.toBuffer(),
					left: 10,
					top: 10,
					blend: "dest-out",
				},
			])
			.png()
			.toBuffer();
		await writeFile(framePath, greenBorder);

		const frame: FrameDef = {
			image: framePath,
			canvas: { width: 100, height: 100 },
			screen: { x: 10, y: 10, width: 80, height: 80 },
		};

		const out = await frameImage(screenshotPath, frame, "top-crop");
		const meta = await sharp(out).metadata();
		expect(meta.width).toBe(100);
		expect(meta.height).toBe(100);
		expect(meta.channels).toBe(4);

		const { data, info } = await sharp(out)
			.raw()
			.toBuffer({ resolveWithObject: true });
		const pxAt = (x: number, y: number) => {
			const i = (y * info.width + x) * info.channels;
			return [data[i], data[i + 1], data[i + 2], data[i + 3]];
		};
		expect(pxAt(0, 0)).toEqual([0, 255, 0, 255]);
		const center = pxAt(50, 50);
		expect(center[0]).toBeGreaterThan(200);
		expect(center[1]).toBeLessThan(50);
	});

	it("uses 'cover' fit for top-crop and 'contain' for full", async () => {
		const screenshotPath = join(tmp, "tall.png");
		const framePath = join(tmp, "tinyframe.png");
		await makeSolidPng(screenshotPath, 100, 1000, [0, 0, 255, 255]);
		await makeSolidPng(framePath, 100, 100, [0, 0, 0, 0]);

		const frame: FrameDef = {
			image: framePath,
			canvas: { width: 100, height: 100 },
			screen: { x: 0, y: 0, width: 100, height: 100 },
		};

		const cropped = await frameImage(screenshotPath, frame, "top-crop");
		const contained = await frameImage(screenshotPath, frame, "full");

		const cMeta = await sharp(cropped)
			.raw()
			.toBuffer({ resolveWithObject: true });
		const cPx = (x: number, y: number) => {
			const i = (y * cMeta.info.width + x) * cMeta.info.channels;
			return [
				cMeta.data[i],
				cMeta.data[i + 1],
				cMeta.data[i + 2],
				cMeta.data[i + 3],
			];
		};
		expect(cPx(50, 50)[2]).toBeGreaterThan(200);

		const ctMeta = await sharp(contained)
			.raw()
			.toBuffer({ resolveWithObject: true });
		const ctPx = (x: number, y: number) => {
			const i = (y * ctMeta.info.width + x) * ctMeta.info.channels;
			return [
				ctMeta.data[i],
				ctMeta.data[i + 1],
				ctMeta.data[i + 2],
				ctMeta.data[i + 3],
			];
		};
		expect(ctPx(50, 50)[2]).toBeGreaterThan(200);
		expect(ctPx(0, 0)[3]).toBe(0);
	});
});
