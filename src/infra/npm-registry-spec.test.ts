import { describe, expect, it } from "vitest";
import {
  isPrereleaseResolutionAllowed,
  parseRegistryNpmSpec,
  validateRegistryNpmSpec,
} from "./npm-registry-spec.js";

describe("npm registry spec validation", () => {
  it("accepts bare package names, exact versions, and dist-tags", () => {
    expect(validateRegistryNpmSpec("@ironcliw/voice-call")).toBeNull();
    expect(validateRegistryNpmSpec("@ironcliw/voice-call@1.2.3")).toBeNull();
    expect(validateRegistryNpmSpec("@ironcliw/voice-call@1.2.3-beta.4")).toBeNull();
    expect(validateRegistryNpmSpec("@ironcliw/voice-call@latest")).toBeNull();
    expect(validateRegistryNpmSpec("@ironcliw/voice-call@beta")).toBeNull();
  });

  it("rejects semver ranges", () => {
    expect(validateRegistryNpmSpec("@ironcliw/voice-call@^1.2.3")).toContain(
      "exact version or dist-tag",
    );
    expect(validateRegistryNpmSpec("@ironcliw/voice-call@~1.2.3")).toContain(
      "exact version or dist-tag",
    );
  });
});

describe("npm prerelease resolution policy", () => {
  it("blocks prerelease resolutions for bare specs", () => {
    const spec = parseRegistryNpmSpec("@ironcliw/voice-call");
    expect(spec).not.toBeNull();
    expect(
      isPrereleaseResolutionAllowed({
        spec: spec!,
        resolvedVersion: "1.2.3-beta.1",
      }),
    ).toBe(false);
  });

  it("blocks prerelease resolutions for latest", () => {
    const spec = parseRegistryNpmSpec("@ironcliw/voice-call@latest");
    expect(spec).not.toBeNull();
    expect(
      isPrereleaseResolutionAllowed({
        spec: spec!,
        resolvedVersion: "1.2.3-rc.1",
      }),
    ).toBe(false);
  });

  it("allows prerelease resolutions when the user explicitly opted in", () => {
    const tagSpec = parseRegistryNpmSpec("@ironcliw/voice-call@beta");
    const versionSpec = parseRegistryNpmSpec("@ironcliw/voice-call@1.2.3-beta.1");

    expect(tagSpec).not.toBeNull();
    expect(versionSpec).not.toBeNull();
    expect(
      isPrereleaseResolutionAllowed({
        spec: tagSpec!,
        resolvedVersion: "1.2.3-beta.4",
      }),
    ).toBe(true);
    expect(
      isPrereleaseResolutionAllowed({
        spec: versionSpec!,
        resolvedVersion: "1.2.3-beta.1",
      }),
    ).toBe(true);
  });
});
