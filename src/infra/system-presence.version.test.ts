import { describe, expect, it, vi } from "vitest";
import { withEnvAsync } from "../test-utils/env.js";

async function withPresenceModule<T>(
  env: Record<string, string | undefined>,
  run: (module: typeof import("./system-presence.js")) => Promise<T> | T,
): Promise<T> {
  return withEnvAsync(env, async () => {
    vi.resetModules();
    const module = await import("./system-presence.js");
    return await run(module);
  });
}

describe("system-presence version fallback", () => {
  it("uses runtime VERSION when IronCliw_VERSION is not set", async () => {
    await withPresenceModule(
      {
        IronCliw_SERVICE_VERSION: "2.4.6-service",
        npm_package_version: "1.0.0-package",
      },
      async ({ listSystemPresence }) => {
        const { VERSION } = await import("../version.js");
        const selfEntry = listSystemPresence().find((entry) => entry.reason === "self");
        expect(selfEntry?.version).toBe(VERSION);
      },
    );
  });

  it("prefers IronCliw_VERSION over runtime VERSION", async () => {
    await withPresenceModule(
      {
        IronCliw_VERSION: "9.9.9-cli",
        IronCliw_SERVICE_VERSION: "2.4.6-service",
        npm_package_version: "1.0.0-package",
      },
      ({ listSystemPresence }) => {
        const selfEntry = listSystemPresence().find((entry) => entry.reason === "self");
        expect(selfEntry?.version).toBe("9.9.9-cli");
      },
    );
  });

  it("uses runtime VERSION when IronCliw_VERSION and IronCliw_SERVICE_VERSION are blank", async () => {
    await withPresenceModule(
      {
        IronCliw_VERSION: " ",
        IronCliw_SERVICE_VERSION: "\t",
        npm_package_version: "1.0.0-package",
      },
      async ({ listSystemPresence }) => {
        const { VERSION } = await import("../version.js");
        const selfEntry = listSystemPresence().find((entry) => entry.reason === "self");
        expect(selfEntry?.version).toBe(VERSION);
      },
    );
  });
});

