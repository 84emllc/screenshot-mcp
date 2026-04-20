// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.
// One-shot generator for placeholder device frame PNGs.

import sharp from "sharp";
import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "frames");

async function generateFrame({ canvasW, canvasH, screenX, screenY, screenW, screenH, bezelColor, outFile }) {
	const radiusOuter = 18;
	const radiusInner = 6;
	const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}">
  <defs>
    <mask id="m">
      <rect width="${canvasW}" height="${canvasH}" fill="white"/>
      <rect x="${screenX}" y="${screenY}" width="${screenW}" height="${screenH}" rx="${radiusInner}" ry="${radiusInner}" fill="black"/>
    </mask>
  </defs>
  <rect x="0" y="0" width="${canvasW}" height="${canvasH}" rx="${radiusOuter}" ry="${radiusOuter}" fill="${bezelColor}" mask="url(#m)"/>
</svg>
`;
	const buf = await sharp(Buffer.from(svg)).png().toBuffer();
	await writeFile(outFile, buf);
}

async function main() {
	await mkdir(ROOT, { recursive: true });

	await generateFrame({
		canvasW: 1480, canvasH: 920,
		screenX: 40, screenY: 40, screenW: 1400, screenH: 800,
		bezelColor: "#1f1f1f",
		outFile: join(ROOT, "desktop.png"),
	});
	await generateFrame({
		canvasW: 720, canvasH: 1000,
		screenX: 36, screenY: 80, screenW: 648, screenH: 840,
		bezelColor: "#2a2a2a",
		outFile: join(ROOT, "tablet.png"),
	});
	await generateFrame({
		canvasW: 360, canvasH: 720,
		screenX: 20, screenY: 70, screenW: 320, screenH: 580,
		bezelColor: "#111111",
		outFile: join(ROOT, "mobile.png"),
	});

	await writeFile(
		join(ROOT, "frames.json"),
		JSON.stringify(
			{
				default: {
					desktop: { image: "desktop.png", canvas: { width: 1480, height: 920 }, screen: { x: 40, y: 40, width: 1400, height: 800 } },
					tablet:  { image: "tablet.png",  canvas: { width: 720,  height: 1000 }, screen: { x: 36, y: 80, width: 648, height: 840 } },
					mobile:  { image: "mobile.png",  canvas: { width: 360,  height: 720 },  screen: { x: 20, y: 70, width: 320, height: 580 } },
				},
			},
			null,
			2,
		) + "\n",
	);

	console.log("Frames generated in", ROOT);
}

main().catch((err) => { console.error(err); process.exit(1); });
