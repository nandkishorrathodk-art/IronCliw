/**
 * IronCliw Browser Smart Retry
 *
 * Provides resilient browser interaction helpers that automatically retry
 * on stale elements, navigation races, and transient network errors.
 *
 * Usage:
 *   import { retryClick, waitForNetworkIdle, autoScrollAndClick } from '../browser/smart-retry.js';
 */

import type { Page } from "playwright-core";

/* ─────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────── */

export interface RetryOptions {
  /** Max number of attempts. Default: 3 */
  maxRetries?: number;
  /** Wait between retries in ms. Default: 800 */
  delayMs?: number;
  /** Time to wait for element before failing. Default: 5000 */
  timeoutMs?: number;
}

/* ─────────────────────────────────────────────────────────────
   Network idle wait
   ───────────────────────────────────────────────────────────── */

/**
 * Wait for all XHR/fetch requests to finish, indicating the page has settled.
 * Much more reliable than `waitForLoadState('networkidle')` for SPAs.
 *
 * @example
 * await page.goto('https://example.com');
 * await waitForNetworkIdle(page);
 */
export async function waitForNetworkIdle(page: Page, timeoutMs = 5000): Promise<void> {
  await Promise.race([
    page.waitForLoadState("networkidle", { timeout: timeoutMs }),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

/* ─────────────────────────────────────────────────────────────
   Retry click — handles stale element references
   ───────────────────────────────────────────────────────────── */

/**
 * Click an element, automatically retrying if:
 * - Element is not found yet (retry with delay)
 * - Element is detached/stale (re-query and retry)
 * - Element is covered by an overlay (scroll into view first)
 *
 * @example
 * await retryClick(page, 'button[type="submit"]');
 */
export async function retryClick(
  page: Page,
  selector: string,
  opts: RetryOptions = {},
): Promise<void> {
  const maxRetries = opts.maxRetries ?? 3;
  const delayMs = opts.delayMs ?? 800;
  const timeoutMs = opts.timeoutMs ?? 5000;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Wait for element first
      await page.waitForSelector(selector, { timeout: timeoutMs, state: "attached" });
      // Scroll into view
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) {el.scrollIntoView({ block: "center", behavior: "smooth" });}
      }, selector);
      // Brief wait for scroll to settle
      await new Promise((r) => setTimeout(r, 150));
      // Attempt click
      await page.click(selector, { timeout: timeoutMs });
      return; // success
    } catch (err) {
      lastError = err as Error;
      const msg = lastError.message.toLowerCase();

      // Don't retry if element definitively doesn't exist
      if (msg.includes("strict mode violation") || msg.includes("no element matching")) {
        throw lastError;
      }

      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delayMs * attempt)); // exponential backoff
      }
    }
  }

  throw new Error(
    `retryClick: failed after ${maxRetries} attempts on "${selector}": ${lastError?.message}`,
  );
}

/* ─────────────────────────────────────────────────────────────
   Retry fill — resilient text input
   ───────────────────────────────────────────────────────────── */

/**
 * Fill an input field with retry logic.
 * Clears the field first, then types with realistic delay.
 *
 * @example
 * await retryFill(page, 'input[name="email"]', 'test@example.com');
 */
export async function retryFill(
  page: Page,
  selector: string,
  value: string,
  opts: RetryOptions = {},
): Promise<void> {
  const maxRetries = opts.maxRetries ?? 3;
  const delayMs = opts.delayMs ?? 500;
  const timeoutMs = opts.timeoutMs ?? 5000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await page.waitForSelector(selector, { timeout: timeoutMs, state: "visible" });
      await page.fill(selector, ""); // clear first
      await page.type(selector, value, { delay: 30 }); // human typing speed
      return;
    } catch (err) {
      if (attempt >= maxRetries) {throw err;}
      await new Promise((r) => setTimeout(r, delayMs * attempt));
    }
  }
}

/* ─────────────────────────────────────────────────────────────
   Auto scroll + click
   ───────────────────────────────────────────────────────────── */

/**
 * Scroll the page until `selector` is visible, then click it.
 * Useful for elements below the fold that reveal dynamically.
 *
 * @example
 * await autoScrollAndClick(page, '.load-more-button');
 */
export async function autoScrollAndClick(
  page: Page,
  selector: string,
  opts: RetryOptions = {},
): Promise<void> {
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    // Try to find the element
    const visible = await page.isVisible(selector).catch(() => false);
    if (visible) {
      await retryClick(page, selector, opts);
      return;
    }
    // Scroll down a bit
    await page.evaluate(() => {
      window.scrollBy({ top: 300, behavior: "smooth" });
    });
    await new Promise((r) => setTimeout(r, 400));
  }

  throw new Error(`autoScrollAndClick: "${selector}" not found after ${timeoutMs}ms`);
}

/* ─────────────────────────────────────────────────────────────
   Wait for URL change
   ───────────────────────────────────────────────────────────── */

/**
 * Wait until the page URL changes from `fromUrl`.
 * Useful to detect redirects after form submissions.
 *
 * @example
 * const prevUrl = page.url();
 * await page.click('button[type="submit"]');
 * await waitForNavigation(page, prevUrl);
 */
export async function waitForNavigation(
  page: Page,
  fromUrl: string,
  timeoutMs = 10_000,
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const current = page.url();
    if (current !== fromUrl) {return current;}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`waitForNavigation: URL did not change from "${fromUrl}" within ${timeoutMs}ms`);
}

/* ─────────────────────────────────────────────────────────────
   Smart screenshot with auto-retry on blank frames
   ───────────────────────────────────────────────────────────── */

/**
 * Take a screenshot, retrying if the page appears blank or loading.
 * Returns the screenshot buffer.
 *
 * @example
 * const img = await smartScreenshot(page);
 */
export async function smartScreenshot(
  page: Page,
  opts: { maxRetries?: number; delayMs?: number } = {},
): Promise<Buffer> {
  const maxRetries = opts.maxRetries ?? 3;
  const delayMs = opts.delayMs ?? 600;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    await waitForNetworkIdle(page, 3000);
    const buf = await page.screenshot({ type: "jpeg", quality: 90, fullPage: false });

    // Heuristic: if screenshot is < 2KB, page is probably blank/loading
    if (buf.byteLength > 2048 || attempt >= maxRetries) {
      return buf as unknown as Buffer;
    }
    await new Promise((r) => setTimeout(r, delayMs * attempt));
  }

  return await (page.screenshot({ type: "jpeg", quality: 90 }) as unknown as Promise<Buffer>);
}

/* ─────────────────────────────────────────────────────────────
   Cookie/session persistence
   ───────────────────────────────────────────────────────────── */

import { readFileSync, writeFileSync, existsSync } from "node:fs";

/**
 * Save current browser cookies to a JSON file for session persistence.
 *
 * @example
 * await saveCookies(page, './sessions/github-cookies.json');
 */
export async function saveCookies(page: Page, filePath: string): Promise<void> {
  const cookies = await page.context().cookies();
  writeFileSync(filePath, JSON.stringify(cookies, null, 2), "utf-8");
}

/**
 * Load cookies from a JSON file and inject them into the browser session.
 *
 * @example
 * await loadCookies(page, './sessions/github-cookies.json');
 * await page.goto('https://github.com'); // will be logged in
 */
export async function loadCookies(page: Page, filePath: string): Promise<boolean> {
  if (!existsSync(filePath)) {return false;}
  try {
    const cookies = JSON.parse(readFileSync(filePath, "utf-8")) as Parameters<
      ReturnType<Page["context"]>["addCookies"]
    >[0];
    await page.context().addCookies(cookies);
    return true;
  } catch {
    return false;
  }
}
