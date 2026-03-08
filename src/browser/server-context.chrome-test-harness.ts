import { vi } from "vitest";
import { installChromeUserDataDirHooks } from "./chrome-user-data-dir.test-harness.js";

const chromeUserDataDir = { dir: "/tmp/IronCliw" };
installChromeUserDataDirHooks(chromeUserDataDir);

vi.mock("./chrome.js", () => ({
  isChromeCdpReady: vi.fn(async () => true),
  isChromeReachable: vi.fn(async () => true),
  launchIronCliwChrome: vi.fn(async () => {
    throw new Error("unexpected launch");
  }),
  resolveIronCliwUserDataDir: vi.fn(() => chromeUserDataDir.dir),
  stopIronCliwChrome: vi.fn(async () => {}),
}));
