// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

export interface ScreenshotParams {
	url: string;
	output_path: string;
	viewport_width?: number;
	viewport_height?: number;
	device_scale_factor?: number;
	color_scheme?: "light" | "dark" | "no-preference";
	elements_to_hide?: string[];
	wait_for_selector?: string;
	wait_for_timeout?: number;
	full_page?: boolean;
	wait_until?: "load" | "domcontentloaded" | "networkidle" | "commit";
	page_timeout_ms?: number;
	selector_timeout_ms?: number;
	device_name?: string;
}

export interface ScreenshotResult {
	file_path: string;
	width: number;
	height: number;
	file_size_bytes: number;
	format: string;
}

export type FitMode = "top-crop" | "full";

export interface FrameRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface FrameDimensions {
	width: number;
	height: number;
}

export interface FrameDef {
	image: string;
	canvas: FrameDimensions;
	screen: FrameRect;
}

export interface FrameSet {
	desktop: FrameDef;
	tablet: FrameDef;
	mobile: FrameDef;
}

export type BreakpointName = "desktop" | "tablet" | "mobile";

export interface MockupParams {
	url: string;
	output_dir: string;
	filename_prefix?: string;
	breakpoints?: BreakpointName[];
	widths?: number[];
	frame_set?: string;
	use_device_emulation?: boolean;
	fit_mode?: FitMode;
	composite?: boolean;
	background?: string;
	keep_raw?: boolean;
	wait_for_selector?: string;
	wait_for_timeout?: number;
	elements_to_hide?: string[];
	page_timeout_ms?: number;
	selector_timeout_ms?: number;
	retry_on_timeout?: boolean;
}

export interface MockupBreakpointResult {
	name: BreakpointName;
	width: number;
	framed_dimensions: [number, number];
	file_size_bytes: number;
}

export interface MockupResult {
	output_dir: string;
	files: {
		desktop?: string;
		tablet?: string;
		mobile?: string;
		composite: string | null;
	};
	breakpoints: MockupBreakpointResult[];
}
