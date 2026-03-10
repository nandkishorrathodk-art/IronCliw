import { describe, expect, it } from "vitest";
import {
  buildParseArgv,
  getFlagValue,
  getCommandPath,
  getCommandPositionalsWithRootOptions,
  getCommandPathWithRootOptions,
  getPrimaryCommand,
  getPositiveIntFlagValue,
  getVerboseFlag,
  hasHelpOrVersion,
  hasFlag,
  isRootHelpInvocation,
  isRootVersionInvocation,
  shouldMigrateState,
  shouldMigrateStateFromPath,
} from "./argv.js";

describe("argv helpers", () => {
  it.each([
    {
      name: "help flag",
      argv: ["node", "ironcliw", "--help"],
      expected: true,
    },
    {
      name: "version flag",
      argv: ["node", "ironcliw", "-V"],
      expected: true,
    },
    {
      name: "normal command",
      argv: ["node", "ironcliw", "status"],
      expected: false,
    },
    {
      name: "root -v alias",
      argv: ["node", "ironcliw", "-v"],
      expected: true,
    },
    {
      name: "root -v alias with profile",
      argv: ["node", "ironcliw", "--profile", "work", "-v"],
      expected: true,
    },
    {
      name: "root -v alias with log-level",
      argv: ["node", "ironcliw", "--log-level", "debug", "-v"],
      expected: true,
    },
    {
      name: "subcommand -v should not be treated as version",
      argv: ["node", "ironcliw", "acp", "-v"],
      expected: false,
    },
    {
      name: "root -v alias with equals profile",
      argv: ["node", "ironcliw", "--profile=work", "-v"],
      expected: true,
    },
    {
      name: "subcommand path after global root flags should not be treated as version",
      argv: ["node", "ironcliw", "--dev", "skills", "list", "-v"],
      expected: false,
    },
  ])("detects help/version flags: $name", ({ argv, expected }) => {
    expect(hasHelpOrVersion(argv)).toBe(expected);
  });

  it.each([
    {
      name: "root --version",
      argv: ["node", "ironcliw", "--version"],
      expected: true,
    },
    {
      name: "root -V",
      argv: ["node", "ironcliw", "-V"],
      expected: true,
    },
    {
      name: "root -v alias with profile",
      argv: ["node", "ironcliw", "--profile", "work", "-v"],
      expected: true,
    },
    {
      name: "subcommand version flag",
      argv: ["node", "ironcliw", "status", "--version"],
      expected: false,
    },
    {
      name: "unknown root flag with version",
      argv: ["node", "ironcliw", "--unknown", "--version"],
      expected: false,
    },
  ])("detects root-only version invocations: $name", ({ argv, expected }) => {
    expect(isRootVersionInvocation(argv)).toBe(expected);
  });

  it.each([
    {
      name: "root --help",
      argv: ["node", "ironcliw", "--help"],
      expected: true,
    },
    {
      name: "root -h",
      argv: ["node", "ironcliw", "-h"],
      expected: true,
    },
    {
      name: "root --help with profile",
      argv: ["node", "ironcliw", "--profile", "work", "--help"],
      expected: true,
    },
    {
      name: "subcommand --help",
      argv: ["node", "ironcliw", "status", "--help"],
      expected: false,
    },
    {
      name: "help before subcommand token",
      argv: ["node", "ironcliw", "--help", "status"],
      expected: false,
    },
    {
      name: "help after -- terminator",
      argv: ["node", "ironcliw", "nodes", "run", "--", "git", "--help"],
      expected: false,
    },
    {
      name: "unknown root flag before help",
      argv: ["node", "ironcliw", "--unknown", "--help"],
      expected: false,
    },
    {
      name: "unknown root flag after help",
      argv: ["node", "ironcliw", "--help", "--unknown"],
      expected: false,
    },
  ])("detects root-only help invocations: $name", ({ argv, expected }) => {
    expect(isRootHelpInvocation(argv)).toBe(expected);
  });

  it.each([
    {
      name: "single command with trailing flag",
      argv: ["node", "ironcliw", "status", "--json"],
      expected: ["status"],
    },
    {
      name: "two-part command",
      argv: ["node", "ironcliw", "agents", "list"],
      expected: ["agents", "list"],
    },
    {
      name: "terminator cuts parsing",
      argv: ["node", "ironcliw", "status", "--", "ignored"],
      expected: ["status"],
    },
  ])("extracts command path: $name", ({ argv, expected }) => {
    expect(getCommandPath(argv, 2)).toEqual(expected);
  });

  it("extracts command path while skipping known root option values", () => {
    expect(
      getCommandPathWithRootOptions(
        ["node", "ironcliw", "--profile", "work", "--no-color", "config", "validate"],
        2,
      ),
    ).toEqual(["config", "validate"]);
  });

  it("extracts routed config get positionals with interleaved root options", () => {
    expect(
      getCommandPositionalsWithRootOptions(
        ["node", "ironcliw", "config", "get", "--log-level", "debug", "update.channel", "--json"],
        {
          commandPath: ["config", "get"],
          booleanFlags: ["--json"],
        },
      ),
    ).toEqual(["update.channel"]);
  });

  it("extracts routed config unset positionals with interleaved root options", () => {
    expect(
      getCommandPositionalsWithRootOptions(
        ["node", "ironcliw", "config", "unset", "--profile", "work", "update.channel"],
        {
          commandPath: ["config", "unset"],
        },
      ),
    ).toEqual(["update.channel"]);
  });

  it("returns null when routed command sees unknown options", () => {
    expect(
      getCommandPositionalsWithRootOptions(
        ["node", "ironcliw", "config", "get", "--mystery", "value", "update.channel"],
        {
          commandPath: ["config", "get"],
          booleanFlags: ["--json"],
        },
      ),
    ).toBeNull();
  });

  it.each([
    {
      name: "returns first command token",
      argv: ["node", "ironcliw", "agents", "list"],
      expected: "agents",
    },
    {
      name: "returns null when no command exists",
      argv: ["node", "ironcliw"],
      expected: null,
    },
    {
      name: "skips known root option values",
      argv: ["node", "ironcliw", "--log-level", "debug", "status"],
      expected: "status",
    },
  ])("returns primary command: $name", ({ argv, expected }) => {
    expect(getPrimaryCommand(argv)).toBe(expected);
  });

  it.each([
    {
      name: "detects flag before terminator",
      argv: ["node", "ironcliw", "status", "--json"],
      flag: "--json",
      expected: true,
    },
    {
      name: "ignores flag after terminator",
      argv: ["node", "ironcliw", "--", "--json"],
      flag: "--json",
      expected: false,
    },
  ])("parses boolean flags: $name", ({ argv, flag, expected }) => {
    expect(hasFlag(argv, flag)).toBe(expected);
  });

  it.each([
    {
      name: "value in next token",
      argv: ["node", "ironcliw", "status", "--timeout", "5000"],
      expected: "5000",
    },
    {
      name: "value in equals form",
      argv: ["node", "ironcliw", "status", "--timeout=2500"],
      expected: "2500",
    },
    {
      name: "missing value",
      argv: ["node", "ironcliw", "status", "--timeout"],
      expected: null,
    },
    {
      name: "next token is another flag",
      argv: ["node", "ironcliw", "status", "--timeout", "--json"],
      expected: null,
    },
    {
      name: "flag appears after terminator",
      argv: ["node", "ironcliw", "--", "--timeout=99"],
      expected: undefined,
    },
  ])("extracts flag values: $name", ({ argv, expected }) => {
    expect(getFlagValue(argv, "--timeout")).toBe(expected);
  });

  it("parses verbose flags", () => {
    expect(getVerboseFlag(["node", "ironcliw", "status", "--verbose"])).toBe(true);
    expect(getVerboseFlag(["node", "ironcliw", "status", "--debug"])).toBe(false);
    expect(getVerboseFlag(["node", "ironcliw", "status", "--debug"], { includeDebug: true })).toBe(
      true,
    );
  });

  it.each([
    {
      name: "missing flag",
      argv: ["node", "ironcliw", "status"],
      expected: undefined,
    },
    {
      name: "missing value",
      argv: ["node", "ironcliw", "status", "--timeout"],
      expected: null,
    },
    {
      name: "valid positive integer",
      argv: ["node", "ironcliw", "status", "--timeout", "5000"],
      expected: 5000,
    },
    {
      name: "invalid integer",
      argv: ["node", "ironcliw", "status", "--timeout", "nope"],
      expected: undefined,
    },
  ])("parses positive integer flag values: $name", ({ argv, expected }) => {
    expect(getPositiveIntFlagValue(argv, "--timeout")).toBe(expected);
  });

  it("builds parse argv from raw args", () => {
    const cases = [
      {
        rawArgs: ["node", "ironcliw", "status"],
        expected: ["node", "ironcliw", "status"],
      },
      {
        rawArgs: ["node-22", "ironcliw", "status"],
        expected: ["node-22", "ironcliw", "status"],
      },
      {
        rawArgs: ["node-22.2.0.exe", "ironcliw", "status"],
        expected: ["node-22.2.0.exe", "ironcliw", "status"],
      },
      {
        rawArgs: ["node-22.2", "ironcliw", "status"],
        expected: ["node-22.2", "ironcliw", "status"],
      },
      {
        rawArgs: ["node-22.2.exe", "ironcliw", "status"],
        expected: ["node-22.2.exe", "ironcliw", "status"],
      },
      {
        rawArgs: ["/usr/bin/node-22.2.0", "ironcliw", "status"],
        expected: ["/usr/bin/node-22.2.0", "ironcliw", "status"],
      },
      {
        rawArgs: ["node24", "ironcliw", "status"],
        expected: ["node24", "ironcliw", "status"],
      },
      {
        rawArgs: ["/usr/bin/node24", "ironcliw", "status"],
        expected: ["/usr/bin/node24", "ironcliw", "status"],
      },
      {
        rawArgs: ["node24.exe", "ironcliw", "status"],
        expected: ["node24.exe", "ironcliw", "status"],
      },
      {
        rawArgs: ["nodejs", "ironcliw", "status"],
        expected: ["nodejs", "ironcliw", "status"],
      },
      {
        rawArgs: ["node-dev", "ironcliw", "status"],
        expected: ["node", "ironcliw", "node-dev", "ironcliw", "status"],
      },
      {
        rawArgs: ["ironcliw", "status"],
        expected: ["node", "ironcliw", "status"],
      },
      {
        rawArgs: ["bun", "src/entry.ts", "status"],
        expected: ["bun", "src/entry.ts", "status"],
      },
    ] as const;

    for (const testCase of cases) {
      const parsed = buildParseArgv({
        programName: "ironcliw",
        rawArgs: [...testCase.rawArgs],
      });
      expect(parsed).toEqual([...testCase.expected]);
    }
  });

  it("builds parse argv from fallback args", () => {
    const fallbackArgv = buildParseArgv({
      programName: "ironcliw",
      fallbackArgv: ["status"],
    });
    expect(fallbackArgv).toEqual(["node", "ironcliw", "status"]);
  });

  it("decides when to migrate state", () => {
    const nonMutatingArgv = [
      ["node", "ironcliw", "status"],
      ["node", "ironcliw", "health"],
      ["node", "ironcliw", "sessions"],
      ["node", "ironcliw", "config", "get", "update"],
      ["node", "ironcliw", "config", "unset", "update"],
      ["node", "ironcliw", "models", "list"],
      ["node", "ironcliw", "models", "status"],
      ["node", "ironcliw", "memory", "status"],
      ["node", "ironcliw", "agent", "--message", "hi"],
    ] as const;
    const mutatingArgv = [
      ["node", "ironcliw", "agents", "list"],
      ["node", "ironcliw", "message", "send"],
    ] as const;

    for (const argv of nonMutatingArgv) {
      expect(shouldMigrateState([...argv])).toBe(false);
    }
    for (const argv of mutatingArgv) {
      expect(shouldMigrateState([...argv])).toBe(true);
    }
  });

  it.each([
    { path: ["status"], expected: false },
    { path: ["config", "get"], expected: false },
    { path: ["models", "status"], expected: false },
    { path: ["agents", "list"], expected: true },
  ])("reuses command path for migrate state decisions: $path", ({ path, expected }) => {
    expect(shouldMigrateStateFromPath(path)).toBe(expected);
  });
});
