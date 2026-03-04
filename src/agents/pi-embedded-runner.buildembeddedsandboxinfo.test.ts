import { describe, expect, it } from "vitest";
import { buildEmbeddedSandboxInfo } from "./pi-embedded-runner.js";
import type { SandboxContext } from "./sandbox.js";

function createSandboxContext(overrides?: Partial<SandboxContext>): SandboxContext {
  const base = {
    enabled: true,
    sessionKey: "session:test",
    workspaceDir: "/tmp/Ironcliw-sandbox",
    agentWorkspaceDir: "/tmp/Ironcliw-workspace",
    workspaceAccess: "none",
    containerName: "Ironcliw-sbx-test",
    containerWorkdir: "/workspace",
    docker: {
      image: "Ironcliw-sandbox:bookworm-slim",
      containerPrefix: "Ironcliw-sbx-",
      workdir: "/workspace",
      readOnlyRoot: true,
      tmpfs: ["/tmp"],
      network: "none",
      user: "1000:1000",
      capDrop: ["ALL"],
      env: { LANG: "C.UTF-8" },
    },
    tools: {
      allow: ["exec"],
      deny: ["browser"],
    },
    browserAllowHostControl: true,
    browser: {
      bridgeUrl: "http://localhost:9222",
      noVncUrl: "http://localhost:6080",
      containerName: "Ironcliw-sbx-browser-test",
    },
  } satisfies SandboxContext;
  return { ...base, ...overrides };
}

describe("buildEmbeddedSandboxInfo", () => {
  it("returns undefined when sandbox is missing", () => {
    expect(buildEmbeddedSandboxInfo()).toBeUndefined();
  });

  it("maps sandbox context into prompt info", () => {
    const sandbox = createSandboxContext();

    expect(buildEmbeddedSandboxInfo(sandbox)).toEqual({
      enabled: true,
      workspaceDir: "/tmp/Ironcliw-sandbox",
      containerWorkspaceDir: "/workspace",
      workspaceAccess: "none",
      agentWorkspaceMount: undefined,
      browserBridgeUrl: "http://localhost:9222",
      browserNoVncUrl: "http://localhost:6080",
      hostBrowserAllowed: true,
    });
  });

  it("includes elevated info when allowed", () => {
    const sandbox = createSandboxContext({
      browserAllowHostControl: false,
      browser: undefined,
    });

    expect(
      buildEmbeddedSandboxInfo(sandbox, {
        enabled: true,
        allowed: true,
        defaultLevel: "on",
      }),
    ).toEqual({
      enabled: true,
      workspaceDir: "/tmp/Ironcliw-sandbox",
      containerWorkspaceDir: "/workspace",
      workspaceAccess: "none",
      agentWorkspaceMount: undefined,
      hostBrowserAllowed: false,
      elevated: { allowed: true, defaultLevel: "on" },
    });
  });
});

