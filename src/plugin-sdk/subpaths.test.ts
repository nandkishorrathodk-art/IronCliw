import * as compatSdk from "IronCliw/plugin-sdk/compat";
import * as discordSdk from "IronCliw/plugin-sdk/discord";
import * as imessageSdk from "IronCliw/plugin-sdk/imessage";
import * as lineSdk from "IronCliw/plugin-sdk/line";
import * as msteamsSdk from "IronCliw/plugin-sdk/msteams";
import * as signalSdk from "IronCliw/plugin-sdk/signal";
import * as slackSdk from "IronCliw/plugin-sdk/slack";
import * as whatsappSdk from "IronCliw/plugin-sdk/whatsapp";
import { describe, expect, it } from "vitest";

const bundledExtensionSubpathLoaders = [
  { id: "acpx", load: () => import("IronCliw/plugin-sdk/acpx") },
  { id: "bluebubbles", load: () => import("IronCliw/plugin-sdk/bluebubbles") },
  { id: "copilot-proxy", load: () => import("IronCliw/plugin-sdk/copilot-proxy") },
  { id: "device-pair", load: () => import("IronCliw/plugin-sdk/device-pair") },
  { id: "diagnostics-otel", load: () => import("IronCliw/plugin-sdk/diagnostics-otel") },
  { id: "diffs", load: () => import("IronCliw/plugin-sdk/diffs") },
  { id: "feishu", load: () => import("IronCliw/plugin-sdk/feishu") },
  {
    id: "google-gemini-cli-auth",
    load: () => import("IronCliw/plugin-sdk/google-gemini-cli-auth"),
  },
  { id: "googlechat", load: () => import("IronCliw/plugin-sdk/googlechat") },
  { id: "irc", load: () => import("IronCliw/plugin-sdk/irc") },
  { id: "llm-task", load: () => import("IronCliw/plugin-sdk/llm-task") },
  { id: "lobster", load: () => import("IronCliw/plugin-sdk/lobster") },
  { id: "matrix", load: () => import("IronCliw/plugin-sdk/matrix") },
  { id: "mattermost", load: () => import("IronCliw/plugin-sdk/mattermost") },
  { id: "memory-core", load: () => import("IronCliw/plugin-sdk/memory-core") },
  { id: "memory-lancedb", load: () => import("IronCliw/plugin-sdk/memory-lancedb") },
  {
    id: "minimax-portal-auth",
    load: () => import("IronCliw/plugin-sdk/minimax-portal-auth"),
  },
  { id: "nextcloud-talk", load: () => import("IronCliw/plugin-sdk/nextcloud-talk") },
  { id: "nostr", load: () => import("IronCliw/plugin-sdk/nostr") },
  { id: "open-prose", load: () => import("IronCliw/plugin-sdk/open-prose") },
  { id: "phone-control", load: () => import("IronCliw/plugin-sdk/phone-control") },
  { id: "qwen-portal-auth", load: () => import("IronCliw/plugin-sdk/qwen-portal-auth") },
  { id: "synology-chat", load: () => import("IronCliw/plugin-sdk/synology-chat") },
  { id: "talk-voice", load: () => import("IronCliw/plugin-sdk/talk-voice") },
  { id: "test-utils", load: () => import("IronCliw/plugin-sdk/test-utils") },
  { id: "thread-ownership", load: () => import("IronCliw/plugin-sdk/thread-ownership") },
  { id: "tlon", load: () => import("IronCliw/plugin-sdk/tlon") },
  { id: "twitch", load: () => import("IronCliw/plugin-sdk/twitch") },
  { id: "voice-call", load: () => import("IronCliw/plugin-sdk/voice-call") },
  { id: "zalo", load: () => import("IronCliw/plugin-sdk/zalo") },
  { id: "zalouser", load: () => import("IronCliw/plugin-sdk/zalouser") },
] as const;

describe("plugin-sdk subpath exports", () => {
  it("exports compat helpers", () => {
    expect(typeof compatSdk.emptyPluginConfigSchema).toBe("function");
    expect(typeof compatSdk.resolveControlCommandGate).toBe("function");
  });

  it("exports Discord helpers", () => {
    expect(typeof discordSdk.resolveDiscordAccount).toBe("function");
    expect(typeof discordSdk.discordOnboardingAdapter).toBe("object");
  });

  it("exports Slack helpers", () => {
    expect(typeof slackSdk.resolveSlackAccount).toBe("function");
    expect(typeof slackSdk.handleSlackMessageAction).toBe("function");
  });

  it("exports Signal helpers", () => {
    expect(typeof signalSdk.resolveSignalAccount).toBe("function");
    expect(typeof signalSdk.signalOnboardingAdapter).toBe("object");
  });

  it("exports iMessage helpers", () => {
    expect(typeof imessageSdk.resolveIMessageAccount).toBe("function");
    expect(typeof imessageSdk.imessageOnboardingAdapter).toBe("object");
  });

  it("exports WhatsApp helpers", () => {
    expect(typeof whatsappSdk.resolveWhatsAppAccount).toBe("function");
    expect(typeof whatsappSdk.whatsappOnboardingAdapter).toBe("object");
  });

  it("exports LINE helpers", () => {
    expect(typeof lineSdk.processLineMessage).toBe("function");
    expect(typeof lineSdk.createInfoCard).toBe("function");
  });

  it("exports Microsoft Teams helpers", () => {
    expect(typeof msteamsSdk.resolveControlCommandGate).toBe("function");
    expect(typeof msteamsSdk.loadOutboundMediaFromUrl).toBe("function");
  });

  it("resolves bundled extension subpaths", async () => {
    for (const { id, load } of bundledExtensionSubpathLoaders) {
      const mod = await load();
      expect(typeof mod).toBe("object");
      expect(mod, `subpath ${id} should resolve`).toBeTruthy();
    }
  });
});
