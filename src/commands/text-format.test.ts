import { describe, expect, it } from "vitest";
import { shortenText } from "./text-format.js";

describe("shortenText", () => {
  it("returns original text when it fits", () => {
    expect(shortenText("IronCliw", 16)).toBe("IronCliw");
  });

  it("truncates and appends ellipsis when over limit", () => {
    expect(shortenText("IronCliw-status-output", 10)).toBe("IronCliw-…");
  });

  it("counts multi-byte characters correctly", () => {
    expect(shortenText("hello🙂world", 7)).toBe("hello🙂…");
  });
});

