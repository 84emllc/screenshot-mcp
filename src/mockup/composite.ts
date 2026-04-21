// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import sharp from "sharp";

interface FramedPaths {
	desktop: string;
	tablet: string;
	mobile: string;
}

const GAP = 60;
const PADDING = 80;

function parseBackground(bg: string): {
	r: number;
	g: number;
	b: number;
	alpha: number;
} {
	if (bg === "transparent") return { r: 0, g: 0, b: 0, alpha: 0 };
	const m = /^#([0-9a-f]{6})$/i.exec(bg);
	if (!m)
		throw new Error(
			`Invalid background color: ${bg} (expected "transparent" or "#rrggbb")`,
		);
	const n = parseInt(m[1], 16);
	return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff, alpha: 1 };
}

export async function stitch(
	paths: FramedPaths,
	background: string,
): Promise<Buffer> {
	const order = [paths.desktop, paths.tablet, paths.mobile];
	const metas = await Promise.all(
		order.map(async (p) => ({ path: p, meta: await sharp(p).metadata() })),
	);

	for (const { path, meta } of metas) {
		if (!meta.width || !meta.height) {
			throw new Error(`Cannot read dimensions of ${path}`);
		}
	}

	const widths = metas.map((m) => m.meta.width!);
	const heights = metas.map((m) => m.meta.height!);
	const totalWidth = widths.reduce((a, b) => a + b, 0) + GAP * 2 + PADDING * 2;
	const maxHeight = Math.max(...heights);
	const totalHeight = maxHeight + PADDING * 2;
	const bg = parseBackground(background);

	let cursorLeft = PADDING;
	const composites = metas.map(({ path, meta }) => {
		const left = cursorLeft;
		const top = PADDING + Math.round((maxHeight - meta.height!) / 2);
		cursorLeft += meta.width! + GAP;
		return { input: path, left, top };
	});

	return sharp({
		create: {
			width: totalWidth,
			height: totalHeight,
			channels: 4,
			background: bg,
		},
	})
		.composite(composites)
		.png()
		.toBuffer();
}
