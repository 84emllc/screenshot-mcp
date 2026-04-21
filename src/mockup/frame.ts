// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import sharp from "sharp";
import type { FitMode, FrameDef } from "../types.js";

export async function frameImage(
	screenshotPath: string,
	frame: FrameDef,
	fit: FitMode,
): Promise<Buffer> {
	const sharpFit = fit === "top-crop" ? "cover" : "contain";

	const screenshotResized = await sharp(screenshotPath)
		.resize(frame.screen.width, frame.screen.height, {
			fit: sharpFit,
			position: "top",
			background: { r: 0, g: 0, b: 0, alpha: 0 },
		})
		.png()
		.toBuffer();

	const blank = await sharp({
		create: {
			width: frame.canvas.width,
			height: frame.canvas.height,
			channels: 4,
			background: { r: 0, g: 0, b: 0, alpha: 0 },
		},
	})
		.png()
		.toBuffer();

	return sharp(blank)
		.composite([
			{ input: screenshotResized, left: frame.screen.x, top: frame.screen.y },
			{ input: frame.image, left: 0, top: 0 },
		])
		.png()
		.toBuffer();
}
