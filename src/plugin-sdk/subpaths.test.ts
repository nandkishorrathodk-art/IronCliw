import * as compatSdk from "ironcliw/plugin-sdk/compat";
import * as discordSdk from "ironcliw/plugin-sdk/discord";
import * as imessageSdk from "ironcliw/plugin-sdk/imessage";
import * as lineSdk from "ironcliw/plugin-sdk/line";
import * as msteamsSdk from "ironcliw/plugin-sdk/msteams";
import * as signalSdk from "ironcliw/plugin-sdk/signal";
import * as slackSdk from "ironcliw/plugin-sdk/slack";
import * as telegramSdk from "ironcliw/plugin-sdk/telegram";
import * as whatsappSdk from "ironcliw/plugin-sdk/whatsapp";
import { describe, expect, it } from "vitest";

const bundledExtensionSubpathLoaders = [
  { id: "acpx", load: () => import("ironcliw/plugin-sdk/acpx") },
  { id: "bluebubbles", load: () => import("ironcliw/plugin-sdk/bluebubbles") },
  { id: "copilot-proxy", load: () => import("ironcliw/plugin-sdk/copilot-proxy") },
  { id: "device-pair", load: () => import("ironcliw/plugin-sdk/device-pair") },
  { id: "diagnostics-otel", load: () => import("ironcliw/plugin-sdk/diagnostics-otel") },
  { id: "diffs", load: () => import("ironcliw/plugin-sdk/diffs") },
  { id: "feishu", load: () => import("ironcliw/plugin-sdk/feishu") },
  {
    id: "google-gemini-cli-auth",
    load: () => import("ironcliw/plugin-sdk/google-gemini-cli-auth"),
  },
  { id: "googlechat", load: () => import("ironcliw/plugin-sdk/googlechat") },
  { id: "irc", load: () => import("ironcliw/plugin-sdk/irc") },
  { id: "llm-task", load: () => import("ironcliw/plugin-sdk/llm-task") },
  { id: "lobster", load: () => import("ironcliw/plugin-sdk/lobster") },
  { id: "matrix", load: () => import("ironcliw/plugin-sdk/matrix") },
  { id: "mattermost", load: () => import("ironcliw/plugin-sdk/mattermost") },
  { id: "memory-core", load: () => import("ironcliw/plugin-sdk/memory-core") },
  { id: "memory-lancedb", load: () => import("ironcliw/plugin-sdk/memory-lancedb") },
  {
    id: "minimax-portal-auth",
    load: () => import("ironcliw/plugin-sdk/minimax-portal-auth"),
  },
  { id: "nextcloud-talk", load: () => import("ironcliw/plugin-sdk/nextcloud-talk") },
  { id: "nostr", load: () => import("ironcliw/plugin-sdk/nostr") },
  { id: "open-prose", load: () => import("ironcliw/plugin-sdk/open-prose") },
  { id: "phone-control", load: () => import("ironcliw/plugin-sdk/phone-control") },
  { id: "qwen-portal-auth", load: () => import("ironcliw/plugin-sdk/qwen-portal-auth") },
  { id: "synology-chat", load: () => import("ironcliw/plugin-sdk/synology-chat") },
  { id: "talk-voice", load: () => import("ironcliw/plugin-sdk/talk-voice") },
  { id: "test-utils", load: () => import("ironcliw/plugin-sdk/test-utils") },
  { id: "thread-ownership", load: () => import("ironcliw/plugin-sdk/thread-ownership") },
  { id: "tlon", load: () => import("ironcliw/plugin-sdk/tlon") },
  { id: "twitch", load: () => import("ironcliw/plugin-sdk/twitch") },
  { id: "voice-call", load: () => import("ironcliw/plugin-sdk/voice-call") },
  { id: "zalo", load: () => import("ironcliw/plugin-sdk/zalo") },
  { id: "zalouser", load: () => import("ironcliw/plugin-sdk/zalouser") },
] as const;

describe("plugin-sdk subpath exports", () => {
  it("exports compat helpers", () => {
    expect(typeof compatSdk.emptyPluginConfigSchema).toBe("function");
    expect(typeof compatSdk.resolveControlCommandGate).toBe("function");
  });

  it("exports Discord helpers", () => {
    expect(typeof discordSdk.resolveDiscordAccount).toBe("function");
    expect(typeof discordSdk.inspectDiscordAccount).toBe("function");
    expect(typeof discordSdk.discordOnboardingAdapter).toBe("object");
  });

  it("exports Slack helpers", () => {
    expect(typeof slackSdk.resolveSlackAccount).toBe("function");
    expect(typeof slackSdk.inspectSlackAccount).toBe("function");
    expect(typeof slackSdk.handleSlackMessageAction).toBe("function");
  });

  it("exports Telegram helpers", () => {
    expect(typeof telegramSdk.resolveTelegramAccount).toBe("function");
    expect(typeof telegramSdk.inspectTelegramAccount).toBe("function");
    expect(typeof telegramSdk.telegramOnboardingAdapter).toBe("object");
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

  it("keeps the newly added bundled plugin-sdk contracts available", async () => {
    const bluebubbles = await import("ironcliw/plugin-sdk/bluebubbles");
    expect(typeof bluebubbles.parseFiniteNumber).toBe("function");

    const mattermost = await import("ironcliw/plugin-sdk/mattermost");
    expect(typeof mattermost.parseStrictPositiveInteger).toBe("function");

    const nextcloudTalk = await import("ironcliw/plugin-sdk/nextcloud-talk");
    expect(typeof nextcloudTalk.waitForAbortSignal).toBe("function");

    const twitch = await import("ironcliw/plugin-sdk/twitch");
    expect(typeof twitch.DEFAULT_ACCOUNT_ID).toBe("string");
    expect(typeof twitch.normalizeAccountId).toBe("function");
  });
});
