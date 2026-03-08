import { loadConfig } from "../config/config.js";
import { resolveCommitHash } from "../infra/git-commit.js";
import { visibleWidth } from "../terminal/ansi.js";
import { isRich, theme } from "../terminal/theme.js";
import { hasRootVersionAlias } from "./argv.js";
import { pickTagline, type TaglineMode, type TaglineOptions } from "./tagline.js";

type BannerOptions = TaglineOptions & {
  argv?: string[];
  commit?: string | null;
  columns?: number;
  richTty?: boolean;
};

let bannerEmitted = false;

const hasJsonFlag = (argv: string[]) =>
  argv.some((arg) => arg === "--json" || arg.startsWith("--json="));

const hasVersionFlag = (argv: string[]) =>
  argv.some((arg) => arg === "--version" || arg === "-V") || hasRootVersionAlias(argv);

function parseTaglineMode(value: unknown): TaglineMode | undefined {
  if (value === "random" || value === "default" || value === "off") {
    return value;
  }
  return undefined;
}

function resolveTaglineMode(options: BannerOptions): TaglineMode | undefined {
  const explicit = parseTaglineMode(options.mode);
  if (explicit) {
    return explicit;
  }
  try {
    return parseTaglineMode(loadConfig().cli?.banner?.taglineMode);
  } catch {
    // Fall back to default random behavior when config is missing/invalid.
    return undefined;
  }
}

export function formatCliBannerLine(version: string, options: BannerOptions = {}): string {
  const commit = options.commit ?? resolveCommitHash({ env: options.env });
  const commitLabel = commit ?? "unknown";
  const tagline = pickTagline({ ...options, mode: resolveTaglineMode(options) });
  const rich = options.richTty ?? isRich();
  const title = "🦾 IronCliw";
  const prefix = "🦾 ";
  const columns = options.columns ?? process.stdout.columns ?? 120;
  const plainBaseLine = `${title} ${version} (${commitLabel})`;
  const plainFullLine = tagline ? `${plainBaseLine} — ${tagline}` : plainBaseLine;
  const fitsOnOneLine = visibleWidth(plainFullLine) <= columns;
  if (rich) {
    if (fitsOnOneLine) {
      if (!tagline) {
        return `${theme.heading(title)} ${theme.info(version)} ${theme.muted(`(${commitLabel})`)}`;
      }
      return `${theme.heading(title)} ${theme.info(version)} ${theme.muted(
        `(${commitLabel})`,
      )} ${theme.muted("—")} ${theme.accentDim(tagline)}`;
    }
    const line1 = `${theme.heading(title)} ${theme.info(version)} ${theme.muted(
      `(${commitLabel})`,
    )}`;
    if (!tagline) {
      return line1;
    }
    const line2 = `${" ".repeat(prefix.length)}${theme.accentDim(tagline)}`;
    return `${line1}\n${line2}`;
  }
  if (fitsOnOneLine) {
    return plainFullLine;
  }
  const line1 = plainBaseLine;
  if (!tagline) {
    return line1;
  }
  const line2 = `${" ".repeat(prefix.length)}${tagline}`;
  return `${line1}\n${line2}`;
}

const IRONCLIW_ASCII = [
  "  ___ ____   ___  _   _  ____ _     _____        __ ",
  " |_ _|  _ \\ / _ \\| \\ | |/ ___| |   |_ _\\ \\      / / ",
  "  | || |_) | | | |  \\| | |   | |    | | \\ \\ /\\ / /  ",
  "  | ||  _ <| |_| | |\\  | |___| |___ | |  \\ V  V /   ",
  " |___|_| \\_\\\\___/|_| \\_|\\____|_____|___|  \\_/\\_/    ",
  "                                                    ",
  "                  🦾 IronCliw 🦾                    ",
  " ",
];

export function formatCliBannerArt(options: BannerOptions = {}): string {
  const rich = options.richTty ?? isRich();
  if (!rich) {
    return IRONCLIW_ASCII.join("\n");
  }

  const colored = IRONCLIW_ASCII.map((line) => {
    if (line.includes("IronCliw")) {
      return (
        theme.muted("              ") +
        theme.accent("🦾") +
        theme.info(" IronCliw ") +
        theme.accent("🦾")
      );
    }
    return theme.accent(line);
  });

  return colored.join("\n");
}

export function emitCliBanner(version: string, options: BannerOptions = {}) {
  if (bannerEmitted) {
    return;
  }
  const argv = options.argv ?? process.argv;
  if (!process.stdout.isTTY) {
    return;
  }
  if (hasJsonFlag(argv)) {
    return;
  }
  if (hasVersionFlag(argv)) {
    return;
  }
  const line = formatCliBannerLine(version, options);
  process.stdout.write(`\n${line}\n\n`);
  bannerEmitted = true;
}

export function hasEmittedCliBanner(): boolean {
  return bannerEmitted;
}
