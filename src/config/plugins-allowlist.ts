import type { IronCliwConfig } from "./config.js";

export function ensurePluginAllowlisted(cfg: IronCliwConfig, pluginId: string): IronCliwConfig {
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
