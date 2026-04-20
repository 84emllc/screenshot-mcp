# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Design spec for `generate_responsive_mockup` tool and `responsive-mockup` CLI (see `docs/superpowers/specs/2026-04-20-responsive-mockup-design.md`).

## [1.0.0]

### Added
- Initial MCP server with `generate_screenshot` tool.
- Chromium-based full-page screenshots via Playwright.
- Configurable viewport, device scale factor, color scheme, element hiding, and selector/time waits.
- Browser singleton reuse across tool calls.
