// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import sharp from "sharp";
import type { FitMode, FrameDef } from "../types.js";

export async function frameImage(
	screenshotPath: string,
	frame: FrameDef,
	fit: FitMode,
	scale = 1,
): Promise<Buffer> {
	const sharpFit = fit === "top-crop" ? "cover" : "contain";

	// Scale the frame geometry by the pixel-density factor so a screenshot
	// captured at that DPR composites at full resolution.
	const canvasW = Math.round(frame.canvas.width * scale);
	const canvasH = Math.round(frame.canvas.height * scale);
	const screenW = Math.round(frame.screen.width * scale);
	const screenH = Math.round(frame.screen.height * scale);
	const screenX = Math.round(frame.screen.x * scale);
	const screenY = Math.round(frame.screen.y * scale);

	const screenshotResized = await sharp(screenshotPath)
		.resize(screenW, screenH, {
			fit: sharpFit,
			position: "top",
			background: { r: 0, g: 0, b: 0, alpha: 0 },
		})
		.png()
		.toBuffer();

	// At scale 1 the frame image is used as-is (a path); above that it is
	// upscaled to the scaled canvas so the frame chrome stays sharp.
	const frameInput: string | Buffer =
		scale === 1
			? frame.image
			: await sharp(frame.image)
					.resize(canvasW, canvasH, { kernel: "lanczos3" })
					.png()
					.toBuffer();

	const blank = await sharp({
		create: {
			width: canvasW,
			height: canvasH,
			channels: 4,
			background: { r: 0, g: 0, b: 0, alpha: 0 },
		},
	})
		.png()
		.toBuffer();

	return sharp(blank)
		.composite([
			{ input: screenshotResized, left: screenX, top: screenY },
			{ input: frameInput, left: 0, top: 0 },
		])
		.png()
		.toBuffer();
}
