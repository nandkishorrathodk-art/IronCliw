import { describe, expect, it } from "vitest";
import { shortenText } from "./text-format.js";

describe("shortenText", () => {
  it("returns original text when it fits", () => {
    expect(shortenText("Ironcliw", 16)).toBe("Ironcliw");
  });

  it("truncates and appends ellipsis when over limit", () => {
    expect(shortenText("Ironcliw-status-output", 10)).toBe("Ironcliw-…");
  });

  it("counts multi-byte characters correctly", () => {
    expect(shortenText("hello🙂world", 7)).toBe("hello🙂…");
  });
});

