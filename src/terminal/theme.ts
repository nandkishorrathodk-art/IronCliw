import chalk, { Chalk } from "chalk";
import { ironcliw_PALETTE } from "./palette.js";

const hasForceColor =
  typeof process.env.FORCE_COLOR === "string" &&
  process.env.FORCE_COLOR.trim().length > 0 &&
  process.env.FORCE_COLOR.trim() !== "0";

const baseChalk = process.env.NO_COLOR && !hasForceColor ? new Chalk({ level: 0 }) : chalk;

const hex = (value: string) => baseChalk.hex(value);

export const theme = {
  accent: hex(ironcliw_PALETTE.accent),
  accentBright: hex(ironcliw_PALETTE.accentBright),
  accentDim: hex(ironcliw_PALETTE.accentDim),
  info: hex(ironcliw_PALETTE.info),
  success: hex(ironcliw_PALETTE.success),
  warn: hex(ironcliw_PALETTE.warn),
  error: hex(ironcliw_PALETTE.error),
  muted: hex(ironcliw_PALETTE.muted),
  heading: baseChalk.bold.hex(ironcliw_PALETTE.accent),
  command: hex(ironcliw_PALETTE.accentBright),
  option: hex(ironcliw_PALETTE.warn),
} as const;

export const isRich = () => Boolean(baseChalk.level > 0);

export const colorize = (rich: boolean, color: (value: string) => string, value: string) =>
  rich ? color(value) : value;

