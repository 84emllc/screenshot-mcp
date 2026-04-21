# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
