import { describe, expect, it } from "vitest";
import { resolveIrcInboundTarget } from "./monitor.js";

describe("irc monitor inbound target", () => {
  it("keeps channel target for group messages", () => {
    expect(
      resolveIrcInboundTarget({
        target: "#ironcliw",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: true,
      target: "#ironcliw",
      rawTarget: "#ironcliw",
    });
  });

  it("maps DM target to sender nick and preserves raw target", () => {
    expect(
      resolveIrcInboundTarget({
        target: "ironcliw-bot",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: false,
      target: "alice",
      rawTarget: "ironcliw-bot",
    });
  });

  it("falls back to raw target when sender nick is empty", () => {
    expect(
      resolveIrcInboundTarget({
        target: "ironcliw-bot",
        senderNick: " ",
      }),
    ).toEqual({
      isGroup: false,
      target: "ironcliw-bot",
      rawTarget: "ironcliw-bot",
    });
  });
});
