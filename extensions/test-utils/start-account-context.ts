import type {
  ChannelAccountSnapshot,
  ChannelGatewayContext,
  IroncliwConfig,
} from "Ironcliw/plugin-sdk";
import { vi } from "vitest";
import { createRuntimeEnv } from "./runtime-env.js";

export function createStartAccountContext<TAccount extends { accountId: string }>(params: {
  account: TAccount;
  abortSignal: AbortSignal;
  statusPatchSink?: (next: ChannelAccountSnapshot) => void;
}): ChannelGatewayContext<TAccount> {
  const snapshot: ChannelAccountSnapshot = {
    accountId: params.account.accountId,
    configured: true,
    enabled: true,
    running: false,
  };
  return {
    accountId: params.account.accountId,
    account: params.account,
    cfg: {} as IroncliwConfig,
    runtime: createRuntimeEnv(),
    abortSignal: params.abortSignal,
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    getStatus: () => snapshot,
    setStatus: (next) => {
      Object.assign(snapshot, next);
      params.statusPatchSink?.(snapshot);
    },
  };
}

