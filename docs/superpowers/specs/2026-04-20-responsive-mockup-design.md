# Responsive Mockup Generator — Design

**Date:** 2026-04-20
**Status:** Approved, pending implementation plan
**Project:** `screenshot-mcp` (extending the existing MCP server)

## Goal

Add an automation tool that, given a URL, captures full-page screenshots at three responsive breakpoints (desktop, tablet, mobile), composites each into a device frame mockup, and writes the framed images to a directory. Available as both an MCP tool and a CLI.

## Scope

A new MCP tool `generate_responsive_mockup` added to the existing `screenshot-mcp` server, plus a thin CLI wrapper (`responsive-mockup` bin) that calls the same core code.

Given a URL and an output directory, the tool produces:

- `desktop.png` — full-page screenshot at 1440px width, in a desktop monitor frame, transparent background outside frame
- `tablet.png` — full-page screenshot at 768px width, in a tablet frame, transparent surround
- `mobile.png` — full-page screenshot at 375px width, in a phone frame, transparent surround
- `composite.png` — only when `composite: true` (MCP) or `--composite` (CLI); transparent background by default, configurable solid color via `background` param

All defaults are overridable: viewport widths, output filenames, browser device emulation on/off, fit mode, page-load timeouts.

`widths` always contains exactly three values mapped positionally to `desktop` / `tablet` / `mobile` frame slots. Custom widths use the same default frames (the screenshot is resized to fit the frame's screen rectangle regardless of source viewport width). Passing fewer or more than three widths is rejected at validation. To use a different number of breakpoints or different frame styles, define a new entry in `frames.json` and pass `frame_set`.

## Module layout

Mirrors the existing `screenshot-mcp/src` pattern. New files marked with `←`.

```
screenshot-mcp/
  src/
    index.ts          (existing — register new tool)
    tools.ts          (existing — add generate_responsive_mockup schema)
    handler.ts        (existing — dispatch to mockup handler)
    screenshot.ts     (existing — used as-is)
    types.ts          (existing — extend with mockup types)
    mockup/
      index.ts        ← orchestrator: capture → frame → optional composite
      capture.ts      ← multi-breakpoint capture using existing takeScreenshot
      frame.ts        ← Sharp composition of one screenshot into one frame
      composite.ts    ← Sharp horizontal stitching of three framed PNGs
      frames.ts       ← loads frames.json manifest, resolves frame asset paths
    cli/
      mockup.ts       ← thin CLI entry, parses argv, calls mockup/index
  assets/
    frames/
      desktop.png     ← bundled monitor frame (RGBA, transparent screen area)
      tablet.png
      mobile.png
      frames.json     ← per-frame manifest: screen geometry, canvas size
```

`mockup/` lives in its own subdirectory because it is a coherent feature with multiple focused files; flat would muddle it with the existing screenshot logic. `frames.json` is the single source of truth for frame geometry — adding a new frame later means dropping a PNG and adding a manifest entry, no code change.

## Data flow

```
CLI args / MCP call
        │
        ▼
┌───────────────────┐
│ mockup/index.ts   │   validates input, resolves output dir,
│  run(opts)        │   loads frames manifest, drives the pipeline
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ mockup/capture.ts │   for each breakpoint (desktop/tablet/mobile):
│ captureAll(...)   │     calls existing takeScreenshot() → temp PNG
└─────────┬─────────┘     in OS tmpdir, full_page: true
          │
          │  3 temp screenshot paths + their widths
          ▼
┌───────────────────┐
│ mockup/frame.ts   │   for each (screenshot, frame):
│ frameImage(...)   │     - load frame PNG (Sharp)
└─────────┬─────────┘     - resize screenshot to fit frame.screen rect,
          │                 crop top-aligned if taller than screen area
          │               - composite screenshot UNDER frame at (x,y)
          │               - output RGBA PNG with transparent surround
          │  3 framed PNGs written to output dir
          ▼
┌───────────────────┐
│ mockup/composite  │   only if opts.composite:
│ stitch(...)       │     load 3 framed PNGs, vertically center,
└─────────┬─────────┘     extend each onto canvas with gap+padding,
          │               flatten over background color (or transparent)
          ▼
   Result object:
   {
     output_dir,
     files: { desktop, tablet, mobile, composite? },
     breakpoints: [{ name, width, framed_dimensions, file_size_bytes }, ...]
   }
```

### Cropping policy

Full-page screenshots can be very tall (10000px+). The frame's screen area has a fixed aspect ratio. Two modes:

- `top-crop` (default): resize the screenshot to match the screen *width*, then crop to the screen *height* from the top. Shows the page hero.
- `full`: resize so the entire screenshot fits inside the screen area (letterboxed with transparent bars). Useful when the whole page should be visible.

### Intermediate artifacts

Raw screenshots are written to OS tmpdir, not the output directory. Only framed PNGs land where the user asked. If `keep_raw: true` is passed, raws are also copied to `output_dir/raw/` for debugging.

## Tool & CLI interfaces

### MCP tool: `generate_responsive_mockup`

Input schema:

```json
{
  "url": "https://example.com",
  "output_dir": "/abs/path/to/output",
  "filename_prefix": "example-com",
  "widths": [1440, 768, 375],
  "frame_set": "default",
  "use_device_emulation": false,
  "fit_mode": "top-crop",
  "composite": false,
  "background": "transparent",
  "keep_raw": false,
  "wait_for_selector": null,
  "wait_for_timeout": 300,
  "elements_to_hide": [],
  "page_timeout_ms": 30000,
  "selector_timeout_ms": 10000,
  "retry_on_timeout": true
}
```

Required: `url`, `output_dir`. All others have defaults.

Result shape:

```json
{
  "output_dir": "/abs/path/to/output",
  "files": {
    "desktop": "/abs/path/example-com-desktop.png",
    "tablet":  "/abs/path/example-com-tablet.png",
    "mobile":  "/abs/path/example-com-mobile.png",
    "composite": null
  },
  "breakpoints": [
    { "name": "desktop", "width": 1440, "framed_dimensions": [1480, 920], "file_size_bytes": 312044 },
    { "name": "tablet",  "width": 768,  "framed_dimensions": [720, 1000], "file_size_bytes": 184302 },
    { "name": "mobile",  "width": 375,  "framed_dimensions": [360, 720],  "file_size_bytes":  92118 }
  ]
}
```

### CLI: `responsive-mockup`

```
responsive-mockup <url> --out <dir> [options]

  --out <dir>                output directory (required)
  --prefix <str>             filename prefix (default: hostname slug)
  --widths <a,b,c>           comma-separated widths (default: 1440,768,375)
  --frame-set <name>         frame set (default: "default")
  --device-emulation         use Playwright device profiles
  --fit <mode>               top-crop | full (default: top-crop)
  --composite                also emit composite.png
  --background <color>       transparent | #hex (default: transparent)
  --keep-raw                 keep raw screenshots in <out>/raw/
  --wait-for <selector>      wait for CSS selector before capture
  --wait-ms <n>              extra wait after load (default: 300)
  --hide <sel,sel,...>       hide elements before capture
  --version, --help
```

CLI is a thin wrapper — it parses argv into the same options object the MCP handler builds, then calls the same `run()` function in `mockup/index.ts`.

## Frame manifest format

`assets/frames/frames.json`:

```json
{
  "default": {
    "desktop": {
      "image": "desktop.png",
      "canvas": { "width": 1480, "height": 920 },
      "screen": { "x": 40, "y": 40, "width": 1400, "height": 800 }
    },
    "tablet": {
      "image": "tablet.png",
      "canvas": { "width": 720, "height": 1000 },
      "screen": { "x": 36, "y": 80, "width": 648, "height": 840 }
    },
    "mobile": {
      "image": "mobile.png",
      "canvas": { "width": 360, "height": 720 },
      "screen": { "x": 20, "y": 70, "width": 320, "height": 580 }
    }
  }
}
```

- `canvas` is the full frame PNG dimensions; the final framed image is exactly this size.
- `screen` is the rectangle where the screenshot is placed (top-left + dimensions). Sharp uses it directly: `resize(screen.width, screen.height, { fit: fit_mode === 'top-crop' ? 'cover' : 'contain', position: 'top' })` then `composite([{input: screenshot, top: screen.y, left: screen.x}])`.
- The `default` namespace lets additional frame sets (`dark`, `flat`, etc.) be added later by adding a key, no code change.

The numbers above are placeholders. Real values are measured from the bundled frame PNGs once chosen, during implementation.

The frame PNGs themselves: ship 3 minimal, neutral mockups (silver desktop monitor, gray tablet, dark phone). Source candidates: Facebook's "Devices" set, Google's "Device Frames" generator output, or hand-cropped from any CC0 mockup. Final asset selection is an implementation-time decision based on license, dimensions, and visual style.

## Browser rendering modes

Three breakpoints use fixed viewport widths (1440 / 768 / 375) with a desktop user-agent by default — this matches what designers usually mean by "responsive breakpoints" (same code, different width).

When `use_device_emulation: true` is passed, the tool swaps the tablet and mobile breakpoints to Playwright device profiles (`devices['iPad Pro']`, `devices['iPhone 13']`) for accurate user-agent, touch flags, and device pixel ratio. Used when a site serves different markup per device or behaves like a PWA.

Default widths are configurable via `widths`.

## Error handling

| Failure | Behavior |
|---|---|
| Invalid URL (no protocol, malformed) | Reject before launching browser, return clear error. No partial output. |
| `output_dir` not writable | Check with `fs.access` before any work; return error. No browser launch. |
| Page load timeout (`page_timeout_ms`, default 30s) | One retry with `waitUntil: 'domcontentloaded'` instead of `'networkidle'` (many real sites never reach networkidle). If retry fails, fail the whole run. Disable retry with `retry_on_timeout: false`. |
| `wait_for_selector` not found within `selector_timeout_ms` (default 10s) | Fail immediately with selector name in error. No retry. |
| One breakpoint screenshot fails (after retries exhausted) | Fail the whole run. Cleanup rules below. |
| Frame asset missing or manifest entry malformed | Fail at startup before any browser work. Manifest validated on load. |
| Sharp composition failure (corrupt frame, OOM on huge screenshot) | Fail the run, surface Sharp's error message verbatim. |
| Browser crash mid-run | Existing `screenshot.ts` reuses the singleton browser; if it crashes, `getBrowser()` re-launches on next call. Wrap in try/catch that retries the failing breakpoint once with a fresh browser. This is independent of the page-timeout retry — a single breakpoint can use both (e.g., timeout retry succeeds, then browser crashes on next breakpoint, which gets its own crash retry). |

Two cross-cutting rules:

1. **No silent fallbacks.** If we hit a problem we cannot transparently recover from, the run fails with a specific error. No "couldn't get desktop, here is tablet+mobile" half-results.
2. **Cleanup on failure.**
   - Tmpdir intermediates: always deleted (try/finally), success or failure.
   - Output dir: never wiped (may contain unrelated user files).
   - Output files written by *this run*: any framed PNGs already written before the failure are deleted, so the user never sees a partial set in the output directory. Tracked via a per-run list of paths written by this invocation.
   - A half-written PNG (Sharp crashes mid-write) is deleted by the same mechanism.

## Testing approach

Three layers using Vitest (added as new devDep — `screenshot-mcp` has no existing test framework). Vitest is zero-config, native ESM, fits the project's `"type": "module"` setup.

### Unit-level (fast, no browser)

- `frame.ts` — load a known-size test screenshot + a known-size test frame, run `frameImage()`, assert output dimensions match `canvas`, assert pixel at `(0,0)` is transparent (RGBA `0,0,0,0`), assert pixel at center of `screen` rect comes from the screenshot.
- `composite.ts` — feed three pre-made framed PNGs of known sizes, assert composite width = sum + gaps + padding, assert vertical centering, assert background applied correctly for both `transparent` and `#hex` inputs.
- `frames.ts` — manifest validation: missing keys, bad geometry (screen extends beyond canvas), missing PNG file all surface clear errors.

### Integration (Playwright + Sharp, slower)

- One end-to-end test against a tiny static HTML fixture served via Playwright's built-in test server (no external network). Verifies the full pipeline produces three valid framed PNGs at expected dimensions.
- `composite: true` produces fourth file; `composite: false` (default) does not.
- `keep_raw: true` produces `output_dir/raw/` with three raw screenshots.

### Error path tests

- Invalid URL → clear error, no files written.
- Non-existent output dir → error before browser launches.
- Mocked Playwright timeout → retry happens, succeeds on retry; second timeout → run fails.
- Corrupt frame PNG → manifest load fails at startup.

### Out of scope

- Visual quality assessment of frames against real websites (eyeball work, not automated). One golden-image test against the static fixture is enough to catch regressions in framing math.
- Cross-browser (Firefox/WebKit). Existing screenshot tool is Chromium-only; new tool follows that.

## Dependencies and packaging changes

`screenshot-mcp/package.json`:

```json
{
  "bin": {
    "screenshot-mcp": "dist/index.js",
    "responsive-mockup": "dist/cli/mockup.js"
  },
  "scripts": {
    "build": "rm -rf dist && tsc && chmod +x dist/index.js dist/cli/mockup.js",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0",
    "playwright": "^1.52.0",
    "sharp": "^0.34.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  },
  "files": [
    "dist",
    "assets/frames/**"
  ]
}
```

Frame PNGs live in `assets/frames/`, outside `src/` so they bypass tsc. The `mockup/frames.ts` loader resolves them via `path.join(import.meta.dirname, '../../assets/frames', ...)` — works in both dev (`tsx`) and prod (`dist/`) because the relative depth from compiled JS to `assets/` is the same.

`tsconfig.json` already targets ESM modules; no changes needed.

Version bump: `1.0.0` → `1.1.0` (meaningful feature add, additive, non-breaking).

## Notes for implementation

- Frame PNG assets need to be sourced and measured before `frames.json` can be finalized. Measuring is straightforward: open each frame in an image editor, note the canvas dimensions and the rectangle of the transparent screen area.
