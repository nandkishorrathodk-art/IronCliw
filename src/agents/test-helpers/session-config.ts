import type { IroncliwConfig } from "../../config/config.js";

export function createPerSenderSessionConfig(
  overrides: Partial<NonNullable<IroncliwConfig["session"]>> = {},
): NonNullable<IroncliwConfig["session"]> {
  return {
    mainKey: "main",
    scope: "per-sender",
    ...overrides,
  };
}

