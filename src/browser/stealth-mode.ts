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
  /** Override User-Agent. Default: realistic Chrome 122 on Windows UA */
  userAgent?: string;
  /** Add human-like mouse jitter before clicks. Default: true */
  mouseJitter?: boolean;
  /** Spoof language/platform/plugins. Default: true */
  spoofNavigator?: boolean;
  /** Add random network-level latency simulation. Default: false */
  simulateNetworkLatency?: boolean;
}

/* ─────────────────────────────────────────────────────────────
   Realistic User Agents (Windows / Chrome)
   ───────────────────────────────────────────────────────────── */

const REALISTIC_USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
  "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
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
   Core stealth patches — injected as page scripts
   ───────────────────────────────────────────────────────────── */

const STEALTH_SCRIPTS = {
  /** Remove navigator.webdriver flag — the #1 bot detection signal */
  removeWebdriver: `
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
      configurable: true,
    });
  `,

  /** Fake Chrome runtime object (headless Chrome lacks it) */
  fakeChrome: `
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
  `,

  /** Fake realistic plugin list (headless has none → huge red flag) */
  fakePlugins: `
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
  `,

  /** Override permissions API to return natural granted states */
  fakePermissions: `
    const origQuery = window.navigator.permissions?.query?.bind(navigator.permissions);
    if (origQuery) {
      navigator.permissions.query = (parameters) => {
        if (parameters.name === 'notifications') {
          return Promise.resolve({ state: Notification.permission });
        }
        return origQuery(parameters);
      };
    }
  `,

  /** Spoof hardware concurrency to look like a real machine */
  fakeHardware: `
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
    Object.defineProperty(navigator, 'language', { get: () => 'en-US' });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  `,

  /** Add slight noise to Canvas readback to break fingerprinting */
  canvasNoise: `
    const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function(x, y, w, h) {
      const imageData = origGetImageData.apply(this, [x, y, w, h]);
      for (let i = 0; i < imageData.data.length; i += 4) {
        // Add tiny invisible noise to the last bit of color channels
        imageData.data[i] = imageData.data[i] ^ (Math.random() > 0.5 ? 1 : 0);
      }
      return imageData;
    };
  `,

  /** Spoof WebGL vendor and renderer */
  webglSpoof: `
    const origGetParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      // UNMASKED_VENDOR_WEBGL
      if (parameter === 37445) return 'Google Inc. (NVIDIA)';
      // UNMASKED_RENDERER_WEBGL
      if (parameter === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 Direct3D11 vs_5_0 ps_5_0, D3D11)';
      return origGetParameter.apply(this, [parameter]);
    };
  `,
} as const;

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

  // Target: center of element with small random offset
  const targetX = box.x + box.width / 2 + randInt(-3, 3);
  const targetY = box.y + box.height / 2 + randInt(-3, 3);

  // Start from a random position near the element
  const startX = targetX + randInt(-80, 80);
  const startY = targetY + randInt(-60, 60);

  await page.mouse.move(startX, startY);

  // Move in small steps with slight randomness (bezier-like curve simulation)
  const steps = randInt(8, 15);
  for (let i = 1; i <= steps; i++) {
    const ratio = i / steps;
    const jitter = (1 - ratio) * randInt(-5, 5);
    await page.mouse.move(
      startX + (targetX - startX) * ratio + jitter,
      startY + (targetY - startY) * ratio + jitter,
    );
    // Variable delay between steps: 10–30ms
    await new Promise((r) => setTimeout(r, randInt(10, 30)));
  }

  // Small pause before the actual click (human hesitation)
  await new Promise((r) => setTimeout(r, randInt(50, 150)));
  await page.mouse.click(targetX, targetY);
}

/* ─────────────────────────────────────────────────────────────
   Public API
   ───────────────────────────────────────────────────────────── */

/**
 * Apply stealth patches to a Playwright page.
 *
 * Call this immediately after opening/creating a page, before any navigation.
 *
 * @example
 * const page = await context.newPage();
 * await applyStealthPatch(page);
 * await page.goto('https://bot.sannysoft.com');
 */
export async function applyStealthPatch(
  page: Page,
  opts: StealthPatchOptions = {},
): Promise<void> {
  const {
    randomizeViewport = true,
    userAgent,
    spoofNavigator = true,
    simulateNetworkLatency = false,
  } = opts;

  // 1. Set realistic viewport
  if (randomizeViewport) {
    const vp = pickRandom(HUMAN_VIEWPORTS);
    await page.setViewportSize({
      width: vp.width + randInt(-10, 10),
      height: vp.height + randInt(-5, 5),
    });
  }

  // 2. Set User-Agent
  const ua = userAgent ?? pickRandom(REALISTIC_USER_AGENTS);
  await page.setExtraHTTPHeaders({ "User-Agent": ua });

  // 3. Inject all stealth scripts via addInitScript (runs before page JS)
  if (spoofNavigator) {
    await page.addInitScript(STEALTH_SCRIPTS.removeWebdriver);
    await page.addInitScript(STEALTH_SCRIPTS.fakeChrome);
    await page.addInitScript(STEALTH_SCRIPTS.fakePlugins);
    await page.addInitScript(STEALTH_SCRIPTS.fakePermissions);
    await page.addInitScript(STEALTH_SCRIPTS.fakeHardware);
    await page.addInitScript(STEALTH_SCRIPTS.canvasNoise);
    await page.addInitScript(STEALTH_SCRIPTS.webglSpoof);
  } else {
    // Always remove webdriver even if spoofNavigator is off
    await page.addInitScript(STEALTH_SCRIPTS.removeWebdriver);
  }

  // 4. Optional: simulate realistic network RTT
  if (simulateNetworkLatency) {
    // Add 20–80ms extra latency to each request to mimic real browsing
    await page.route("**/*", async (route) => {
      await new Promise((r) => setTimeout(r, randInt(20, 80)));
      await route.continue();
    });
  }
}

/**
 * Quick check: navigate to a test page and verify stealth is working.
 * Returns true if webdriver flag is hidden.
 */
export async function verifyStealthMode(page: Page): Promise<boolean> {
  const webdriver = await page.evaluate(() => (navigator as Navigator & { webdriver?: boolean }).webdriver);
  return webdriver === undefined || ! webdriver;
}
