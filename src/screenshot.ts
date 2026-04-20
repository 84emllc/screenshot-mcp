// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { chromium, type Browser, type BrowserContext } from 'playwright';
import { stat, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ScreenshotParams, ScreenshotResult } from './types.js';

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser && browser.isConnected()) {
    await browser.close();
    browser = null;
  }
}

export async function takeScreenshot(params: ScreenshotParams): Promise<ScreenshotResult> {
  const width = params.viewport_width ?? 1200;
  const height = params.viewport_height ?? 630;
  const scaleFactor = params.device_scale_factor ?? 1;
  const colorScheme = params.color_scheme ?? 'no-preference';
  const elementsToHide = params.elements_to_hide ?? [];
  const waitTimeout = params.wait_for_timeout ?? 300;
  const fullPage = params.full_page ?? false;

  const b = await getBrowser();

  let context: BrowserContext | null = null;
  try {
    context = await b.newContext({
      viewport: { width, height },
      deviceScaleFactor: scaleFactor,
      colorScheme,
    });

    const page = await context.newPage();

    await page.goto(params.url, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for fonts to finish loading
    await page.evaluate(() => document.fonts.ready);

    // Wait for a specific selector if requested
    if (params.wait_for_selector) {
      await page.waitForSelector(params.wait_for_selector, { timeout: 10000 });
    }

    // Hide elements
    if (elementsToHide.length > 0) {
      await page.evaluate((selectors: string[]) => {
        for (const sel of selectors) {
          const els = document.querySelectorAll(sel);
          for (const el of els) {
            (el as HTMLElement).style.display = 'none';
          }
        }
      }, elementsToHide);
    }

    // Extra wait for final paint
    if (waitTimeout > 0) {
      await page.waitForTimeout(waitTimeout);
    }

    // Ensure output directory exists
    await mkdir(dirname(params.output_path), { recursive: true });

    await page.screenshot({
      path: params.output_path,
      type: 'png',
      fullPage,
      omitBackground: false,
    });

    await page.close();

    const fileStat = await stat(params.output_path);

    return {
      file_path: params.output_path,
      width: fullPage ? width : width * scaleFactor,
      height: fullPage ? -1 : height * scaleFactor,
      file_size_bytes: fileStat.size,
      format: 'png',
    };
  } finally {
    if (context) {
      await context.close();
    }
  }
}
