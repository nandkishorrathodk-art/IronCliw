import chalk, { Chalk } from "chalk";
import { IRONCLIW_PALETTE } from "./palette.js";

const hasForceColor =
  typeof process.env.FORCE_COLOR === "string" &&
  process.env.FORCE_COLOR.trim().length > 0 &&
  process.env.FORCE_COLOR.trim() !== "0";

const baseChalk = process.env.NO_COLOR && !hasForceColor ? new Chalk({ level: 0 }) : chalk;

const hex = (value: string) => baseChalk.hex(value);

export const theme = {
  accent: hex(IRONCLIW_PALETTE.accent),
  accentBright: hex(IRONCLIW_PALETTE.accentBright),
  accentDim: hex(IRONCLIW_PALETTE.accentDim),
  info: hex(IRONCLIW_PALETTE.info),
  success: hex(IRONCLIW_PALETTE.success),
  warn: hex(IRONCLIW_PALETTE.warn),
  error: hex(IRONCLIW_PALETTE.error),
  muted: hex(IRONCLIW_PALETTE.muted),
  heading: baseChalk.bold.hex(IRONCLIW_PALETTE.accent),
  command: hex(IRONCLIW_PALETTE.accentBright),
  option: hex(IRONCLIW_PALETTE.warn),
} as const;

export const isRich = () => Boolean(baseChalk.level > 0);

export const colorize = (rich: boolean, color: (value: string) => string, value: string) =>
  rich ? color(value) : value;
