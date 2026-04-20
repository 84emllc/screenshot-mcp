// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { mkdir, readFile, rm, stat } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { run } from "../../src/mockup/index.js";
import { closeBrowser } from "../../src/screenshot.js";

let server: Server;
let port: number;
let outDir: string;

beforeAll(async () => {
	const html = await readFile(
		join(process.cwd(), "tests/fixtures/index.html"),
		"utf8",
	);
	server = createServer((_req, res) => {
		res.writeHead(200, { "content-type": "text/html" });
		res.end(html);
	});
	await new Promise<void>((resolve) =>
		server.listen(0, "127.0.0.1", () => resolve()),
	);
	port = (server.address() as { port: number }).port;
	outDir = join(tmpdir(), `mockup-int-${Date.now()}`);
	await mkdir(outDir, { recursive: true });
});

afterAll(async () => {
	await new Promise<void>((resolve) => server.close(() => resolve()));
	await closeBrowser();
	await rm(outDir, { recursive: true, force: true });
});

describe("responsive mockup end-to-end", () => {
	it("produces three framed PNGs and a composite at expected dimensions", async () => {
		const result = await run({
			url: `http://127.0.0.1:${port}/`,
			output_dir: outDir,
			filename_prefix: "fixture",
			composite: true,
			background: "#ffffff",
		});

		expect(result.files.desktop).toMatch(/fixture-desktop\.png$/);
		expect(result.files.tablet).toMatch(/fixture-tablet\.png$/);
		expect(result.files.mobile).toMatch(/fixture-mobile\.png$/);
		expect(result.files.composite).toMatch(/fixture-composite\.png$/);

		for (const f of [
			result.files.desktop,
			result.files.tablet,
			result.files.mobile,
			result.files.composite as string,
		]) {
			const s = await stat(f);
			expect(s.size).toBeGreaterThan(0);
		}

		expect(result.breakpoints[0].framed_dimensions).toEqual([1480, 920]);
		expect(result.breakpoints[1].framed_dimensions).toEqual([720, 1000]);
		expect(result.breakpoints[2].framed_dimensions).toEqual([360, 720]);
	}, 60000);
});
