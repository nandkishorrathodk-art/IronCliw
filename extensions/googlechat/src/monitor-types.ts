import type { IroncliwConfig } from "Ironcliw/plugin-sdk";
import type { ResolvedGoogleChatAccount } from "./accounts.js";
import type { GoogleChatAudienceType } from "./auth.js";
import { getGoogleChatRuntime } from "./runtime.js";

export type GoogleChatRuntimeEnv = {
  log?: (message: string) => void;
  error?: (message: string) => void;
};

export type GoogleChatMonitorOptions = {
  account: ResolvedGoogleChatAccount;
  config: IroncliwConfig;
  runtime: GoogleChatRuntimeEnv;
  abortSignal: AbortSignal;
  webhookPath?: string;
  webhookUrl?: string;
  statusSink?: (patch: { lastInboundAt?: number; lastOutboundAt?: number }) => void;
};

export type GoogleChatCoreRuntime = ReturnType<typeof getGoogleChatRuntime>;

export type WebhookTarget = {
  account: ResolvedGoogleChatAccount;
  config: IroncliwConfig;
  runtime: GoogleChatRuntimeEnv;
  core: GoogleChatCoreRuntime;
  path: string;
  audienceType?: GoogleChatAudienceType;
  audience?: string;
  statusSink?: (patch: { lastInboundAt?: number; lastOutboundAt?: number }) => void;
  mediaMaxMb: number;
};

