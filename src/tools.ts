// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const tools: Tool[] = [
	{
		name: "generate_screenshot",
		description:
			"Take a screenshot of a web page using Playwright. " +
			"Useful for generating OG images, visual regression snapshots, or page previews. " +
			"Returns the file path, dimensions, and file size of the saved PNG.",
		inputSchema: {
			type: "object",
			properties: {
				url: {
					type: "string",
					description: "URL to screenshot (e.g., http://localhost:1316/about/)",
				},
				output_path: {
					type: "string",
					description: "Absolute path to save the PNG file",
				},
				viewport_width: {
					type: "number",
					description: "Viewport width in pixels (default: 1200)",
				},
				viewport_height: {
					type: "number",
					description: "Viewport height in pixels (default: 630)",
				},
				device_scale_factor: {
					type: "number",
					description:
						"Device scale factor: 1 = standard, 2 = retina (default: 1)",
				},
				color_scheme: {
					type: "string",
					enum: ["light", "dark", "no-preference"],
					description: "Preferred color scheme (default: no-preference)",
				},
				elements_to_hide: {
					type: "array",
					items: { type: "string" },
					description:
						"CSS selectors to hide. Applied before and after the settle wait, so overlays that open on a timer (cookie bars, popup modals, chat widgets) stay hidden in the final frame.",
				},
				wait_for_selector: {
					type: "string",
					description: "CSS selector to wait for before taking the screenshot",
				},
				wait_for_timeout: {
					type: "number",
					description:
						"Extra milliseconds to wait after page load (default: 300)",
				},
				full_page: {
					type: "boolean",
					description:
						"Capture full scrollable page instead of viewport only (default: false)",
				},
				wait_until: {
					type: "string",
					enum: ["load", "domcontentloaded", "networkidle", "commit"],
					description:
						"Playwright navigation wait condition (default: networkidle). Use 'load' or 'domcontentloaded' for SPAs or streaming pages that never reach networkidle.",
				},
				page_timeout_ms: {
					type: "number",
					description: "Page load (navigation) timeout in ms (default: 30000)",
				},
				selector_timeout_ms: {
					type: "number",
					description: "wait_for_selector timeout in ms (default: 10000)",
				},
			},
			required: ["url", "output_path"],
		},
	},
	{
		name: "generate_responsive_mockup",
		description:
			"Capture a URL at one or more responsive breakpoints (desktop, tablet, mobile) and composite " +
			"each into a device frame mockup. Writes RGBA PNGs to output_dir; optionally produces a " +
			"horizontal composite. Returns file paths and dimensions.",
		inputSchema: {
			type: "object",
			properties: {
				url: { type: "string", description: "URL to capture" },
				output_dir: {
					type: "string",
					description: "Absolute path to output directory",
				},
				filename_prefix: {
					type: "string",
					description: "Prefix for output filenames (default: hostname slug)",
				},
				breakpoints: {
					type: "array",
					items: {
						type: "string",
						enum: ["desktop", "tablet", "mobile"],
					},
					minItems: 1,
					maxItems: 3,
					description:
						'Breakpoints to capture (default: ["desktop", "mobile"])',
				},
				widths: {
					type: "array",
					items: { type: "number" },
					minItems: 1,
					maxItems: 3,
					description:
						"Per-breakpoint viewport widths, paired by index with breakpoints (default: per-breakpoint defaults)",
				},
				frame_set: {
					type: "string",
					description: 'Frame set name from frames.json (default: "default")',
				},
				use_device_emulation: {
					type: "boolean",
					description: "Use Playwright device profiles (default: false)",
				},
				device_scale_factor: {
					type: "number",
					description:
						"Capture and frame at this pixel density: 1 = standard, 2 = retina (default: 1). The screenshot is captured at this DPR and the frame is scaled to match, so output is a true 2x mockup. Applies to non-emulated breakpoints; emulated breakpoints use their device profile's DPR.",
				},
				fit_mode: {
					type: "string",
					enum: ["top-crop", "full"],
					description: 'How to fit screenshot into frame (default: "top-crop")',
				},
				composite: {
					type: "boolean",
					description: "Also emit composite.png (default: false)",
				},
				background: {
					type: "string",
					description:
						'Composite background: "transparent" or "#rrggbb" (default: "transparent")',
				},
				keep_raw: {
					type: "boolean",
					description:
						"Copy raw screenshots to output_dir/raw/ (default: false)",
				},
				wait_for_selector: {
					type: "string",
					description: "Wait for CSS selector before capture",
				},
				wait_for_timeout: {
					type: "number",
					description: "Extra ms to wait after page load (default: 300)",
				},
				elements_to_hide: {
					type: "array",
					items: { type: "string" },
					description: "CSS selectors to hide before capture",
				},
				page_timeout_ms: {
					type: "number",
					description: "Page load timeout in ms (default: 30000)",
				},
				selector_timeout_ms: {
					type: "number",
					description: "wait_for_selector timeout in ms (default: 10000)",
				},
				retry_on_timeout: {
					type: "boolean",
					description:
						"Retry once with relaxed waitUntil on timeout (default: true)",
				},
			},
			required: ["url", "output_dir"],
		},
	},
];
