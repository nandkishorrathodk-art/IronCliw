import { describe, expect, it } from "vitest";
import { shortenText } from "./text-format.js";

describe("shortenText", () => {
  it("returns original text when it fits", () => {
    expect(shortenText("ironcliw", 16)).toBe("ironcliw");
  });

  it("truncates and appends ellipsis when over limit", () => {
    expect(shortenText("ironcliw-status-output", 10)).toBe("ironcliw-…");
  });

  it("counts multi-byte characters correctly", () => {
    expect(shortenText("hello🙂world", 7)).toBe("hello🙂…");
  });
});
