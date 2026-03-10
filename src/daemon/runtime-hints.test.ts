import { describe, expect, it } from "vitest";
import { buildPlatformRuntimeLogHints, buildPlatformServiceStartHints } from "./runtime-hints.js";

describe("buildPlatformRuntimeLogHints", () => {
  it("renders launchd log hints on darwin", () => {
    expect(
      buildPlatformRuntimeLogHints({
        platform: "darwin",
        env: {
          IRONCLIW_STATE_DIR: "/tmp/ironcliw-state",
          IRONCLIW_LOG_PREFIX: "gateway",
        },
        systemdServiceName: "ironcliw-gateway",
        windowsTaskName: "IronCliw Gateway",
      }),
    ).toEqual([
      "Launchd stdout (if installed): /tmp/ironcliw-state/logs/gateway.log",
      "Launchd stderr (if installed): /tmp/ironcliw-state/logs/gateway.err.log",
    ]);
  });

  it("renders systemd and windows hints by platform", () => {
    expect(
      buildPlatformRuntimeLogHints({
        platform: "linux",
        systemdServiceName: "ironcliw-gateway",
        windowsTaskName: "IronCliw Gateway",
      }),
    ).toEqual(["Logs: journalctl --user -u ironcliw-gateway.service -n 200 --no-pager"]);
    expect(
      buildPlatformRuntimeLogHints({
        platform: "win32",
        systemdServiceName: "ironcliw-gateway",
        windowsTaskName: "IronCliw Gateway",
      }),
    ).toEqual(['Logs: schtasks /Query /TN "IronCliw Gateway" /V /FO LIST']);
  });
});

describe("buildPlatformServiceStartHints", () => {
  it("builds platform-specific service start hints", () => {
    expect(
      buildPlatformServiceStartHints({
        platform: "darwin",
        installCommand: "ironcliw gateway install",
        startCommand: "ironcliw gateway",
        launchAgentPlistPath: "~/Library/LaunchAgents/com.ironcliw.gateway.plist",
        systemdServiceName: "ironcliw-gateway",
        windowsTaskName: "IronCliw Gateway",
      }),
    ).toEqual([
      "ironcliw gateway install",
      "ironcliw gateway",
      "launchctl bootstrap gui/$UID ~/Library/LaunchAgents/com.ironcliw.gateway.plist",
    ]);
    expect(
      buildPlatformServiceStartHints({
        platform: "linux",
        installCommand: "ironcliw gateway install",
        startCommand: "ironcliw gateway",
        launchAgentPlistPath: "~/Library/LaunchAgents/com.ironcliw.gateway.plist",
        systemdServiceName: "ironcliw-gateway",
        windowsTaskName: "IronCliw Gateway",
      }),
    ).toEqual([
      "ironcliw gateway install",
      "ironcliw gateway",
      "systemctl --user start ironcliw-gateway.service",
    ]);
  });
});
