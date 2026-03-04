import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatCliCommand } from "./command-format.js";
import { applyCliProfileEnv, parseCliProfileArgs } from "./profile.js";

describe("parseCliProfileArgs", () => {
  it("leaves gateway --dev for subcommands", () => {
    const res = parseCliProfileArgs([
      "node",
      "IronCliw",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual(["node", "IronCliw", "gateway", "--dev", "--allow-unconfigured"]);
  });

  it("still accepts global --dev before subcommand", () => {
    const res = parseCliProfileArgs(["node", "IronCliw", "--dev", "gateway"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "IronCliw", "gateway"]);
  });

  it("parses --profile value and strips it", () => {
    const res = parseCliProfileArgs(["node", "IronCliw", "--profile", "work", "status"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "IronCliw", "status"]);
  });

  it("rejects missing profile value", () => {
    const res = parseCliProfileArgs(["node", "IronCliw", "--profile"]);
    expect(res.ok).toBe(false);
  });

  it.each([
    ["--dev first", ["node", "IronCliw", "--dev", "--profile", "work", "status"]],
    ["--profile first", ["node", "IronCliw", "--profile", "work", "--dev", "status"]],
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
    const expectedStateDir = path.join(path.resolve("/home/peter"), ".IronCliw-dev");
    expect(env.IronCliw_PROFILE).toBe("dev");
    expect(env.IronCliw_STATE_DIR).toBe(expectedStateDir);
    expect(env.IronCliw_CONFIG_PATH).toBe(path.join(expectedStateDir, "IronCliw.json"));
    expect(env.IronCliw_GATEWAY_PORT).toBe("19001");
  });

  it("does not override explicit env values", () => {
    const env: Record<string, string | undefined> = {
      IronCliw_STATE_DIR: "/custom",
      IronCliw_GATEWAY_PORT: "19099",
    };
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    expect(env.IronCliw_STATE_DIR).toBe("/custom");
    expect(env.IronCliw_GATEWAY_PORT).toBe("19099");
    expect(env.IronCliw_CONFIG_PATH).toBe(path.join("/custom", "IronCliw.json"));
  });

  it("uses IronCliw_HOME when deriving profile state dir", () => {
    const env: Record<string, string | undefined> = {
      IronCliw_HOME: "/srv/IronCliw-home",
      HOME: "/home/other",
    };
    applyCliProfileEnv({
      profile: "work",
      env,
      homedir: () => "/home/fallback",
    });

    const resolvedHome = path.resolve("/srv/IronCliw-home");
    expect(env.IronCliw_STATE_DIR).toBe(path.join(resolvedHome, ".IronCliw-work"));
    expect(env.IronCliw_CONFIG_PATH).toBe(
      path.join(resolvedHome, ".IronCliw-work", "IronCliw.json"),
    );
  });
});

describe("formatCliCommand", () => {
  it.each([
    {
      name: "no profile is set",
      cmd: "IronCliw doctor --fix",
      env: {},
      expected: "IronCliw doctor --fix",
    },
    {
      name: "profile is default",
      cmd: "IronCliw doctor --fix",
      env: { IronCliw_PROFILE: "default" },
      expected: "IronCliw doctor --fix",
    },
    {
      name: "profile is Default (case-insensitive)",
      cmd: "IronCliw doctor --fix",
      env: { IronCliw_PROFILE: "Default" },
      expected: "IronCliw doctor --fix",
    },
    {
      name: "profile is invalid",
      cmd: "IronCliw doctor --fix",
      env: { IronCliw_PROFILE: "bad profile" },
      expected: "IronCliw doctor --fix",
    },
    {
      name: "--profile is already present",
      cmd: "IronCliw --profile work doctor --fix",
      env: { IronCliw_PROFILE: "work" },
      expected: "IronCliw --profile work doctor --fix",
    },
    {
      name: "--dev is already present",
      cmd: "IronCliw --dev doctor",
      env: { IronCliw_PROFILE: "dev" },
      expected: "IronCliw --dev doctor",
    },
  ])("returns command unchanged when $name", ({ cmd, env, expected }) => {
    expect(formatCliCommand(cmd, env)).toBe(expected);
  });

  it("inserts --profile flag when profile is set", () => {
    expect(formatCliCommand("IronCliw doctor --fix", { IronCliw_PROFILE: "work" })).toBe(
      "IronCliw --profile work doctor --fix",
    );
  });

  it("trims whitespace from profile", () => {
    expect(formatCliCommand("IronCliw doctor --fix", { IronCliw_PROFILE: "  jbIronCliw  " })).toBe(
      "IronCliw --profile jbIronCliw doctor --fix",
    );
  });

  it("handles command with no args after IronCliw", () => {
    expect(formatCliCommand("IronCliw", { IronCliw_PROFILE: "test" })).toBe(
      "IronCliw --profile test",
    );
  });

  it("handles pnpm wrapper", () => {
    expect(formatCliCommand("pnpm IronCliw doctor", { IronCliw_PROFILE: "work" })).toBe(
      "pnpm IronCliw --profile work doctor",
    );
  });
});

