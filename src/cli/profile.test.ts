import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatCliCommand } from "./command-format.js";
import { applyCliProfileEnv, parseCliProfileArgs } from "./profile.js";

describe("parseCliProfileArgs", () => {
  it("leaves gateway --dev for subcommands", () => {
    const res = parseCliProfileArgs([
      "node",
      "Ironcliw",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual(["node", "Ironcliw", "gateway", "--dev", "--allow-unconfigured"]);
  });

  it("still accepts global --dev before subcommand", () => {
    const res = parseCliProfileArgs(["node", "Ironcliw", "--dev", "gateway"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "Ironcliw", "gateway"]);
  });

  it("parses --profile value and strips it", () => {
    const res = parseCliProfileArgs(["node", "Ironcliw", "--profile", "work", "status"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "Ironcliw", "status"]);
  });

  it("rejects missing profile value", () => {
    const res = parseCliProfileArgs(["node", "Ironcliw", "--profile"]);
    expect(res.ok).toBe(false);
  });

  it.each([
    ["--dev first", ["node", "Ironcliw", "--dev", "--profile", "work", "status"]],
    ["--profile first", ["node", "Ironcliw", "--profile", "work", "--dev", "status"]],
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
    const expectedStateDir = path.join(path.resolve("/home/peter"), ".Ironcliw-dev");
    expect(env.IRONCLIW_PROFILE).toBe("dev");
    expect(env.IRONCLIW_STATE_DIR).toBe(expectedStateDir);
    expect(env.IRONCLIW_CONFIG_PATH).toBe(path.join(expectedStateDir, "Ironcliw.json"));
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
    expect(env.IRONCLIW_CONFIG_PATH).toBe(path.join("/custom", "Ironcliw.json"));
  });

  it("uses IRONCLIW_HOME when deriving profile state dir", () => {
    const env: Record<string, string | undefined> = {
      IRONCLIW_HOME: "/srv/Ironcliw-home",
      HOME: "/home/other",
    };
    applyCliProfileEnv({
      profile: "work",
      env,
      homedir: () => "/home/fallback",
    });

    const resolvedHome = path.resolve("/srv/Ironcliw-home");
    expect(env.IRONCLIW_STATE_DIR).toBe(path.join(resolvedHome, ".Ironcliw-work"));
    expect(env.IRONCLIW_CONFIG_PATH).toBe(
      path.join(resolvedHome, ".Ironcliw-work", "Ironcliw.json"),
    );
  });
});

describe("formatCliCommand", () => {
  it.each([
    {
      name: "no profile is set",
      cmd: "Ironcliw doctor --fix",
      env: {},
      expected: "Ironcliw doctor --fix",
    },
    {
      name: "profile is default",
      cmd: "Ironcliw doctor --fix",
      env: { IRONCLIW_PROFILE: "default" },
      expected: "Ironcliw doctor --fix",
    },
    {
      name: "profile is Default (case-insensitive)",
      cmd: "Ironcliw doctor --fix",
      env: { IRONCLIW_PROFILE: "Default" },
      expected: "Ironcliw doctor --fix",
    },
    {
      name: "profile is invalid",
      cmd: "Ironcliw doctor --fix",
      env: { IRONCLIW_PROFILE: "bad profile" },
      expected: "Ironcliw doctor --fix",
    },
    {
      name: "--profile is already present",
      cmd: "Ironcliw --profile work doctor --fix",
      env: { IRONCLIW_PROFILE: "work" },
      expected: "Ironcliw --profile work doctor --fix",
    },
    {
      name: "--dev is already present",
      cmd: "Ironcliw --dev doctor",
      env: { IRONCLIW_PROFILE: "dev" },
      expected: "Ironcliw --dev doctor",
    },
  ])("returns command unchanged when $name", ({ cmd, env, expected }) => {
    expect(formatCliCommand(cmd, env)).toBe(expected);
  });

  it("inserts --profile flag when profile is set", () => {
    expect(formatCliCommand("Ironcliw doctor --fix", { IRONCLIW_PROFILE: "work" })).toBe(
      "Ironcliw --profile work doctor --fix",
    );
  });

  it("trims whitespace from profile", () => {
    expect(formatCliCommand("Ironcliw doctor --fix", { IRONCLIW_PROFILE: "  jbIroncliw  " })).toBe(
      "Ironcliw --profile jbIroncliw doctor --fix",
    );
  });

  it("handles command with no args after Ironcliw", () => {
    expect(formatCliCommand("Ironcliw", { IRONCLIW_PROFILE: "test" })).toBe(
      "Ironcliw --profile test",
    );
  });

  it("handles pnpm wrapper", () => {
    expect(formatCliCommand("pnpm Ironcliw doctor", { IRONCLIW_PROFILE: "work" })).toBe(
      "pnpm Ironcliw --profile work doctor",
    );
  });
});

