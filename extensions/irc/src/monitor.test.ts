import { describe, expect, it } from "vitest";
import { resolveIrcInboundTarget } from "./monitor.js";

describe("irc monitor inbound target", () => {
  it("keeps channel target for group messages", () => {
    expect(
      resolveIrcInboundTarget({
        target: "#Ironcliw",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: true,
      target: "#Ironcliw",
      rawTarget: "#Ironcliw",
    });
  });

  it("maps DM target to sender nick and preserves raw target", () => {
    expect(
      resolveIrcInboundTarget({
        target: "Ironcliw-bot",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: false,
      target: "alice",
      rawTarget: "Ironcliw-bot",
    });
  });

  it("falls back to raw target when sender nick is empty", () => {
    expect(
      resolveIrcInboundTarget({
        target: "Ironcliw-bot",
        senderNick: " ",
      }),
    ).toEqual({
      isGroup: false,
      target: "Ironcliw-bot",
      rawTarget: "Ironcliw-bot",
    });
  });
});

