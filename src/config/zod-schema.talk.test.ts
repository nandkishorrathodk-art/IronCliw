import { describe, expect, it } from "vitest";
import { IronCliwSchema } from "./zod-schema.js";

describe("IronCliwSchema talk validation", () => {
  it("accepts a positive integer talk.silenceTimeoutMs", () => {
    expect(() =>
      IronCliwSchema.parse({
        talk: {
          silenceTimeoutMs: 1500,
        },
      }),
    ).not.toThrow();
  });

  it.each([
    ["boolean", true],
    ["string", "1500"],
    ["float", 1500.5],
  ])("rejects %s talk.silenceTimeoutMs", (_label, value) => {
    expect(() =>
      IronCliwSchema.parse({
        talk: {
          silenceTimeoutMs: value,
        },
      }),
    ).toThrow(/silenceTimeoutMs|number|integer/i);
  });

  it("rejects talk.provider when it does not match talk.providers", () => {
    expect(() =>
      IronCliwSchema.parse({
        talk: {
          provider: "acme",
          providers: {
            elevenlabs: {
              voiceId: "voice-123",
            },
          },
        },
      }),
    ).toThrow(/talk\.provider|talk\.providers|missing "acme"/i);
  });

  it("rejects multi-provider talk config without talk.provider", () => {
    expect(() =>
      IronCliwSchema.parse({
        talk: {
          providers: {
            acme: {
              voiceId: "voice-acme",
            },
            elevenlabs: {
              voiceId: "voice-eleven",
            },
          },
        },
      }),
    ).toThrow(/talk\.provider|required/i);
  });
});
