// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { takeScreenshot } from './screenshot.js';
import type { ScreenshotParams } from './types.js';

export async function handleToolCall(
  name: string,
  args: Record<string, unknown> | undefined,
): Promise<CallToolResult> {
  try {
    switch (name) {
      case 'generate_screenshot': {
        if (!args?.url || !args?.output_path) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Missing required parameters: url and output_path' }],
          };
        }

        const params: ScreenshotParams = {
          url: args.url as string,
          output_path: args.output_path as string,
          viewport_width: args.viewport_width as number | undefined,
          viewport_height: args.viewport_height as number | undefined,
          device_scale_factor: args.device_scale_factor as number | undefined,
          color_scheme: args.color_scheme as ScreenshotParams['color_scheme'],
          elements_to_hide: args.elements_to_hide as string[] | undefined,
          wait_for_selector: args.wait_for_selector as string | undefined,
          wait_for_timeout: args.wait_for_timeout as number | undefined,
          full_page: args.full_page as boolean | undefined,
        };

        const result = await takeScreenshot(params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      default:
        return {
          isError: true,
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      isError: true,
      content: [{ type: 'text', text: `Screenshot failed: ${message}` }],
    };
  }
}
