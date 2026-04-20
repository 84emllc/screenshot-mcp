// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const tools: Tool[] = [
  {
    name: 'generate_screenshot',
    description:
      'Take a screenshot of a web page using Playwright. ' +
      'Useful for generating OG images, visual regression snapshots, or page previews. ' +
      'Returns the file path, dimensions, and file size of the saved PNG.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to screenshot (e.g., http://localhost:1316/about/)',
        },
        output_path: {
          type: 'string',
          description: 'Absolute path to save the PNG file',
        },
        viewport_width: {
          type: 'number',
          description: 'Viewport width in pixels (default: 1200)',
        },
        viewport_height: {
          type: 'number',
          description: 'Viewport height in pixels (default: 630)',
        },
        device_scale_factor: {
          type: 'number',
          description: 'Device scale factor: 1 = standard, 2 = retina (default: 1)',
        },
        color_scheme: {
          type: 'string',
          enum: ['light', 'dark', 'no-preference'],
          description: 'Preferred color scheme (default: no-preference)',
        },
        elements_to_hide: {
          type: 'array',
          items: { type: 'string' },
          description: 'CSS selectors of elements to hide before taking the screenshot',
        },
        wait_for_selector: {
          type: 'string',
          description: 'CSS selector to wait for before taking the screenshot',
        },
        wait_for_timeout: {
          type: 'number',
          description: 'Extra milliseconds to wait after page load (default: 300)',
        },
        full_page: {
          type: 'boolean',
          description: 'Capture full scrollable page instead of viewport only (default: false)',
        },
      },
      required: ['url', 'output_path'],
    },
  },
];
