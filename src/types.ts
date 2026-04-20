// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

export interface ScreenshotParams {
  url: string;
  output_path: string;
  viewport_width?: number;
  viewport_height?: number;
  device_scale_factor?: number;
  color_scheme?: 'light' | 'dark' | 'no-preference';
  elements_to_hide?: string[];
  wait_for_selector?: string;
  wait_for_timeout?: number;
  full_page?: boolean;
}

export interface ScreenshotResult {
  file_path: string;
  width: number;
  height: number;
  file_size_bytes: number;
  format: string;
}
