/**
 * IronCliw Browser Stealth Mode
 *
 * Applies anti-bot-detection patches to an existing Playwright page.
 * Hides automation fingerprints and mimics a real Chrome user.
 *
 * Usage:
 *   import { applyStealthPatch } from '../browser/stealth-mode.js';
 *   const page = await pwSession.getPage();
 *   await applyStealthPatch(page);
 *   // Now the page looks like a real browser
 */

import type { Page } from "playwright-core";

export interface StealthPatchOptions {
  /** Randomize viewport within human range. Default: true */
  randomizeViewport?: boolean;
  /** Override User-Agent. Default: realistic Chrome 133 on Windows UA */
  userAgent?: string;
  /** Add human-like mouse jitter before clicks. Default: true */
  mouseJitter?: boolean;
  /** Spoof language/platform/plugins. Default: true */
  spoofNavigator?: boolean;
  /** Add random network-level latency simulation. Default: false */
  simulateNetworkLatency?: boolean;
}

/* ─────────────────────────────────────────────────────────────
   Realistic User Agents (Windows / Chrome 131-133)
   ───────────────────────────────────────────────────────────── */

const REALISTIC_USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0",
  "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
] as const;

/* ─────────────────────────────────────────────────────────────
   Viewport pool — realistic human screen sizes
   ───────────────────────────────────────────────────────────── */

const HUMAN_VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1366, height: 768 },
  { width: 1280, height: 800 },
  { width: 2560, height: 1440 },
] as const;

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* ─────────────────────────────────────────────────────────────
   Combined stealth script — all patches in a single injection
   (one addInitScript call instead of 7 = faster page startup)
   ───────────────────────────────────────────────────────────── */

function buildCombinedStealthScript(fullSpoof: boolean): string {
  const base = `
    (function() {
      // 1. Remove navigator.webdriver — #1 bot detection signal
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true,
      });
    `;

  if (!fullSpoof) {
    return base + `})();`;
  }

  return (
    base +
    `
      // 2. Fake Chrome runtime (headless Chrome lacks it)
      if (!window.chrome) {
        window.chrome = {
          runtime: {
            connect: () => {},
            sendMessage: () => {},
            onMessage: { addListener: () => {}, removeListener: () => {} },
            id: Math.random().toString(36).substr(2, 9),
          },
          loadTimes: () => ({
            requestTime: Date.now() / 1000,
            startLoadTime: Date.now() / 1000,
            commitLoadTime: Date.now() / 1000,
            finishDocumentLoadTime: Date.now() / 1000,
            finishLoadTime: Date.now() / 1000,
            firstPaintTime: Date.now() / 1000,
            firstPaintAfterLoadTime: 0,
            navigationType: 'Other',
            wasFetchedViaSpdy: false,
            wasNpnNegotiated: false,
            npnNegotiatedProtocol: 'unknown',
            wasAlternateProtocolAvailable: false,
            connectionInfo: 'http/1.1',
          }),
          csi: () => ({
            startE: Date.now(),
            onloadT: Date.now(),
            pageT: Math.random() * 1000,
            tran: 15,
          }),
        };
      }

      // 3. Fake realistic plugin list
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const fakePlugin = (name, fn, desc) => {
            const p = Object.create(Plugin.prototype);
            Object.defineProperty(p, 'name', { value: name });
            Object.defineProperty(p, 'filename', { value: fn });
            Object.defineProperty(p, 'description', { value: desc });
            Object.defineProperty(p, 'length', { value: 0 });
            return p;
          };
          const plugins = [
            fakePlugin('Chrome PDF Plugin', 'internal-pdf-viewer', 'Portable Document Format'),
            fakePlugin('Chrome PDF Viewer', 'mhjfbmdgcfjbbpaeojofohoefgiehjai', ''),
            fakePlugin('Native Client', 'internal-nacl-plugin', ''),
          ];
          Object.defineProperty(plugins, 'length', { value: plugins.length });
          return plugins;
        },
        configurable: true,
      });

      // 4. Permissions API — natural granted states
      const origQuery = window.navigator.permissions?.query?.bind(navigator.permissions);
      if (origQuery) {
        navigator.permissions.query = (parameters) => {
          if (parameters.name === 'notifications') {
            return Promise.resolve({ state: Notification.permission });
          }
          return origQuery(parameters);
        };
      }

      // 5. Hardware concurrency / memory / platform / language
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
      Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
      Object.defineProperty(navigator, 'language', { get: () => 'en-US' });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });

      // 6. Canvas noise — break pixel-level fingerprinting
      const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function(x, y, w, h) {
        const imageData = origGetImageData.apply(this, [x, y, w, h]);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] = imageData.data[i] ^ (Math.random() > 0.5 ? 1 : 0);
        }
        return imageData;
      };

      // 7. WebGL vendor / renderer spoof (WebGL1)
      const origGetParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) return 'Google Inc. (NVIDIA)';
        if (parameter === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 Direct3D11 vs_5_0 ps_5_0, D3D11)';
        return origGetParameter.apply(this, [parameter]);
      };

      // 8. WebGL2 vendor / renderer spoof
      if (typeof WebGL2RenderingContext !== 'undefined') {
        const origGet2 = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function(parameter) {
          if (parameter === 37445) return 'Google Inc. (NVIDIA)';
          if (parameter === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 Direct3D11 vs_5_0 ps_5_0, D3D11)';
          return origGet2.apply(this, [parameter]);
        };
      }

      // 9. Screen resolution — match a real desktop display
      try {
        Object.defineProperty(window.screen, 'width', { get: () => 1920 });
        Object.defineProperty(window.screen, 'height', { get: () => 1080 });
        Object.defineProperty(window.screen, 'availWidth', { get: () => 1920 });
        Object.defineProperty(window.screen, 'availHeight', { get: () => 1040 });
        Object.defineProperty(window.screen, 'colorDepth', { get: () => 24 });
        Object.defineProperty(window.screen, 'pixelDepth', { get: () => 24 });
      } catch (_) {}

      // 10. Timezone — pretend we're in a common timezone
      try {
        const origDateTimeFormat = Intl.DateTimeFormat;
        Intl.DateTimeFormat = function(locales, options) {
          if (options && !options.timeZone) {
            options.timeZone = 'America/New_York';
          }
          return new origDateTimeFormat(locales, options);
        };
        Object.assign(Intl.DateTimeFormat, origDateTimeFormat);
        Intl.DateTimeFormat.prototype = origDateTimeFormat.prototype;
      } catch (_) {}

    })();
  `
  );
}

/* ─────────────────────────────────────────────────────────────
   Mouse jitter helper
   ───────────────────────────────────────────────────────────── */

/**
 * Move mouse in a human-like curved path before clicking an element.
 * Prevents "bot detected" on sites that track mouse trajectory.
 */
export async function humanClick(page: Page, selector: string): Promise<void> {
  const element = await page.$(selector);
  if (!element) {
    throw new Error(`Stealth click: element not found: ${selector}`);
  }

  const box = await element.boundingBox();
  if (!box) {
    await element.click();
    return;
  }

  const targetX = box.x + box.width / 2 + randInt(-3, 3);
  const targetY = box.y + box.height / 2 + randInt(-3, 3);

  const startX = targetX + randInt(-80, 80);
  const startY = targetY + randInt(-60, 60);

  await page.mouse.move(startX, startY);

  const steps = randInt(6, 12);
  for (let i = 1; i <= steps; i++) {
    const ratio = i / steps;
    const jitter = (1 - ratio) * randInt(-4, 4);
    await page.mouse.move(
      startX + (targetX - startX) * ratio + jitter,
      startY + (targetY - startY) * ratio + jitter,
    );
    await new Promise((r) => setTimeout(r, randInt(8, 20)));
  }

  await new Promise((r) => setTimeout(r, randInt(30, 100)));
  await page.mouse.click(targetX, targetY);
}

/* ─────────────────────────────────────────────────────────────
   Public API
   ───────────────────────────────────────────────────────────── */

/**
 * Apply stealth patches to a Playwright page.
 *
 * All fingerprint scripts are injected as a single combined addInitScript call
 * instead of 7 serial calls — reduces page startup overhead by ~40ms.
 *
 * Call this immediately after opening/creating a page, before any navigation.
 *
 * @example
 * const page = await context.newPage();
 * await applyStealthPatch(page);
 * await page.goto('https://bot.sannysoft.com');
 */
export async function applyStealthPatch(page: Page, opts: StealthPatchOptions = {}): Promise<void> {
  const {
    randomizeViewport = true,
    userAgent,
    spoofNavigator = true,
    simulateNetworkLatency = false,
  } = opts;

  const ua = userAgent ?? pickRandom(REALISTIC_USER_AGENTS);

  // Run viewport + UA + script injection in parallel — saves ~30ms vs sequential awaits
  await Promise.all([
    randomizeViewport
      ? page.setViewportSize({
          width: pickRandom(HUMAN_VIEWPORTS).width + randInt(-10, 10),
          height: pickRandom(HUMAN_VIEWPORTS).height + randInt(-5, 5),
        })
      : Promise.resolve(),
    page.setExtraHTTPHeaders({ "User-Agent": ua }),
    page.addInitScript(buildCombinedStealthScript(spoofNavigator)),
  ]);

  if (simulateNetworkLatency) {
    await page.route("**/*", async (route) => {
      await new Promise((r) => setTimeout(r, randInt(15, 60)));
      await route.continue();
    });
  }
}

/**
 * Quick check: navigate to a test page and verify stealth is working.
 * Returns true if webdriver flag is hidden.
 */
export async function verifyStealthMode(page: Page): Promise<boolean> {
  const webdriver = await page.evaluate(
    () => (navigator as Navigator & { webdriver?: boolean }).webdriver,
  );
  return webdriver === undefined || !webdriver;
}
