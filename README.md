# screenshot-mcp

MCP server that generates web page screenshots via Playwright. Useful for OG image generation, visual regression snapshots, and page previews.

## Requirements

- Node.js 20+
- Playwright's Chromium browser (installed automatically on first run)

## Installation

```bash
npm install
npx playwright install chromium
npm run build
```

## Running

### As an MCP server (stdio transport)

```bash
npm start
```

Or point your MCP client at `dist/index.js`.

### Development mode

```bash
npm run dev
```

## Tools

### `generate_screenshot`

Takes a screenshot of a web page and writes it as a PNG.

Parameters:

| Name | Type | Default | Description |
|---|---|---|---|
| `url` | string | required | URL to screenshot |
| `output_path` | string | required | Absolute path for the PNG |
| `viewport_width` | number | `1200` | Viewport width |
| `viewport_height` | number | `630` | Viewport height |
| `device_scale_factor` | number | `1` | `1` = standard, `2` = retina |
| `color_scheme` | string | `no-preference` | `light`, `dark`, or `no-preference` |
| `elements_to_hide` | string[] | `[]` | CSS selectors to hide before capture |
| `wait_for_selector` | string | — | Wait for this selector before capture |
| `wait_for_timeout` | number | `300` | Extra ms to wait after load |
| `full_page` | boolean | `false` | Capture full scrollable page |

Returns file path, final dimensions, file size, and format.

## Project layout

```
src/
  index.ts        MCP server entry, lifecycle
  tools.ts        Tool schemas
  handler.ts      Tool dispatch
  screenshot.ts   Playwright capture implementation
  types.ts        Shared types
docs/
  superpowers/
    specs/        Design documents for features in planning
```

## License

MIT — see headers in source files.
