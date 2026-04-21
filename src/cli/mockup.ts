#!/usr/bin/env node
// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { run } from "../mockup/index.js";
import type { BreakpointName, FitMode, MockupParams } from "../types.js";

const USAGE = `Usage: responsive-mockup <url> --out <dir> [options]

  --out <dir>                output directory (required)
  --prefix <str>             filename prefix (default: hostname slug)
  --breakpoints <a,b,c>      comma-separated breakpoint names (default: desktop,mobile)
                             allowed: desktop, tablet, mobile
  --widths <a,b,...>         comma-separated widths, paired by index with breakpoints
                             (default: per-breakpoint defaults; desktop=1440, tablet=768, mobile=375)
  --frame-set <name>         frame set (default: "default")
  --device-emulation         use Playwright device profiles
  --fit <mode>               top-crop | full (default: top-crop)
  --composite                also emit composite.png
  --background <color>       transparent | #rrggbb (default: transparent)
  --keep-raw                 keep raw screenshots in <out>/raw/
  --wait-for <selector>      wait for CSS selector before capture
  --wait-ms <n>              extra wait after load (default: 300)
  --page-timeout <ms>        page load timeout (default: 30000)
  --selector-timeout <ms>    wait_for_selector timeout (default: 10000)
  --no-retry                 disable goto-timeout retry
  --hide <sel,sel,...>       hide elements before capture
  --version, --help`;

const VERSION = "1.2.0";

const VALID_BREAKPOINTS: ReadonlySet<string> = new Set([
	"desktop",
	"tablet",
	"mobile",
]);

export function parseArgs(argv: string[]): MockupParams {
	const positional: string[] = [];
	const out: Partial<MockupParams> = {};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		const next = () => {
			const v = argv[++i];
			if (v === undefined) {
				throw new Error(`Missing value for ${a}`);
			}
			return v;
		};
		switch (a) {
			case "--out":
				out.output_dir = next();
				break;
			case "--prefix":
				out.filename_prefix = next();
				break;
			case "--breakpoints": {
				const parts = next()
					.split(",")
					.map((s) => s.trim());
				if (parts.length === 0 || parts.some((p) => p.length === 0)) {
					throw new Error(
						"--breakpoints must be a non-empty comma-separated list",
					);
				}
				if (parts.length > 3) {
					throw new Error(
						"--breakpoints accepts at most three values (desktop, tablet, mobile)",
					);
				}
				const seen = new Set<string>();
				for (const p of parts) {
					if (!VALID_BREAKPOINTS.has(p)) {
						throw new Error(
							`--breakpoints contains unknown name "${p}" (must be one of: desktop, tablet, mobile)`,
						);
					}
					if (seen.has(p)) {
						throw new Error(`--breakpoints contains duplicate "${p}"`);
					}
					seen.add(p);
				}
				out.breakpoints = parts as BreakpointName[];
				break;
			}
			case "--widths": {
				const parts = next()
					.split(",")
					.map((s) => parseInt(s, 10));
				if (parts.length === 0 || parts.some(Number.isNaN)) {
					throw new Error(
						"--widths must be a comma-separated list of integers (length must match --breakpoints)",
					);
				}
				if (parts.length > 3) {
					throw new Error(
						"--widths accepts at most three values (one per breakpoint)",
					);
				}
				out.widths = parts;
				break;
			}
			case "--frame-set":
				out.frame_set = next();
				break;
			case "--device-emulation":
				out.use_device_emulation = true;
				break;
			case "--fit": {
				const v = next();
				if (v !== "top-crop" && v !== "full") {
					throw new Error(`--fit must be top-crop or full, got "${v}"`);
				}
				out.fit_mode = v as FitMode;
				break;
			}
			case "--composite":
				out.composite = true;
				break;
			case "--background":
				out.background = next();
				break;
			case "--keep-raw":
				out.keep_raw = true;
				break;
			case "--wait-for":
				out.wait_for_selector = next();
				break;
			case "--wait-ms": {
				const raw = next();
				const v = parseInt(raw, 10);
				if (Number.isNaN(v) || v < 0) {
					throw new Error(
						`--wait-ms must be a non-negative integer, got "${raw}"`,
					);
				}
				out.wait_for_timeout = v;
				break;
			}
			case "--page-timeout": {
				const raw = next();
				const v = parseInt(raw, 10);
				if (Number.isNaN(v) || v < 0) {
					throw new Error(
						`--page-timeout must be a non-negative integer, got "${raw}"`,
					);
				}
				out.page_timeout_ms = v;
				break;
			}
			case "--selector-timeout": {
				const raw = next();
				const v = parseInt(raw, 10);
				if (Number.isNaN(v) || v < 0) {
					throw new Error(
						`--selector-timeout must be a non-negative integer, got "${raw}"`,
					);
				}
				out.selector_timeout_ms = v;
				break;
			}
			case "--no-retry":
				out.retry_on_timeout = false;
				break;
			case "--hide":
				out.elements_to_hide = next().split(",");
				break;
			default:
				if (a.startsWith("--")) {
					throw new Error(`Unknown flag: ${a}`);
				}
				positional.push(a);
		}
	}
	if (positional.length === 0) {
		throw new Error("Missing required positional argument: url");
	}
	if (positional.length > 1) {
		throw new Error(
			`Unexpected extra arguments: ${positional.slice(1).join(" ")}`,
		);
	}
	if (!out.output_dir) {
		throw new Error("Missing required flag: --out <dir>");
	}
	out.url = positional[0];
	return out as MockupParams;
}

async function main(): Promise<void> {
	const argv = process.argv.slice(2);
	if (argv.includes("--help") || argv.length === 0) {
		console.log(USAGE);
		process.exit(0);
	}
	if (argv.includes("--version")) {
		console.log(VERSION);
		process.exit(0);
	}

	let opts: MockupParams;
	try {
		opts = parseArgs(argv);
	} catch (err) {
		console.error((err as Error).message);
		console.error("");
		console.error(USAGE);
		process.exit(2);
	}

	try {
		const result = await run(opts);
		console.log(JSON.stringify(result, null, 2));
		process.exit(0);
	} catch (err) {
		console.error(`Error: ${(err as Error).message}`);
		process.exit(1);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	void main();
}
