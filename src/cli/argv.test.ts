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
      argv: ["node", "IronCliw", "--help"],
      expected: true,
    },
    {
      name: "version flag",
      argv: ["node", "IronCliw", "-V"],
      expected: true,
    },
    {
      name: "normal command",
      argv: ["node", "IronCliw", "status"],
      expected: false,
    },
    {
      name: "root -v alias",
      argv: ["node", "IronCliw", "-v"],
      expected: true,
    },
    {
      name: "root -v alias with profile",
      argv: ["node", "IronCliw", "--profile", "work", "-v"],
      expected: true,
    },
    {
      name: "root -v alias with log-level",
      argv: ["node", "IronCliw", "--log-level", "debug", "-v"],
      expected: true,
    },
    {
      name: "subcommand -v should not be treated as version",
      argv: ["node", "IronCliw", "acp", "-v"],
      expected: false,
    },
    {
      name: "root -v alias with equals profile",
      argv: ["node", "IronCliw", "--profile=work", "-v"],
      expected: true,
    },
    {
      name: "subcommand path after global root flags should not be treated as version",
      argv: ["node", "IronCliw", "--dev", "skills", "list", "-v"],
      expected: false,
    },
  ])("detects help/version flags: $name", ({ argv, expected }) => {
    expect(hasHelpOrVersion(argv)).toBe(expected);
  });

  it.each([
    {
      name: "root --version",
      argv: ["node", "IronCliw", "--version"],
      expected: true,
    },
    {
      name: "root -V",
      argv: ["node", "IronCliw", "-V"],
      expected: true,
    },
    {
      name: "root -v alias with profile",
      argv: ["node", "IronCliw", "--profile", "work", "-v"],
      expected: true,
    },
    {
      name: "subcommand version flag",
      argv: ["node", "IronCliw", "status", "--version"],
      expected: false,
    },
    {
      name: "unknown root flag with version",
      argv: ["node", "IronCliw", "--unknown", "--version"],
      expected: false,
    },
  ])("detects root-only version invocations: $name", ({ argv, expected }) => {
    expect(isRootVersionInvocation(argv)).toBe(expected);
  });

  it.each([
    {
      name: "root --help",
      argv: ["node", "IronCliw", "--help"],
      expected: true,
    },
    {
      name: "root -h",
      argv: ["node", "IronCliw", "-h"],
      expected: true,
    },
    {
      name: "root --help with profile",
      argv: ["node", "IronCliw", "--profile", "work", "--help"],
      expected: true,
    },
    {
      name: "subcommand --help",
      argv: ["node", "IronCliw", "status", "--help"],
      expected: false,
    },
    {
      name: "help before subcommand token",
      argv: ["node", "IronCliw", "--help", "status"],
      expected: false,
    },
    {
      name: "help after -- terminator",
      argv: ["node", "IronCliw", "nodes", "run", "--", "git", "--help"],
      expected: false,
    },
    {
      name: "unknown root flag before help",
      argv: ["node", "IronCliw", "--unknown", "--help"],
      expected: false,
    },
    {
      name: "unknown root flag after help",
      argv: ["node", "IronCliw", "--help", "--unknown"],
      expected: false,
    },
  ])("detects root-only help invocations: $name", ({ argv, expected }) => {
    expect(isRootHelpInvocation(argv)).toBe(expected);
  });

  it.each([
    {
      name: "single command with trailing flag",
      argv: ["node", "IronCliw", "status", "--json"],
      expected: ["status"],
    },
    {
      name: "two-part command",
      argv: ["node", "IronCliw", "agents", "list"],
      expected: ["agents", "list"],
    },
    {
      name: "terminator cuts parsing",
      argv: ["node", "IronCliw", "status", "--", "ignored"],
      expected: ["status"],
    },
  ])("extracts command path: $name", ({ argv, expected }) => {
    expect(getCommandPath(argv, 2)).toEqual(expected);
  });

  it("extracts command path while skipping known root option values", () => {
    expect(
      getCommandPathWithRootOptions(
        ["node", "IronCliw", "--profile", "work", "--no-color", "config", "validate"],
        2,
      ),
    ).toEqual(["config", "validate"]);
  });

  it("extracts routed config get positionals with interleaved root options", () => {
    expect(
      getCommandPositionalsWithRootOptions(
        ["node", "IronCliw", "config", "get", "--log-level", "debug", "update.channel", "--json"],
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
        ["node", "IronCliw", "config", "unset", "--profile", "work", "update.channel"],
        {
          commandPath: ["config", "unset"],
        },
      ),
    ).toEqual(["update.channel"]);
  });

  it("returns null when routed command sees unknown options", () => {
    expect(
      getCommandPositionalsWithRootOptions(
        ["node", "IronCliw", "config", "get", "--mystery", "value", "update.channel"],
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
      argv: ["node", "IronCliw", "agents", "list"],
      expected: "agents",
    },
    {
      name: "returns null when no command exists",
      argv: ["node", "IronCliw"],
      expected: null,
    },
    {
      name: "skips known root option values",
      argv: ["node", "IronCliw", "--log-level", "debug", "status"],
      expected: "status",
    },
  ])("returns primary command: $name", ({ argv, expected }) => {
    expect(getPrimaryCommand(argv)).toBe(expected);
  });

  it.each([
    {
      name: "detects flag before terminator",
      argv: ["node", "IronCliw", "status", "--json"],
      flag: "--json",
      expected: true,
    },
    {
      name: "ignores flag after terminator",
      argv: ["node", "IronCliw", "--", "--json"],
      flag: "--json",
      expected: false,
    },
  ])("parses boolean flags: $name", ({ argv, flag, expected }) => {
    expect(hasFlag(argv, flag)).toBe(expected);
  });

  it.each([
    {
      name: "value in next token",
      argv: ["node", "IronCliw", "status", "--timeout", "5000"],
      expected: "5000",
    },
    {
      name: "value in equals form",
      argv: ["node", "IronCliw", "status", "--timeout=2500"],
      expected: "2500",
    },
    {
      name: "missing value",
      argv: ["node", "IronCliw", "status", "--timeout"],
      expected: null,
    },
    {
      name: "next token is another flag",
      argv: ["node", "IronCliw", "status", "--timeout", "--json"],
      expected: null,
    },
    {
      name: "flag appears after terminator",
      argv: ["node", "IronCliw", "--", "--timeout=99"],
      expected: undefined,
    },
  ])("extracts flag values: $name", ({ argv, expected }) => {
    expect(getFlagValue(argv, "--timeout")).toBe(expected);
  });

  it("parses verbose flags", () => {
    expect(getVerboseFlag(["node", "IronCliw", "status", "--verbose"])).toBe(true);
    expect(getVerboseFlag(["node", "IronCliw", "status", "--debug"])).toBe(false);
    expect(getVerboseFlag(["node", "IronCliw", "status", "--debug"], { includeDebug: true })).toBe(
      true,
    );
  });

  it.each([
    {
      name: "missing flag",
      argv: ["node", "IronCliw", "status"],
      expected: undefined,
    },
    {
      name: "missing value",
      argv: ["node", "IronCliw", "status", "--timeout"],
      expected: null,
    },
    {
      name: "valid positive integer",
      argv: ["node", "IronCliw", "status", "--timeout", "5000"],
      expected: 5000,
    },
    {
      name: "invalid integer",
      argv: ["node", "IronCliw", "status", "--timeout", "nope"],
      expected: undefined,
    },
  ])("parses positive integer flag values: $name", ({ argv, expected }) => {
    expect(getPositiveIntFlagValue(argv, "--timeout")).toBe(expected);
  });

  it("builds parse argv from raw args", () => {
    const cases = [
      {
        rawArgs: ["node", "IronCliw", "status"],
        expected: ["node", "IronCliw", "status"],
      },
      {
        rawArgs: ["node-22", "IronCliw", "status"],
        expected: ["node-22", "IronCliw", "status"],
      },
      {
        rawArgs: ["node-22.2.0.exe", "IronCliw", "status"],
        expected: ["node-22.2.0.exe", "IronCliw", "status"],
      },
      {
        rawArgs: ["node-22.2", "IronCliw", "status"],
        expected: ["node-22.2", "IronCliw", "status"],
      },
      {
        rawArgs: ["node-22.2.exe", "IronCliw", "status"],
        expected: ["node-22.2.exe", "IronCliw", "status"],
      },
      {
        rawArgs: ["/usr/bin/node-22.2.0", "IronCliw", "status"],
        expected: ["/usr/bin/node-22.2.0", "IronCliw", "status"],
      },
      {
        rawArgs: ["node24", "IronCliw", "status"],
        expected: ["node24", "IronCliw", "status"],
      },
      {
        rawArgs: ["/usr/bin/node24", "IronCliw", "status"],
        expected: ["/usr/bin/node24", "IronCliw", "status"],
      },
      {
        rawArgs: ["node24.exe", "IronCliw", "status"],
        expected: ["node24.exe", "IronCliw", "status"],
      },
      {
        rawArgs: ["nodejs", "IronCliw", "status"],
        expected: ["nodejs", "IronCliw", "status"],
      },
      {
        rawArgs: ["node-dev", "IronCliw", "status"],
        expected: ["node", "IronCliw", "node-dev", "IronCliw", "status"],
      },
      {
        rawArgs: ["IronCliw", "status"],
        expected: ["node", "IronCliw", "status"],
      },
      {
        rawArgs: ["bun", "src/entry.ts", "status"],
        expected: ["bun", "src/entry.ts", "status"],
      },
    ] as const;

    for (const testCase of cases) {
      const parsed = buildParseArgv({
        programName: "IronCliw",
        rawArgs: [...testCase.rawArgs],
      });
      expect(parsed).toEqual([...testCase.expected]);
    }
  });

  it("builds parse argv from fallback args", () => {
    const fallbackArgv = buildParseArgv({
      programName: "IronCliw",
      fallbackArgv: ["status"],
    });
    expect(fallbackArgv).toEqual(["node", "IronCliw", "status"]);
  });

  it("decides when to migrate state", () => {
    const nonMutatingArgv = [
      ["node", "IronCliw", "status"],
      ["node", "IronCliw", "health"],
      ["node", "IronCliw", "sessions"],
      ["node", "IronCliw", "config", "get", "update"],
      ["node", "IronCliw", "config", "unset", "update"],
      ["node", "IronCliw", "models", "list"],
      ["node", "IronCliw", "models", "status"],
      ["node", "IronCliw", "memory", "status"],
      ["node", "IronCliw", "agent", "--message", "hi"],
    ] as const;
    const mutatingArgv = [
      ["node", "IronCliw", "agents", "list"],
      ["node", "IronCliw", "message", "send"],
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
