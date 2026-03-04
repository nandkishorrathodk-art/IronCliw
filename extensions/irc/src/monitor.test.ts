import { describe, expect, it } from "vitest";
import { resolveIrcInboundTarget } from "./monitor.js";

describe("irc monitor inbound target", () => {
  it("keeps channel target for group messages", () => {
    expect(
      resolveIrcInboundTarget({
        target: "#IronCliw",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: true,
      target: "#IronCliw",
      rawTarget: "#IronCliw",
    });
  });

  it("maps DM target to sender nick and preserves raw target", () => {
    expect(
      resolveIrcInboundTarget({
        target: "IronCliw-bot",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: false,
      target: "alice",
      rawTarget: "IronCliw-bot",
    });
  });

  it("falls back to raw target when sender nick is empty", () => {
    expect(
      resolveIrcInboundTarget({
        target: "IronCliw-bot",
        senderNick: " ",
      }),
    ).toEqual({
      isGroup: false,
      target: "IronCliw-bot",
      rawTarget: "IronCliw-bot",
    });
  });
});
