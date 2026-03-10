import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatCliCommand } from "./command-format.js";
import { applyCliProfileEnv, parseCliProfileArgs } from "./profile.js";

describe("parseCliProfileArgs", () => {
  it("leaves gateway --dev for subcommands", () => {
    const res = parseCliProfileArgs([
      "node",
      "ironcliw",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual(["node", "ironcliw", "gateway", "--dev", "--allow-unconfigured"]);
  });

  it("still accepts global --dev before subcommand", () => {
    const res = parseCliProfileArgs(["node", "ironcliw", "--dev", "gateway"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "ironcliw", "gateway"]);
  });

  it("parses --profile value and strips it", () => {
    const res = parseCliProfileArgs(["node", "ironcliw", "--profile", "work", "status"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "ironcliw", "status"]);
  });

  it("rejects missing profile value", () => {
    const res = parseCliProfileArgs(["node", "ironcliw", "--profile"]);
    expect(res.ok).toBe(false);
  });

  it.each([
    ["--dev first", ["node", "ironcliw", "--dev", "--profile", "work", "status"]],
    ["--profile first", ["node", "ironcliw", "--profile", "work", "--dev", "status"]],
  ])("rejects combining --dev with --profile (%s)", (_name, argv) => {
    const res = parseCliProfileArgs(argv);
    expect(res.ok).toBe(false);
  });
});

describe("applyCliProfileEnv", () => {
  it("fills env defaults for dev profile", () => {
    const env: Record<string, string | undefined> = {};
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    const expectedStateDir = path.join(path.resolve("/home/peter"), ".ironcliw-dev");
    expect(env.IRONCLIW_PROFILE).toBe("dev");
    expect(env.IRONCLIW_STATE_DIR).toBe(expectedStateDir);
    expect(env.IRONCLIW_CONFIG_PATH).toBe(path.join(expectedStateDir, "ironcliw.json"));
    expect(env.IRONCLIW_GATEWAY_PORT).toBe("19001");
  });

  it("does not override explicit env values", () => {
    const env: Record<string, string | undefined> = {
      IRONCLIW_STATE_DIR: "/custom",
      IRONCLIW_GATEWAY_PORT: "19099",
    };
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    expect(env.IRONCLIW_STATE_DIR).toBe("/custom");
    expect(env.IRONCLIW_GATEWAY_PORT).toBe("19099");
    expect(env.IRONCLIW_CONFIG_PATH).toBe(path.join("/custom", "ironcliw.json"));
  });

  it("uses IRONCLIW_HOME when deriving profile state dir", () => {
    const env: Record<string, string | undefined> = {
      IRONCLIW_HOME: "/srv/ironcliw-home",
      HOME: "/home/other",
    };
    applyCliProfileEnv({
      profile: "work",
      env,
      homedir: () => "/home/fallback",
    });

    const resolvedHome = path.resolve("/srv/ironcliw-home");
    expect(env.IRONCLIW_STATE_DIR).toBe(path.join(resolvedHome, ".ironcliw-work"));
    expect(env.IRONCLIW_CONFIG_PATH).toBe(
      path.join(resolvedHome, ".ironcliw-work", "ironcliw.json"),
    );
  });
});

describe("formatCliCommand", () => {
  it.each([
    {
      name: "no profile is set",
      cmd: "ironcliw doctor --fix",
      env: {},
      expected: "ironcliw doctor --fix",
    },
    {
      name: "profile is default",
      cmd: "ironcliw doctor --fix",
      env: { IRONCLIW_PROFILE: "default" },
      expected: "ironcliw doctor --fix",
    },
    {
      name: "profile is Default (case-insensitive)",
      cmd: "ironcliw doctor --fix",
      env: { IRONCLIW_PROFILE: "Default" },
      expected: "ironcliw doctor --fix",
    },
    {
      name: "profile is invalid",
      cmd: "ironcliw doctor --fix",
      env: { IRONCLIW_PROFILE: "bad profile" },
      expected: "ironcliw doctor --fix",
    },
    {
      name: "--profile is already present",
      cmd: "ironcliw --profile work doctor --fix",
      env: { IRONCLIW_PROFILE: "work" },
      expected: "ironcliw --profile work doctor --fix",
    },
    {
      name: "--dev is already present",
      cmd: "ironcliw --dev doctor",
      env: { IRONCLIW_PROFILE: "dev" },
      expected: "ironcliw --dev doctor",
    },
  ])("returns command unchanged when $name", ({ cmd, env, expected }) => {
    expect(formatCliCommand(cmd, env)).toBe(expected);
  });

  it("inserts --profile flag when profile is set", () => {
    expect(formatCliCommand("ironcliw doctor --fix", { IRONCLIW_PROFILE: "work" })).toBe(
      "ironcliw --profile work doctor --fix",
    );
  });

  it("trims whitespace from profile", () => {
    expect(formatCliCommand("ironcliw doctor --fix", { IRONCLIW_PROFILE: "  jbironcliw  " })).toBe(
      "ironcliw --profile jbironcliw doctor --fix",
    );
  });

  it("handles command with no args after ironcliw", () => {
    expect(formatCliCommand("ironcliw", { IRONCLIW_PROFILE: "test" })).toBe(
      "ironcliw --profile test",
    );
  });

  it("handles pnpm wrapper", () => {
    expect(formatCliCommand("pnpm ironcliw doctor", { IRONCLIW_PROFILE: "work" })).toBe(
      "pnpm ironcliw --profile work doctor",
    );
  });
});
