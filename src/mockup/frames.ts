// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FrameDef, FrameSet } from "../types.js";

const DEFAULT_DIR = join(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	"..",
	"assets",
	"frames",
);

interface ManifestFile {
	[setName: string]: {
		desktop: FrameDef;
		tablet: FrameDef;
		mobile: FrameDef;
	};
}

function validateFrame(name: string, frame: FrameDef): void {
	if (!frame || typeof frame !== "object") {
		throw new Error(`Frame "${name}" is missing or not an object`);
	}
	for (const key of ["image", "canvas", "screen"] as const) {
		if (!(key in frame)) {
			throw new Error(`Frame "${name}" is missing required field "${key}"`);
		}
	}
	const { canvas, screen } = frame;
	if (
		screen.x < 0 ||
		screen.y < 0 ||
		screen.x + screen.width > canvas.width ||
		screen.y + screen.height > canvas.height
	) {
		throw new Error(`Frame "${name}" screen rectangle exceeds canvas bounds`);
	}
}

export async function loadFrames(
	setName: string,
	dir: string = DEFAULT_DIR,
): Promise<FrameSet> {
	const manifestPath = join(dir, "frames.json");
	let raw: string;
	try {
		raw = await readFile(manifestPath, "utf8");
	} catch (err) {
		throw new Error(
			`Cannot read frames manifest at ${manifestPath}: ${(err as Error).message}`,
		);
	}
	let manifest: ManifestFile;
	try {
		manifest = JSON.parse(raw) as ManifestFile;
	} catch (err) {
		throw new Error(
			`Invalid JSON in ${manifestPath}: ${(err as Error).message}`,
		);
	}
	const set = manifest[setName];
	if (!set) {
		throw new Error(`Frame set "${setName}" not found in ${manifestPath}`);
	}
	for (const name of ["desktop", "tablet", "mobile"] as const) {
		validateFrame(name, set[name]);
		const imagePath = join(dir, set[name].image);
		try {
			await access(imagePath);
		} catch {
			throw new Error(
				`Frame image not found: ${set[name].image} (resolved to ${imagePath})`,
			);
		}
		set[name] = { ...set[name], image: imagePath };
	}
	return set;
}
