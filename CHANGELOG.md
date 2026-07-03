# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.0] - 2026-07-03

### Added

- `generate_screenshot` now accepts `wait_until` (`load` | `domcontentloaded` | `networkidle` | `commit`), `page_timeout_ms`, and `selector_timeout_ms`. Lets SPAs and streaming pages that never reach `networkidle` be captured (e.g. with `wait_until: "load"` and a longer `page_timeout_ms`).

### Changed

- `generate_screenshot` `elements_to_hide` now applies before AND after the settle wait, using `display: none !important`. Overlays that open on a timer after load (cookie bars, popup modals, chat widgets) now stay hidden in the final frame instead of reappearing.

## [1.2.0] - 2026-04-20

### Changed
- Default breakpoints reduced from `["desktop", "tablet", "mobile"]` to `["desktop", "mobile"]`. Tablet is now opt-in via `breakpoints: ["desktop", "tablet", "mobile"]`.
- `widths` is now a variable-length `number[]` paired positionally with `breakpoints` (was a fixed 3-tuple).
- `MockupResult.files.desktop`, `tablet`, and `mobile` are now optional; only the requested breakpoints appear.

### Added
- `breakpoints` MockupParam and `--breakpoints desktop,mobile,tablet` CLI flag.
- Exported `BreakpointName` type.

### Migration
- Anyone calling the MCP tool with `widths: [1440, 768, 375]` and expecting all three breakpoints must now also pass `breakpoints: ["desktop", "tablet", "mobile"]`.
- CLI users on `--widths 1440,768,375` should add `--breakpoints desktop,tablet,mobile`.

## [1.1.1] - 2026-04-20

### Changed
- Replaced programmatic placeholder tablet and mobile frames with real device PNGs from `jonnyjackson26/device-frames-media`: iPad Pro 11 portrait silver and iPhone 16 Pro black titanium.
- Improved the generated desktop frame: silver bezel, rounded corners, integrated stand and neck (canvas grew from 1480x920 to 1480x1040 to accommodate the stand).

### Added
- `assets/frames/SOURCES.md` documenting the origin and license of each bundled frame.
- `scripts/generate-frames.mjs` now generates only the desktop frame; tablet and mobile are downloaded.

## [1.1.0] - 2026-04-20

### Added
- generate_responsive_mockup MCP tool: capture URL at three breakpoints, composite each into a device frame, optional combined composite.
- responsive-mockup CLI: same feature wrapped for command-line use, with --page-timeout, --selector-timeout, and --no-retry flags.
- Configurable page-load and waitForSelector timeouts via page_timeout_ms / selector_timeout_ms.
- Optional Playwright device emulation (use_device_emulation) for tablet (iPad Pro 11) and mobile (iPhone 13) breakpoints.
- Page-load timeout retry: one retry with domcontentloaded if the initial networkidle wait times out, gated by retry_on_timeout.
- Browser-crash retry: each breakpoint retries once with a fresh browser if the singleton crashes mid-run.
- Vitest test suite (30 tests) covering frames manifest loader, frame composition, composite stitching, capture orchestration with retry paths, CLI argv parsing with NaN guards, and end-to-end integration against a static fixture (composite on/off, keep_raw on/off).
- Programmatic placeholder device frame assets in assets/frames/ with a JSON manifest; replaceable without code changes.

## [1.0.0]

### Added
- Initial MCP server with generate_screenshot tool.
- Chromium-based full-page screenshots via Playwright.
- Configurable viewport, device scale factor, color scheme, element hiding, and selector/time waits.
- Browser singleton reuse across tool calls.
