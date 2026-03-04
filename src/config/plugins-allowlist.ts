import type { IroncliwConfig } from "./config.js";

export function ensurePluginAllowlisted(cfg: IroncliwConfig, pluginId: string): IroncliwConfig {
  const allow = cfg.plugins?.allow;
  if (!Array.isArray(allow) || allow.includes(pluginId)) {
    return cfg;
  }
  return {
    ...cfg,
    plugins: {
      ...cfg.plugins,
      allow: [...allow, pluginId],
    },
  };
}

