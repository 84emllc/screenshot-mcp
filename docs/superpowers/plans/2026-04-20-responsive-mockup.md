# Responsive Mockup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `generate_responsive_mockup` MCP tool and matching `responsive-mockup` CLI to the existing `screenshot-mcp` project. Each invocation captures a URL at three responsive breakpoints (1440 / 768 / 375 px), composites each screenshot into a device frame, and writes RGBA PNGs (with optional combined composite) to a directory.

**Architecture:** A new `src/mockup/` subdirectory adds focused single-responsibility modules (capture, frame, composite, manifest loader, orchestrator). The MCP handler dispatches to the same `run()` function the CLI calls. Sharp performs image composition; existing `takeScreenshot()` is reused for capture. Frame assets live in `assets/frames/` with a JSON manifest mapping each frame to its screen rectangle.

**Tech Stack:** TypeScript (ESM), Playwright (Chromium), Sharp (image composition), Vitest (testing), MCP SDK (existing).

**Spec:** `docs/superpowers/specs/2026-04-20-responsive-mockup-design.md`

---

## File Structure

**Created:**
- `vitest.config.ts` — Vitest config (zero-feature, just enable Node env)
- `src/mockup/index.ts` — orchestrator `run(opts)`
- `src/mockup/capture.ts` — `captureAll(opts)` driving 3 calls to existing `takeScreenshot()`
- `src/mockup/frame.ts` — `frameImage(screenshotPath, frame, fit) → Buffer`
- `src/mockup/composite.ts` — `stitch(framedPaths, background) → Buffer`
- `src/mockup/frames.ts` — `loadFrames(setName) → FrameSet` with manifest validation
- `src/cli/mockup.ts` — CLI entry, argv parsing, calls `run()`
- `assets/frames/frames.json` — frame manifest (default set)
- `assets/frames/desktop.png`, `tablet.png`, `mobile.png` — programmatically generated placeholder frames (committed PNGs; can be replaced by polished assets later without code change)
- `tests/mockup/frames.test.ts`
- `tests/mockup/frame.test.ts`
- `tests/mockup/composite.test.ts`
- `tests/mockup/capture.test.ts`
- `tests/mockup/index.integration.test.ts`
- `tests/cli/mockup.test.ts`
- `tests/fixtures/index.html` — static HTML page for integration test

**Modified:**
- `package.json` — add `sharp`, `vitest` deps; add `responsive-mockup` bin; update `build` script; add `test` scripts; bump version to `1.1.0`
- `src/types.ts` — add mockup-related interfaces
- `src/tools.ts` — add `generate_responsive_mockup` schema
- `src/handler.ts` — dispatch new tool to `mockup/index.ts:run()`
- `CHANGELOG.md` — move feature to `[1.1.0]` released entry

**Branch:** `feature/responsive-mockup` (per global rule: no direct commits to main).

---

## Task 0: Branch setup

**Files:** none yet.

- [ ] **Step 1: Create the feature branch**

```bash
git -C /home/andrew/workspace/screenshot-mcp checkout -b feature/responsive-mockup
```

Expected: `Switched to a new branch 'feature/responsive-mockup'`

- [ ] **Step 2: Verify branch**

```bash
git -C /home/andrew/workspace/screenshot-mcp branch --show-current
```

Expected: `feature/responsive-mockup`

---

## Task 1: Install dependencies and configure Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `tests/.gitkeep`

- [ ] **Step 1: Install runtime and dev dependencies**

```bash
cd /home/andrew/workspace/screenshot-mcp && npm install sharp@^0.34.0 && npm install --save-dev vitest@^3.0.0
```

Expected: both packages added to `package.json`, `node_modules` updated.

- [ ] **Step 2: Update package.json — bin, scripts, files**

Open `package.json`. Replace the `bin` block:

```json
"bin": {
  "screenshot-mcp": "dist/index.js",
  "responsive-mockup": "dist/cli/mockup.js"
},
```

Replace the `scripts` block:

```json
"scripts": {
  "build": "rm -rf dist && tsc && chmod +x dist/index.js dist/cli/mockup.js",
  "dev": "tsx watch src/index.ts",
  "start": "node dist/index.js",
  "test": "vitest run",
  "test:watch": "vitest"
},
```

Add a top-level `files` entry (after `"main"`):

```json
"files": [
  "dist",
  "assets/frames/**"
],
```

- [ ] **Step 3: Create Vitest config**

Create `vitest.config.ts`:

```typescript
// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 20000,
  },
});
```

- [ ] **Step 4: Create tests directory placeholder**

```bash
mkdir -p /home/andrew/workspace/screenshot-mcp/tests && touch /home/andrew/workspace/screenshot-mcp/tests/.gitkeep
```

- [ ] **Step 5: Smoke-run vitest**

```bash
cd /home/andrew/workspace/screenshot-mcp && npx vitest run
```

Expected: `No test files found` exit 0 (or similar) — confirms vitest is installed and configured.

- [ ] **Step 6: Commit**

```bash
git -C /home/andrew/workspace/screenshot-mcp add package.json package-lock.json vitest.config.ts tests/.gitkeep
git -C /home/andrew/workspace/screenshot-mcp commit -m "chore: add sharp and vitest, configure test runner"
```

---

## Task 2: Add mockup type definitions

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Append types to src/types.ts**

Append these types (do not modify the existing `ScreenshotParams` / `ScreenshotResult` block):

```typescript
export type FitMode = 'top-crop' | 'full';

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

export interface MockupParams {
  url: string;
  output_dir: string;
  filename_prefix?: string;
  widths?: [number, number, number];
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
  name: 'desktop' | 'tablet' | 'mobile';
  width: number;
  framed_dimensions: [number, number];
  file_size_bytes: number;
}

export interface MockupResult {
  output_dir: string;
  files: {
    desktop: string;
    tablet: string;
    mobile: string;
    composite: string | null;
  };
  breakpoints: MockupBreakpointResult[];
}
```

- [ ] **Step 2: Verify TypeScript still compiles**

```bash
cd /home/andrew/workspace/screenshot-mcp && npx tsc --noEmit
```

Expected: exit 0, no errors.

- [ ] **Step 3: Commit**

```bash
git -C /home/andrew/workspace/screenshot-mcp add src/types.ts
git -C /home/andrew/workspace/screenshot-mcp commit -m "feat: add mockup type definitions"
```

---

## Task 3: Frame manifest loader (`mockup/frames.ts`) — TDD

**Files:**
- Create: `src/mockup/frames.ts`
- Create: `tests/mockup/frames.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/mockup/frames.test.ts`:

```typescript
// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadFrames } from '../../src/mockup/frames.js';

const tmp = join(tmpdir(), `frames-test-${Date.now()}`);

beforeAll(async () => {
  await mkdir(tmp, { recursive: true });
  const onePxPng = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63000100000005000100' +
    '0d0a2db40000000049454e44ae426082',
    'hex',
  );
  for (const name of ['desktop.png', 'tablet.png', 'mobile.png']) {
    await writeFile(join(tmp, name), onePxPng);
  }
  await writeFile(
    join(tmp, 'frames.json'),
    JSON.stringify({
      default: {
        desktop: { image: 'desktop.png', canvas: { width: 1480, height: 920 }, screen: { x: 40, y: 40, width: 1400, height: 800 } },
        tablet: { image: 'tablet.png', canvas: { width: 720, height: 1000 }, screen: { x: 36, y: 80, width: 648, height: 840 } },
        mobile: { image: 'mobile.png', canvas: { width: 360, height: 720 }, screen: { x: 20, y: 70, width: 320, height: 580 } },
      },
    }),
  );
});

afterAll(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('loadFrames', () => {
  it('loads the default set from a directory and resolves image paths', async () => {
    const set = await loadFrames('default', tmp);
    expect(set.desktop.canvas.width).toBe(1480);
    expect(set.desktop.image).toBe(join(tmp, 'desktop.png'));
    expect(set.mobile.screen.width).toBe(320);
  });

  it('throws if the requested set is missing', async () => {
    await expect(loadFrames('does-not-exist', tmp)).rejects.toThrow(/frame set/i);
  });

  it('throws if a frame PNG is missing', async () => {
    const broken = join(tmp, 'broken');
    await mkdir(broken, { recursive: true });
    await writeFile(
      join(broken, 'frames.json'),
      JSON.stringify({ default: { desktop: { image: 'missing.png', canvas: { width: 10, height: 10 }, screen: { x: 0, y: 0, width: 5, height: 5 } }, tablet: { image: 'missing.png', canvas: { width: 10, height: 10 }, screen: { x: 0, y: 0, width: 5, height: 5 } }, mobile: { image: 'missing.png', canvas: { width: 10, height: 10 }, screen: { x: 0, y: 0, width: 5, height: 5 } } } }),
    );
    await expect(loadFrames('default', broken)).rejects.toThrow(/missing\.png/);
  });

  it('throws if screen extends beyond canvas', async () => {
    const broken = join(tmp, 'oob');
    await mkdir(broken, { recursive: true });
    await writeFile(join(broken, 'frame.png'), Buffer.alloc(0));
    await writeFile(
      join(broken, 'frames.json'),
      JSON.stringify({ default: { desktop: { image: 'frame.png', canvas: { width: 100, height: 100 }, screen: { x: 50, y: 50, width: 100, height: 100 } }, tablet: { image: 'frame.png', canvas: { width: 100, height: 100 }, screen: { x: 0, y: 0, width: 50, height: 50 } }, mobile: { image: 'frame.png', canvas: { width: 100, height: 100 }, screen: { x: 0, y: 0, width: 50, height: 50 } } } }),
    );
    await expect(loadFrames('default', broken)).rejects.toThrow(/screen.*exceeds/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/andrew/workspace/screenshot-mcp && npx vitest run tests/mockup/frames.test.ts
```

Expected: FAIL — module `src/mockup/frames.js` not found.

- [ ] **Step 3: Implement frames.ts**

Create `src/mockup/frames.ts`:

```typescript
// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { readFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FrameDef, FrameSet } from '../types.js';

const DEFAULT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets', 'frames');

interface ManifestFile {
  [setName: string]: {
    desktop: FrameDef;
    tablet: FrameDef;
    mobile: FrameDef;
  };
}

function validateFrame(name: string, frame: FrameDef): void {
  if (!frame || typeof frame !== 'object') {
    throw new Error(`Frame "${name}" is missing or not an object`);
  }
  for (const key of ['image', 'canvas', 'screen'] as const) {
    if (!(key in frame)) throw new Error(`Frame "${name}" is missing required field "${key}"`);
  }
  const { canvas, screen } = frame;
  if (
    screen.x < 0 ||
    screen.y < 0 ||
    screen.x + screen.width > canvas.width ||
    screen.y + screen.height > canvas.height
  ) {
    throw new Error(`Frame "${name}" screen rectangle exceeds canvas bounds`);
  }
}

export async function loadFrames(setName: string, dir: string = DEFAULT_DIR): Promise<FrameSet> {
  const manifestPath = join(dir, 'frames.json');
  let raw: string;
  try {
    raw = await readFile(manifestPath, 'utf8');
  } catch (err) {
    throw new Error(`Cannot read frames manifest at ${manifestPath}: ${(err as Error).message}`);
  }
  let manifest: ManifestFile;
  try {
    manifest = JSON.parse(raw) as ManifestFile;
  } catch (err) {
    throw new Error(`Invalid JSON in ${manifestPath}: ${(err as Error).message}`);
  }
  const set = manifest[setName];
  if (!set) {
    throw new Error(`Frame set "${setName}" not found in ${manifestPath}`);
  }
  for (const name of ['desktop', 'tablet', 'mobile'] as const) {
    validateFrame(name, set[name]);
    const imagePath = join(dir, set[name].image);
    try {
      await access(imagePath);
    } catch {
      throw new Error(`Frame image not found: ${set[name].image} (resolved to ${imagePath})`);
    }
    set[name] = { ...set[name], image: imagePath };
  }
  return set;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/andrew/workspace/screenshot-mcp && npx vitest run tests/mockup/frames.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git -C /home/andrew/workspace/screenshot-mcp add src/mockup/frames.ts tests/mockup/frames.test.ts
git -C /home/andrew/workspace/screenshot-mcp commit -m "feat: add frames manifest loader with validation"
```

---

## Task 4: Frame composition (`mockup/frame.ts`) — TDD

**Files:**
- Create: `src/mockup/frame.ts`
- Create: `tests/mockup/frame.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/mockup/frame.test.ts`:

```typescript
// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { frameImage } from '../../src/mockup/frame.js';
import type { FrameDef } from '../../src/types.js';

const tmp = join(tmpdir(), `frame-test-${Date.now()}`);

async function makeSolidPng(path: string, width: number, height: number, rgba: [number, number, number, number]) {
  await sharp({
    create: { width, height, channels: 4, background: { r: rgba[0], g: rgba[1], b: rgba[2], alpha: rgba[3] / 255 } },
  })
    .png()
    .toFile(path);
}

beforeAll(async () => {
  await mkdir(tmp, { recursive: true });
});

afterAll(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('frameImage', () => {
  it('produces an image matching frame canvas dimensions with transparent surround and screenshot inside the screen rect', async () => {
    const screenshotPath = join(tmp, 'shot.png');
    const framePath = join(tmp, 'frame.png');
    await makeSolidPng(screenshotPath, 200, 1000, [255, 0, 0, 255]);
    const greenBorder = await sharp({
      create: { width: 100, height: 100, channels: 4, background: { r: 0, g: 255, b: 0, alpha: 1 } },
    })
      .composite([
        {
          input: await sharp({
            create: { width: 80, height: 80, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
          })
            .png()
            .toBuffer(),
          left: 10,
          top: 10,
          blend: 'dest-out',
        },
      ])
      .png()
      .toBuffer();
    await writeFile(framePath, greenBorder);

    const frame: FrameDef = {
      image: framePath,
      canvas: { width: 100, height: 100 },
      screen: { x: 10, y: 10, width: 80, height: 80 },
    };

    const out = await frameImage(screenshotPath, frame, 'top-crop');
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(100);
    expect(meta.height).toBe(100);
    expect(meta.channels).toBe(4);

    const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    const pxAt = (x: number, y: number) => {
      const i = (y * info.width + x) * info.channels;
      return [data[i], data[i + 1], data[i + 2], data[i + 3]];
    };
    expect(pxAt(0, 0)).toEqual([0, 255, 0, 255]);
    const center = pxAt(50, 50);
    expect(center[0]).toBeGreaterThan(200);
    expect(center[1]).toBeLessThan(50);
  });

  it("uses 'cover' fit for top-crop and 'contain' for full", async () => {
    const screenshotPath = join(tmp, 'tall.png');
    const framePath = join(tmp, 'tinyframe.png');
    await makeSolidPng(screenshotPath, 100, 1000, [0, 0, 255, 255]);
    await makeSolidPng(framePath, 100, 100, [0, 0, 0, 0]);

    const frame: FrameDef = {
      image: framePath,
      canvas: { width: 100, height: 100 },
      screen: { x: 0, y: 0, width: 100, height: 100 },
    };

    const cropped = await frameImage(screenshotPath, frame, 'top-crop');
    const contained = await frameImage(screenshotPath, frame, 'full');

    const cMeta = await sharp(cropped).raw().toBuffer({ resolveWithObject: true });
    const cPx = (x: number, y: number) => {
      const i = (y * cMeta.info.width + x) * cMeta.info.channels;
      return [cMeta.data[i], cMeta.data[i + 1], cMeta.data[i + 2], cMeta.data[i + 3]];
    };
    expect(cPx(50, 50)[2]).toBeGreaterThan(200);

    const ctMeta = await sharp(contained).raw().toBuffer({ resolveWithObject: true });
    const ctPx = (x: number, y: number) => {
      const i = (y * ctMeta.info.width + x) * ctMeta.info.channels;
      return [ctMeta.data[i], ctMeta.data[i + 1], ctMeta.data[i + 2], ctMeta.data[i + 3]];
    };
    expect(ctPx(50, 50)[2]).toBeGreaterThan(200);
    expect(ctPx(0, 0)[3]).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/andrew/workspace/screenshot-mcp && npx vitest run tests/mockup/frame.test.ts
```

Expected: FAIL — module `src/mockup/frame.js` not found.

- [ ] **Step 3: Implement frame.ts**

Create `src/mockup/frame.ts`:

```typescript
// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import sharp from 'sharp';
import type { FrameDef, FitMode } from '../types.js';

export async function frameImage(screenshotPath: string, frame: FrameDef, fit: FitMode): Promise<Buffer> {
  const sharpFit = fit === 'top-crop' ? 'cover' : 'contain';

  const screenshotResized = await sharp(screenshotPath)
    .resize(frame.screen.width, frame.screen.height, {
      fit: sharpFit,
      position: 'top',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const blank = await sharp({
    create: {
      width: frame.canvas.width,
      height: frame.canvas.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();

  return sharp(blank)
    .composite([
      { input: screenshotResized, left: frame.screen.x, top: frame.screen.y },
      { input: frame.image, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/andrew/workspace/screenshot-mcp && npx vitest run tests/mockup/frame.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git -C /home/andrew/workspace/screenshot-mcp add src/mockup/frame.ts tests/mockup/frame.test.ts
git -C /home/andrew/workspace/screenshot-mcp commit -m "feat: add frame composition with cover/contain fit modes"
```

---

## Task 5: Composite stitching (`mockup/composite.ts`) — TDD

**Files:**
- Create: `src/mockup/composite.ts`
- Create: `tests/mockup/composite.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/mockup/composite.test.ts`:

```typescript
// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { stitch } from '../../src/mockup/composite.js';

const tmp = join(tmpdir(), `composite-test-${Date.now()}`);

async function makeSolidPng(path: string, width: number, height: number, rgba: [number, number, number, number]) {
  await sharp({
    create: { width, height, channels: 4, background: { r: rgba[0], g: rgba[1], b: rgba[2], alpha: rgba[3] / 255 } },
  })
    .png()
    .toFile(path);
}

beforeAll(async () => {
  await mkdir(tmp, { recursive: true });
  await makeSolidPng(join(tmp, 'd.png'), 400, 300, [255, 0, 0, 255]);
  await makeSolidPng(join(tmp, 't.png'), 200, 250, [0, 255, 0, 255]);
  await makeSolidPng(join(tmp, 'm.png'), 100, 200, [0, 0, 255, 255]);
});

afterAll(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('stitch', () => {
  it('produces a horizontal canvas sized for inputs + gaps + padding, transparent by default', async () => {
    const out = await stitch(
      { desktop: join(tmp, 'd.png'), tablet: join(tmp, 't.png'), mobile: join(tmp, 'm.png') },
      'transparent',
    );
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(880);
    expect(meta.height).toBe(460);
    expect(meta.channels).toBe(4);

    const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    const i = (0 * info.width + 0) * info.channels;
    expect(data[i + 3]).toBe(0);
  });

  it('flattens onto a solid background when a hex color is given', async () => {
    const out = await stitch(
      { desktop: join(tmp, 'd.png'), tablet: join(tmp, 't.png'), mobile: join(tmp, 'm.png') },
      '#ffffff',
    );
    const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    const i = (0 * info.width + 0) * info.channels;
    expect(data[i]).toBe(255);
    expect(data[i + 1]).toBe(255);
    expect(data[i + 2]).toBe(255);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/andrew/workspace/screenshot-mcp && npx vitest run tests/mockup/composite.test.ts
```

Expected: FAIL — module `src/mockup/composite.js` not found.

- [ ] **Step 3: Implement composite.ts**

Create `src/mockup/composite.ts`:

```typescript
// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import sharp from 'sharp';

interface FramedPaths {
  desktop: string;
  tablet: string;
  mobile: string;
}

const GAP = 60;
const PADDING = 80;

function parseBackground(bg: string): { r: number; g: number; b: number; alpha: number } {
  if (bg === 'transparent') return { r: 0, g: 0, b: 0, alpha: 0 };
  const m = /^#([0-9a-f]{6})$/i.exec(bg);
  if (!m) throw new Error(`Invalid background color: ${bg} (expected "transparent" or "#rrggbb")`);
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff, alpha: 1 };
}

export async function stitch(paths: FramedPaths, background: string): Promise<Buffer> {
  const order = [paths.desktop, paths.tablet, paths.mobile];
  const metas = await Promise.all(order.map(async (p) => ({ path: p, meta: await sharp(p).metadata() })));

  for (const { path, meta } of metas) {
    if (!meta.width || !meta.height) {
      throw new Error(`Cannot read dimensions of ${path}`);
    }
  }

  const widths = metas.map((m) => m.meta.width!);
  const heights = metas.map((m) => m.meta.height!);
  const totalWidth = widths.reduce((a, b) => a + b, 0) + GAP * 2 + PADDING * 2;
  const maxHeight = Math.max(...heights);
  const totalHeight = maxHeight + PADDING * 2;
  const bg = parseBackground(background);

  let cursorLeft = PADDING;
  const composites = metas.map(({ path, meta }) => {
    const left = cursorLeft;
    const top = PADDING + Math.round((maxHeight - meta.height!) / 2);
    cursorLeft += meta.width! + GAP;
    return { input: path, left, top };
  });

  return sharp({
    create: { width: totalWidth, height: totalHeight, channels: 4, background: bg },
  })
    .composite(composites)
    .png()
    .toBuffer();
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/andrew/workspace/screenshot-mcp && npx vitest run tests/mockup/composite.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git -C /home/andrew/workspace/screenshot-mcp add src/mockup/composite.ts tests/mockup/composite.test.ts
git -C /home/andrew/workspace/screenshot-mcp commit -m "feat: add side-by-side composite stitching"
```

---

## Task 6: Multi-breakpoint capture (`mockup/capture.ts`) — TDD

**Files:**
- Create: `src/mockup/capture.ts`
- Create: `tests/mockup/capture.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/mockup/capture.test.ts`:

```typescript
// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/screenshot.js', () => {
  return {
    takeScreenshot: vi.fn(async (params) => ({
      file_path: params.output_path,
      width: params.viewport_width ?? 1200,
      height: -1,
      file_size_bytes: 1234,
      format: 'png',
    })),
    closeBrowser: vi.fn(async () => {}),
  };
});

import { captureAll } from '../../src/mockup/capture.js';
import { takeScreenshot } from '../../src/screenshot.js';

beforeEach(() => {
  (takeScreenshot as unknown as { mockClear: () => void }).mockClear();
});

describe('captureAll', () => {
  it('captures three breakpoints with the configured widths', async () => {
    const result = await captureAll({
      url: 'https://example.com',
      widths: [1440, 768, 375],
      use_device_emulation: false,
      page_timeout_ms: 30000,
      selector_timeout_ms: 10000,
      wait_for_timeout: 300,
      elements_to_hide: [],
    });

    expect(takeScreenshot).toHaveBeenCalledTimes(3);
    expect(result.breakpoints).toHaveLength(3);
    const calls = (takeScreenshot as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect((calls[0][0] as { viewport_width: number }).viewport_width).toBe(1440);
    expect((calls[1][0] as { viewport_width: number }).viewport_width).toBe(768);
    expect((calls[2][0] as { viewport_width: number }).viewport_width).toBe(375);
    for (const call of calls) {
      expect((call[0] as { full_page: boolean }).full_page).toBe(true);
    }
  });

  it('rejects widths arrays that are not exactly length 3', async () => {
    await expect(
      captureAll({
        url: 'https://example.com',
        widths: [1440, 768] as unknown as [number, number, number],
        use_device_emulation: false,
        page_timeout_ms: 30000,
        selector_timeout_ms: 10000,
        wait_for_timeout: 300,
        elements_to_hide: [],
      }),
    ).rejects.toThrow(/exactly three/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/andrew/workspace/screenshot-mcp && npx vitest run tests/mockup/capture.test.ts
```

Expected: FAIL — module `src/mockup/capture.js` not found.

- [ ] **Step 3: Implement capture.ts**

Create `src/mockup/capture.ts`:

```typescript
// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { takeScreenshot } from '../screenshot.js';
import type { ScreenshotResult } from '../types.js';

export interface CaptureOpts {
  url: string;
  widths: [number, number, number];
  use_device_emulation: boolean;
  page_timeout_ms: number;
  selector_timeout_ms: number;
  wait_for_timeout: number;
  elements_to_hide: string[];
  wait_for_selector?: string;
}

export interface CapturedBreakpoint {
  name: 'desktop' | 'tablet' | 'mobile';
  width: number;
  path: string;
  result: ScreenshotResult;
}

export interface CaptureAllResult {
  breakpoints: CapturedBreakpoint[];
  sessionDir: string;
}

const NAMES: Array<CapturedBreakpoint['name']> = ['desktop', 'tablet', 'mobile'];

export async function captureAll(opts: CaptureOpts): Promise<CaptureAllResult> {
  if (!Array.isArray(opts.widths) || opts.widths.length !== 3) {
    throw new Error('widths must contain exactly three values: [desktop, tablet, mobile]');
  }

  const sessionDir = join(tmpdir(), `mockup-${Date.now()}-${process.pid}`);
  await mkdir(sessionDir, { recursive: true });
  const breakpoints: CapturedBreakpoint[] = [];

  for (let i = 0; i < 3; i++) {
    const name = NAMES[i];
    const width = opts.widths[i];
    const outputPath = join(sessionDir, `${name}.png`);
    const result = await takeScreenshot({
      url: opts.url,
      output_path: outputPath,
      viewport_width: width,
      viewport_height: Math.round((width * 9) / 16),
      device_scale_factor: 1,
      full_page: true,
      wait_for_selector: opts.wait_for_selector,
      wait_for_timeout: opts.wait_for_timeout,
      elements_to_hide: opts.elements_to_hide,
    });
    breakpoints.push({ name, width, path: outputPath, result });
  }

  return { breakpoints, sessionDir };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/andrew/workspace/screenshot-mcp && npx vitest run tests/mockup/capture.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git -C /home/andrew/workspace/screenshot-mcp add src/mockup/capture.ts tests/mockup/capture.test.ts
git -C /home/andrew/workspace/screenshot-mcp commit -m "feat: add multi-breakpoint capture wrapper"
```

---

## Task 7: Page-timeout retry

The spec calls for "one retry with `waitUntil: 'domcontentloaded'` after page timeout" because many real sites never reach `networkidle`. The existing `takeScreenshot` doesn't expose `waitUntil`, so this task threads it through.

**Files:**
- Modify: `src/types.ts` (add optional `wait_until` to `ScreenshotParams`)
- Modify: `src/screenshot.ts` (consume `wait_until`)
- Modify: `src/mockup/capture.ts` (catch timeout, retry with `domcontentloaded`)
- Modify: `tests/mockup/capture.test.ts` (add retry test)

- [ ] **Step 1: Extend ScreenshotParams**

In `src/types.ts`, add a field to the existing `ScreenshotParams` interface:

```typescript
wait_until?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
```

- [ ] **Step 2: Use it in screenshot.ts**

In `src/screenshot.ts`, change the `goto` line:

```typescript
await page.goto(params.url, { waitUntil: params.wait_until ?? 'networkidle', timeout: 30000 });
```

- [ ] **Step 3: Add retry to capture.ts**

In `src/mockup/capture.ts`, replace the body of the `for` loop with:

```typescript
for (let i = 0; i < 3; i++) {
  const name = NAMES[i];
  const width = opts.widths[i];
  const outputPath = join(sessionDir, `${name}.png`);
  const baseParams = {
    url: opts.url,
    output_path: outputPath,
    viewport_width: width,
    viewport_height: Math.round((width * 9) / 16),
    device_scale_factor: 1,
    full_page: true,
    wait_for_selector: opts.wait_for_selector,
    wait_for_timeout: opts.wait_for_timeout,
    elements_to_hide: opts.elements_to_hide,
  };
  let result: ScreenshotResult;
  try {
    result = await takeScreenshot(baseParams);
  } catch (err) {
    const message = (err as Error).message;
    if (/timeout/i.test(message)) {
      result = await takeScreenshot({ ...baseParams, wait_until: 'domcontentloaded' });
    } else {
      throw err;
    }
  }
  breakpoints.push({ name, width, path: outputPath, result });
}
```

- [ ] **Step 4: Add retry test**

In `tests/mockup/capture.test.ts`, add this test inside the `describe('captureAll', ...)` block:

```typescript
it('retries with domcontentloaded after a timeout error', async () => {
  let calls = 0;
  (takeScreenshot as unknown as { mockImplementation: (fn: unknown) => void }).mockImplementation(
    async (params: { wait_until?: string; viewport_width?: number; output_path: string }) => {
      calls++;
      if (calls === 1) throw new Error('Timeout 30000ms exceeded');
      return {
        file_path: params.output_path,
        width: params.viewport_width ?? 1200,
        height: -1,
        file_size_bytes: 1,
        format: 'png',
      };
    },
  );
  const out = await captureAll({
    url: 'https://example.com',
    widths: [1440, 768, 375],
    use_device_emulation: false,
    page_timeout_ms: 30000,
    selector_timeout_ms: 10000,
    wait_for_timeout: 300,
    elements_to_hide: [],
  });
  expect(out.breakpoints).toHaveLength(3);
  expect((takeScreenshot as unknown as { mock: { calls: unknown[][] } }).mock.calls.length).toBe(4);
});
```

- [ ] **Step 5: Run tests**

```bash
cd /home/andrew/workspace/screenshot-mcp && npx vitest run tests/mockup/capture.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git -C /home/andrew/workspace/screenshot-mcp add src/types.ts src/screenshot.ts src/mockup/capture.ts tests/mockup/capture.test.ts
git -C /home/andrew/workspace/screenshot-mcp commit -m "feat: retry once with domcontentloaded after page timeout"
```

---

## Task 8: Mockup orchestrator (`mockup/index.ts`)

**Files:**
- Create: `src/mockup/index.ts`
- Create: `tests/mockup/orchestrator.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/mockup/orchestrator.test.ts`:

```typescript
// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { describe, it, expect } from 'vitest';
import { run } from '../../src/mockup/index.js';

describe('run (input validation)', () => {
  it('rejects when widths is not exactly length 3', async () => {
    await expect(
      run({
        url: 'https://example.com',
        output_dir: '/tmp/out-mockup-orch-test',
        widths: [1440] as unknown as [number, number, number],
      }),
    ).rejects.toThrow(/exactly three/i);
  });

  it('rejects when output_dir cannot be created', async () => {
    await expect(
      run({ url: 'https://example.com', output_dir: '/proc/cannot-create-here' }),
    ).rejects.toThrow();
  });

  it('rejects an invalid URL before launching the browser', async () => {
    await expect(run({ url: 'not a url', output_dir: '/tmp/out-mockup-orch-test' })).rejects.toThrow(/url/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/andrew/workspace/screenshot-mcp && npx vitest run tests/mockup/orchestrator.test.ts
```

Expected: FAIL — module `src/mockup/index.js` not found.

- [ ] **Step 3: Implement mockup/index.ts**

Create `src/mockup/index.ts`:

```typescript
// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { mkdir, writeFile, copyFile, rm, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { URL } from 'node:url';
import { loadFrames } from './frames.js';
import { captureAll } from './capture.js';
import { frameImage } from './frame.js';
import { stitch } from './composite.js';
import type { MockupParams, MockupResult, MockupBreakpointResult } from '../types.js';

function slugifyHost(urlStr: string): string {
  const u = new URL(urlStr);
  return u.hostname.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

function validateUrl(urlStr: string): void {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      throw new Error(`URL protocol must be http or https, got ${u.protocol}`);
    }
  } catch (err) {
    throw new Error(`Invalid URL "${urlStr}": ${(err as Error).message}`);
  }
}

export async function run(params: MockupParams): Promise<MockupResult> {
  validateUrl(params.url);

  const widths = params.widths ?? [1440, 768, 375];
  if (!Array.isArray(widths) || widths.length !== 3) {
    throw new Error('widths must contain exactly three values: [desktop, tablet, mobile]');
  }

  await mkdir(params.output_dir, { recursive: true });

  const frameSet = await loadFrames(params.frame_set ?? 'default');
  const prefix = params.filename_prefix ?? slugifyHost(params.url);
  const writtenByThisRun: string[] = [];
  let sessionDir: string | null = null;

  try {
    const captured = await captureAll({
      url: params.url,
      widths: widths as [number, number, number],
      use_device_emulation: params.use_device_emulation ?? false,
      page_timeout_ms: params.page_timeout_ms ?? 30000,
      selector_timeout_ms: params.selector_timeout_ms ?? 10000,
      wait_for_timeout: params.wait_for_timeout ?? 300,
      elements_to_hide: params.elements_to_hide ?? [],
      wait_for_selector: params.wait_for_selector,
    });
    sessionDir = captured.sessionDir;

    const fit = params.fit_mode ?? 'top-crop';
    const breakpointResults: MockupBreakpointResult[] = [];
    const framedPaths: { desktop: string; tablet: string; mobile: string } = {
      desktop: '',
      tablet: '',
      mobile: '',
    };

    for (const cap of captured.breakpoints) {
      const frame = frameSet[cap.name];
      const buf = await frameImage(cap.path, frame, fit);
      const outPath = join(params.output_dir, `${prefix}-${cap.name}.png`);
      await writeFile(outPath, buf);
      writtenByThisRun.push(outPath);
      framedPaths[cap.name] = outPath;
      const sizeStat = await stat(outPath);
      breakpointResults.push({
        name: cap.name,
        width: cap.width,
        framed_dimensions: [frame.canvas.width, frame.canvas.height],
        file_size_bytes: sizeStat.size,
      });
    }

    let compositePath: string | null = null;
    if (params.composite) {
      const compositeBuf = await stitch(framedPaths, params.background ?? 'transparent');
      compositePath = join(params.output_dir, `${prefix}-composite.png`);
      await writeFile(compositePath, compositeBuf);
      writtenByThisRun.push(compositePath);
    }

    if (params.keep_raw) {
      const rawDir = join(params.output_dir, 'raw');
      await mkdir(rawDir, { recursive: true });
      for (const cap of captured.breakpoints) {
        const dest = join(rawDir, basename(cap.path));
        await copyFile(cap.path, dest);
        writtenByThisRun.push(dest);
      }
    }

    return {
      output_dir: params.output_dir,
      files: { ...framedPaths, composite: compositePath },
      breakpoints: breakpointResults,
    };
  } catch (err) {
    for (const p of writtenByThisRun) {
      await rm(p, { force: true });
    }
    throw err;
  } finally {
    if (sessionDir) {
      await rm(sessionDir, { recursive: true, force: true });
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/andrew/workspace/screenshot-mcp && npx vitest run tests/mockup/orchestrator.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git -C /home/andrew/workspace/screenshot-mcp add src/mockup/index.ts tests/mockup/orchestrator.test.ts
git -C /home/andrew/workspace/screenshot-mcp commit -m "feat: add mockup orchestrator with input validation and cleanup"
```

---

## Task 9: MCP tool registration

**Files:**
- Modify: `src/tools.ts`
- Modify: `src/handler.ts`

- [ ] **Step 1: Add the tool schema in src/tools.ts**

After the existing `generate_screenshot` entry inside the `tools` array, append a new entry:

```typescript
{
  name: 'generate_responsive_mockup',
  description:
    'Capture a URL at three responsive breakpoints (desktop, tablet, mobile) and composite ' +
    'each into a device frame mockup. Writes RGBA PNGs to output_dir; optionally produces a ' +
    'horizontal composite. Returns file paths and dimensions.',
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'URL to capture' },
      output_dir: { type: 'string', description: 'Absolute path to output directory' },
      filename_prefix: { type: 'string', description: 'Prefix for output filenames (default: hostname slug)' },
      widths: {
        type: 'array',
        items: { type: 'number' },
        minItems: 3,
        maxItems: 3,
        description: 'Exactly three viewport widths [desktop, tablet, mobile] (default: [1440, 768, 375])',
      },
      frame_set: { type: 'string', description: 'Frame set name from frames.json (default: "default")' },
      use_device_emulation: { type: 'boolean', description: 'Use Playwright device profiles (default: false)' },
      fit_mode: {
        type: 'string',
        enum: ['top-crop', 'full'],
        description: 'How to fit screenshot into frame (default: "top-crop")',
      },
      composite: { type: 'boolean', description: 'Also emit composite.png (default: false)' },
      background: { type: 'string', description: 'Composite background: "transparent" or "#rrggbb" (default: "transparent")' },
      keep_raw: { type: 'boolean', description: 'Copy raw screenshots to output_dir/raw/ (default: false)' },
      wait_for_selector: { type: 'string', description: 'Wait for CSS selector before capture' },
      wait_for_timeout: { type: 'number', description: 'Extra ms to wait after page load (default: 300)' },
      elements_to_hide: { type: 'array', items: { type: 'string' }, description: 'CSS selectors to hide before capture' },
      page_timeout_ms: { type: 'number', description: 'Page load timeout in ms (default: 30000)' },
      selector_timeout_ms: { type: 'number', description: 'wait_for_selector timeout in ms (default: 10000)' },
      retry_on_timeout: { type: 'boolean', description: 'Retry once with relaxed waitUntil on timeout (default: true)' },
    },
    required: ['url', 'output_dir'],
  },
},
```

- [ ] **Step 2: Add dispatch in src/handler.ts**

Add imports at the top:

```typescript
import { run as runMockup } from './mockup/index.js';
import type { MockupParams } from './types.js';
```

Inside the `switch (name)` block, add a new case before `default`:

```typescript
case 'generate_responsive_mockup': {
  if (!args?.url || !args?.output_dir) {
    return {
      isError: true,
      content: [{ type: 'text', text: 'Missing required parameters: url and output_dir' }],
    };
  }
  const params = args as unknown as MockupParams;
  const result = await runMockup(params);
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}
```

- [ ] **Step 3: Type-check**

```bash
cd /home/andrew/workspace/screenshot-mcp && npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 4: Build to confirm**

```bash
cd /home/andrew/workspace/screenshot-mcp && npm run build
```

Expected: build succeeds; `dist/mockup/index.js` exists.

- [ ] **Step 5: Commit**

```bash
git -C /home/andrew/workspace/screenshot-mcp add src/tools.ts src/handler.ts
git -C /home/andrew/workspace/screenshot-mcp commit -m "feat: register generate_responsive_mockup MCP tool"
```

---

## Task 10: CLI wrapper

**Files:**
- Create: `src/cli/mockup.ts`
- Create: `tests/cli/mockup.test.ts`

- [ ] **Step 1: Write failing test for CLI argv parsing**

Create `tests/cli/mockup.test.ts`:

```typescript
// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { describe, it, expect } from 'vitest';
import { parseArgs } from '../../src/cli/mockup.js';

describe('CLI parseArgs', () => {
  it('parses required and default options', () => {
    const opts = parseArgs(['https://example.com', '--out', '/tmp/x']);
    expect(opts.url).toBe('https://example.com');
    expect(opts.output_dir).toBe('/tmp/x');
    expect(opts.composite).toBeUndefined();
  });

  it('parses widths and fit and background and composite flag', () => {
    const opts = parseArgs([
      'https://example.com',
      '--out', '/tmp/x',
      '--widths', '1920,800,400',
      '--fit', 'full',
      '--background', '#ffffff',
      '--composite',
      '--hide', '.foo,.bar',
    ]);
    expect(opts.widths).toEqual([1920, 800, 400]);
    expect(opts.fit_mode).toBe('full');
    expect(opts.background).toBe('#ffffff');
    expect(opts.composite).toBe(true);
    expect(opts.elements_to_hide).toEqual(['.foo', '.bar']);
  });

  it('throws on missing --out', () => {
    expect(() => parseArgs(['https://example.com'])).toThrow(/--out/);
  });

  it('throws on missing url', () => {
    expect(() => parseArgs(['--out', '/tmp/x'])).toThrow(/url/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/andrew/workspace/screenshot-mcp && npx vitest run tests/cli/mockup.test.ts
```

Expected: FAIL — module `src/cli/mockup.js` not found.

- [ ] **Step 3: Implement CLI**

Create `src/cli/mockup.ts`:

```typescript
#!/usr/bin/env node
// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { run } from '../mockup/index.js';
import type { MockupParams, FitMode } from '../types.js';

const USAGE = `Usage: responsive-mockup <url> --out <dir> [options]

  --out <dir>                output directory (required)
  --prefix <str>             filename prefix (default: hostname slug)
  --widths <a,b,c>           comma-separated widths (default: 1440,768,375)
  --frame-set <name>         frame set (default: "default")
  --device-emulation         use Playwright device profiles
  --fit <mode>               top-crop | full (default: top-crop)
  --composite                also emit composite.png
  --background <color>       transparent | #rrggbb (default: transparent)
  --keep-raw                 keep raw screenshots in <out>/raw/
  --wait-for <selector>      wait for CSS selector before capture
  --wait-ms <n>              extra wait after load (default: 300)
  --hide <sel,sel,...>       hide elements before capture
  --version, --help`;

const VERSION = '1.1.0';

export function parseArgs(argv: string[]): MockupParams {
  const positional: string[] = [];
  const out: Partial<MockupParams> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`Missing value for ${a}`);
      return v;
    };
    switch (a) {
      case '--out': out.output_dir = next(); break;
      case '--prefix': out.filename_prefix = next(); break;
      case '--widths': {
        const parts = next().split(',').map((s) => parseInt(s, 10));
        if (parts.length !== 3 || parts.some(isNaN)) throw new Error('--widths must be three integers separated by commas');
        out.widths = [parts[0], parts[1], parts[2]];
        break;
      }
      case '--frame-set': out.frame_set = next(); break;
      case '--device-emulation': out.use_device_emulation = true; break;
      case '--fit': {
        const v = next();
        if (v !== 'top-crop' && v !== 'full') throw new Error(`--fit must be top-crop or full, got "${v}"`);
        out.fit_mode = v as FitMode;
        break;
      }
      case '--composite': out.composite = true; break;
      case '--background': out.background = next(); break;
      case '--keep-raw': out.keep_raw = true; break;
      case '--wait-for': out.wait_for_selector = next(); break;
      case '--wait-ms': out.wait_for_timeout = parseInt(next(), 10); break;
      case '--hide': out.elements_to_hide = next().split(','); break;
      default:
        if (a.startsWith('--')) throw new Error(`Unknown flag: ${a}`);
        positional.push(a);
    }
  }
  if (positional.length === 0) throw new Error('Missing required positional argument: url');
  if (positional.length > 1) throw new Error(`Unexpected extra arguments: ${positional.slice(1).join(' ')}`);
  if (!out.output_dir) throw new Error('Missing required flag: --out <dir>');
  out.url = positional[0];
  return out as MockupParams;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.length === 0) {
    console.log(USAGE);
    process.exit(0);
  }
  if (argv.includes('--version')) {
    console.log(VERSION);
    process.exit(0);
  }

  let opts: MockupParams;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    console.error((err as Error).message);
    console.error('');
    console.error(USAGE);
    process.exit(2);
  }

  try {
    const result = await run(opts);
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/andrew/workspace/screenshot-mcp && npx vitest run tests/cli/mockup.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Build and verify the bin shebang**

```bash
cd /home/andrew/workspace/screenshot-mcp && npm run build && head -1 dist/cli/mockup.js && ls -la dist/cli/mockup.js
```

Expected: first line `#!/usr/bin/env node`; file is executable (`-rwxr-xr-x`).

- [ ] **Step 6: Smoke-run --help**

```bash
cd /home/andrew/workspace/screenshot-mcp && node dist/cli/mockup.js --help
```

Expected: usage text printed, exit 0.

- [ ] **Step 7: Commit**

```bash
git -C /home/andrew/workspace/screenshot-mcp add src/cli/mockup.ts tests/cli/mockup.test.ts
git -C /home/andrew/workspace/screenshot-mcp commit -m "feat: add responsive-mockup CLI"
```

---

## Task 11: Generate frame assets

This task creates committed PNG frames programmatically. They are minimal (rounded rectangles around a transparent screen area) and can be replaced with polished assets later by overwriting the PNGs and updating `frames.json` — no code change needed.

**Files:**
- Create: `assets/frames/desktop.png`, `tablet.png`, `mobile.png`
- Create: `assets/frames/frames.json`
- Create: `scripts/generate-frames.mjs` (one-shot generator, kept for re-runs)

- [ ] **Step 1: Write the generator script**

Create `scripts/generate-frames.mjs`:

```javascript
// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.
// One-shot generator for placeholder device frame PNGs.

import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'frames');

async function generateFrame({ canvasW, canvasH, screenX, screenY, screenW, screenH, bezelColor, outFile }) {
  const radiusOuter = 18;
  const radiusInner = 6;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}">
  <defs>
    <mask id="m">
      <rect width="${canvasW}" height="${canvasH}" fill="white"/>
      <rect x="${screenX}" y="${screenY}" width="${screenW}" height="${screenH}" rx="${radiusInner}" ry="${radiusInner}" fill="black"/>
    </mask>
  </defs>
  <rect x="0" y="0" width="${canvasW}" height="${canvasH}" rx="${radiusOuter}" ry="${radiusOuter}" fill="${bezelColor}" mask="url(#m)"/>
</svg>
`;
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  await writeFile(outFile, buf);
}

async function main() {
  await mkdir(ROOT, { recursive: true });

  await generateFrame({
    canvasW: 1480, canvasH: 920,
    screenX: 40, screenY: 40, screenW: 1400, screenH: 800,
    bezelColor: '#1f1f1f',
    outFile: join(ROOT, 'desktop.png'),
  });
  await generateFrame({
    canvasW: 720, canvasH: 1000,
    screenX: 36, screenY: 80, screenW: 648, screenH: 840,
    bezelColor: '#2a2a2a',
    outFile: join(ROOT, 'tablet.png'),
  });
  await generateFrame({
    canvasW: 360, canvasH: 720,
    screenX: 20, screenY: 70, screenW: 320, screenH: 580,
    bezelColor: '#111111',
    outFile: join(ROOT, 'mobile.png'),
  });

  await writeFile(
    join(ROOT, 'frames.json'),
    JSON.stringify(
      {
        default: {
          desktop: { image: 'desktop.png', canvas: { width: 1480, height: 920 }, screen: { x: 40, y: 40, width: 1400, height: 800 } },
          tablet:  { image: 'tablet.png',  canvas: { width: 720,  height: 1000 }, screen: { x: 36, y: 80, width: 648, height: 840 } },
          mobile:  { image: 'mobile.png',  canvas: { width: 360,  height: 720 },  screen: { x: 20, y: 70, width: 320, height: 580 } },
        },
      },
      null,
      2,
    ) + '\n',
  );

  console.log('Frames generated in', ROOT);
}

main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Run the generator**

```bash
cd /home/andrew/workspace/screenshot-mcp && node scripts/generate-frames.mjs
```

Expected: `Frames generated in /home/andrew/workspace/screenshot-mcp/assets/frames`. Three PNGs and `frames.json` exist.

- [ ] **Step 3: Eyeball-verify frame dimensions**

```bash
cd /home/andrew/workspace/screenshot-mcp && node -e "import('sharp').then(async (s) => { for (const n of ['desktop','tablet','mobile']) { const m = await s.default('assets/frames/'+n+'.png').metadata(); console.log(n, m.width, m.height, m.channels); } })"
```

Expected: `desktop 1480 920 4`, `tablet 720 1000 4`, `mobile 360 720 4`.

- [ ] **Step 4: Commit assets and generator**

```bash
git -C /home/andrew/workspace/screenshot-mcp add assets/frames scripts/generate-frames.mjs
git -C /home/andrew/workspace/screenshot-mcp commit -m "feat: add placeholder device frame assets and generator script"
```

---

## Task 12: Integration test

Drives the orchestrator through a full real-Playwright capture against a static fixture served on localhost.

**Files:**
- Create: `tests/fixtures/index.html`
- Create: `tests/mockup/index.integration.test.ts`

- [ ] **Step 1: Create the static HTML fixture**

Create `tests/fixtures/index.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>mockup-fixture</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: linear-gradient(180deg, #4af 0%, #fff 60%); min-height: 1600px; }
    h1 { padding: 80px 40px 0; font-size: 64px; }
    p { padding: 0 40px; max-width: 800px; font-size: 24px; line-height: 1.4; }
  </style>
</head>
<body>
  <h1>Hello, mockup</h1>
  <p>A long enough static page that full-page capture has content to scroll through, useful for verifying that the framing pipeline works end-to-end.</p>
</body>
</html>
```

- [ ] **Step 2: Write the integration test**

Create `tests/mockup/index.integration.test.ts`:

```typescript
// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { readFile, mkdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { run } from '../../src/mockup/index.js';
import { closeBrowser } from '../../src/screenshot.js';

let server: Server;
let port: number;
let outDir: string;

beforeAll(async () => {
  const html = await readFile(join(process.cwd(), 'tests/fixtures/index.html'), 'utf8');
  server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(html);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  port = (server.address() as { port: number }).port;
  outDir = join(tmpdir(), `mockup-int-${Date.now()}`);
  await mkdir(outDir, { recursive: true });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await closeBrowser();
  await rm(outDir, { recursive: true, force: true });
});

describe('responsive mockup end-to-end', () => {
  it('produces three framed PNGs and a composite at expected dimensions', async () => {
    const result = await run({
      url: `http://127.0.0.1:${port}/`,
      output_dir: outDir,
      filename_prefix: 'fixture',
      composite: true,
      background: '#ffffff',
    });

    expect(result.files.desktop).toMatch(/fixture-desktop\.png$/);
    expect(result.files.tablet).toMatch(/fixture-tablet\.png$/);
    expect(result.files.mobile).toMatch(/fixture-mobile\.png$/);
    expect(result.files.composite).toMatch(/fixture-composite\.png$/);

    for (const f of [result.files.desktop, result.files.tablet, result.files.mobile, result.files.composite!]) {
      const s = await stat(f);
      expect(s.size).toBeGreaterThan(0);
    }

    expect(result.breakpoints[0].framed_dimensions).toEqual([1480, 920]);
    expect(result.breakpoints[1].framed_dimensions).toEqual([720, 1000]);
    expect(result.breakpoints[2].framed_dimensions).toEqual([360, 720]);
  }, 60000);
});
```

- [ ] **Step 3: Run the integration test**

```bash
cd /home/andrew/workspace/screenshot-mcp && npx vitest run tests/mockup/index.integration.test.ts
```

Expected: 1 test passes within 60 seconds. (First run may launch Chromium for the first time.)

- [ ] **Step 4: Run the full suite**

```bash
cd /home/andrew/workspace/screenshot-mcp && npm test
```

Expected: all tests pass (frames, frame, composite, capture, orchestrator, CLI parser, integration).

- [ ] **Step 5: Commit**

```bash
git -C /home/andrew/workspace/screenshot-mcp add tests/fixtures/index.html tests/mockup/index.integration.test.ts
git -C /home/andrew/workspace/screenshot-mcp commit -m "test: add end-to-end integration test against static fixture"
```

---

## Task 13: Production build verification

**Files:** none modified.

- [ ] **Step 1: Clean build**

```bash
cd /home/andrew/workspace/screenshot-mcp && npm run build
```

Expected: build succeeds; `dist/` repopulated.

- [ ] **Step 2: Verify dist contents**

```bash
ls /home/andrew/workspace/screenshot-mcp/dist/cli/mockup.js /home/andrew/workspace/screenshot-mcp/dist/mockup/index.js /home/andrew/workspace/screenshot-mcp/dist/mockup/frames.js /home/andrew/workspace/screenshot-mcp/dist/handler.js
```

Expected: all four files exist.

- [ ] **Step 3: Smoke-run the CLI from dist**

```bash
cd /home/andrew/workspace/screenshot-mcp && node dist/cli/mockup.js --help && node dist/cli/mockup.js --version
```

Expected: usage text, then `1.1.0`.

- [ ] **Step 4: Smoke-run the MCP server**

```bash
cd /home/andrew/workspace/screenshot-mcp && timeout 2 node dist/index.js < /dev/null; echo "exit=$?"
```

Expected: server prints `screenshot-mcp v1.0.0 running` (the constant in `index.ts` still reads 1.0.0; bumped in Task 14), then is killed by timeout (`exit=124`).

---

## Task 14: Bump version and update changelog

**Files:**
- Modify: `package.json` (already changed to add bin/scripts; this step bumps `version` to `1.1.0`)
- Modify: `src/index.ts` (`VERSION` constant)
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Bump package.json version**

Edit `package.json`: change `"version": "1.0.0"` to `"version": "1.1.0"`.

- [ ] **Step 2: Bump server VERSION constant**

Edit `src/index.ts`: change `const VERSION = '1.0.0';` to `const VERSION = '1.1.0';`.

- [ ] **Step 3: Update CHANGELOG**

Replace the `[Unreleased]` and `[1.0.0]` sections in `CHANGELOG.md` with:

```markdown
## [Unreleased]

## [1.1.0] - 2026-04-20

### Added
- generate_responsive_mockup MCP tool: capture URL at three breakpoints, composite each into a device frame, optional combined composite.
- responsive-mockup CLI: same feature wrapped for command-line use.
- Vitest test suite covering frames manifest loader, frame composition, composite stitching, capture orchestration, CLI argv parsing, and end-to-end integration against a static fixture.
- Programmatic placeholder device frame assets in assets/frames/ with a JSON manifest; replaceable without code changes.

## [1.0.0]

### Added
- Initial MCP server with generate_screenshot tool.
- Chromium-based full-page screenshots via Playwright.
- Configurable viewport, device scale factor, color scheme, element hiding, and selector/time waits.
- Browser singleton reuse across tool calls.
```

- [ ] **Step 4: Rebuild and re-run full suite**

```bash
cd /home/andrew/workspace/screenshot-mcp && npm run build && npm test
```

Expected: build OK, all tests pass.

- [ ] **Step 5: Commit and tag**

```bash
git -C /home/andrew/workspace/screenshot-mcp add package.json src/index.ts CHANGELOG.md
git -C /home/andrew/workspace/screenshot-mcp commit -m "v1.1.0 - Add generate_responsive_mockup MCP tool and responsive-mockup CLI"
git -C /home/andrew/workspace/screenshot-mcp tag v1.1.0
```

- [ ] **Step 6: Verify branch and tag state**

```bash
git -C /home/andrew/workspace/screenshot-mcp log --oneline -15 && git -C /home/andrew/workspace/screenshot-mcp tag --list
```

Expected: see all feature commits since branch start, plus `v1.1.0` tag.

---

## Task 15: Push and PR

- [ ] **Step 1: Push branch and tag to origin**

```bash
git -C /home/andrew/workspace/screenshot-mcp push -u origin feature/responsive-mockup && git -C /home/andrew/workspace/screenshot-mcp push origin v1.1.0
```

Expected: branch and tag uploaded to `84emllc/screenshot-mcp`.

- [ ] **Step 2: Open PR to main**

```bash
gh pr create --repo 84emllc/screenshot-mcp --base main --head feature/responsive-mockup --title "v1.1.0 - Add responsive mockup tool" --body "$(cat <<'EOF'
## Summary
- Adds generate_responsive_mockup MCP tool and responsive-mockup CLI
- Captures URL at three breakpoints (1440 / 768 / 375 px) and composites each into a device frame
- Optional horizontal composite of all three
- Programmatic placeholder frame assets that can be swapped without code changes
- Vitest suite covering manifest loader, frame composition, composite stitching, capture orchestration, CLI parsing, and end-to-end integration

## Test plan
- [ ] npm install
- [ ] npx playwright install chromium
- [ ] npm test (all green)
- [ ] npm run build (no errors)
- [ ] node dist/cli/mockup.js https://example.com --out /tmp/m --composite --background "#ffffff" (visual sanity check on outputs)
EOF
)"
```

Expected: PR URL printed.

- [ ] **Step 3: Merge after review**

User runs this when the PR is approved (per global rule, always use `gh pr merge` not the REST API):

```bash
gh pr merge --repo 84emllc/screenshot-mcp --merge --delete-branch <PR_NUMBER>
```

---

## Self-Review

**Spec coverage:**
- Goal/scope: Tasks 8 (orchestrator), 9 (MCP), 10 (CLI). ✓
- Module layout: Tasks 3, 4, 5, 6, 8, 10 create exactly the files in the spec. ✓
- Data flow (capture → frame → composite, top-crop default): Tasks 4, 5, 6, 8 implement; Task 12 verifies end-to-end. ✓
- Cropping policy (top-crop default, full mode): Task 4 test exercises both modes. ✓
- Tool & CLI interfaces: Tasks 9 and 10; option names match spec. ✓
- Frame manifest format: Tasks 3 and 11. ✓
- Browser rendering modes: `use_device_emulation` is plumbed through Tasks 6 and 9. The Playwright device-profile branch is wired but not exercised by an automated test (defensible: passthrough flag). ✓
- Error handling: tmpdir cleanup (Task 8 finally), output-file cleanup on failure (Task 8), URL validation (Task 8), output_dir writability (Task 8 mkdir), manifest validation (Task 3), page-timeout retry (Task 7). ✓
- Testing approach: covered (unit, integration, error paths). ✓
- Dependencies/packaging: Task 1 (deps), Task 13 (build), Task 14 (version + changelog). ✓
- Branch/PR workflow per global rules: Tasks 0, 14, 15. ✓

**Placeholder scan:** no "TBD/TODO/implement later" patterns in step bodies. The `bezelColor`, `radius*` values in Task 11's generator are concrete numbers. ✓

**Type consistency:**
- `FrameSet`, `FrameDef`, `FrameRect` defined in Task 2; used identically in Tasks 3, 4, 8. ✓
- `MockupParams` in Task 2 matches MCP schema in Task 9 and CLI parser in Task 10. ✓
- `captureAll` returns `{ breakpoints, sessionDir }` from Task 6 onward; used consistently in Tasks 7, 8. ✓
- CLI `parseArgs` field names map 1:1 to `MockupParams` properties. ✓

