import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findExtraGatewayServices } from "./inspect.js";

const { execSchtasksMock } = vi.hoisted(() => ({
  execSchtasksMock: vi.fn(),
}));

vi.mock("./schtasks-exec.js", () => ({
  execSchtasks: (...args: unknown[]) => execSchtasksMock(...args),
}));

describe("findExtraGatewayServices (win32)", () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    Object.defineProperty(process, "platform", {
      configurable: true,
      value: "win32",
    });
    execSchtasksMock.mockReset();
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      configurable: true,
      value: originalPlatform,
    });
  });

  it("skips schtasks queries unless deep mode is enabled", async () => {
    const result = await findExtraGatewayServices({});
    expect(result).toEqual([]);
    expect(execSchtasksMock).not.toHaveBeenCalled();
  });

  it("returns empty results when schtasks query fails", async () => {
    execSchtasksMock.mockResolvedValueOnce({
      code: 1,
      stdout: "",
      stderr: "error",
    });

    const result = await findExtraGatewayServices({}, { deep: true });
    expect(result).toEqual([]);
  });

  it("collects only non-Ironcliw marker tasks from schtasks output", async () => {
    execSchtasksMock.mockResolvedValueOnce({
      code: 0,
      stdout: [
        "TaskName: Ironcliw Gateway",
        "Task To Run: C:\\Program Files\\Ironcliw\\Ironcliw.exe gateway run",
        "",
        "TaskName: Ironcliw Legacy",
        "Task To Run: C:\\Ironcliw\\Ironcliw.exe run",
        "",
        "TaskName: Other Task",
        "Task To Run: C:\\tools\\helper.exe",
        "",
        "TaskName: Ironcliw Legacy",
        "Task To Run: C:\\Ironcliw\\Ironcliw.exe run",
        "",
      ].join("\n"),
      stderr: "",
    });

    const result = await findExtraGatewayServices({}, { deep: true });
    expect(result).toEqual([
      {
        platform: "win32",
        label: "Ironcliw Legacy",
        detail: "task: Ironcliw Legacy, run: C:\\Ironcliw\\Ironcliw.exe run",
        scope: "system",
        marker: "Ironcliw",
        legacy: true,
      },
      {
        platform: "win32",
        label: "Ironcliw Legacy",
        detail: "task: Ironcliw Legacy, run: C:\\Ironcliw\\Ironcliw.exe run",
        scope: "system",
        marker: "Ironcliw",
        legacy: true,
      },
    ]);
  });
});

