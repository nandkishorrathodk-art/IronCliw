import fs from "node:fs/promises";
import path from "node:path";
import { listAgentIds, resolveAgentWorkspaceDir } from "../agents/agent-scope.js";
import { resolveMemorySearchConfig } from "../agents/memory-search.js";
import type { IronCliwConfig } from "../config/config.js";
import { resolveStateDir } from "../config/paths.js";
import { resolveMemoryBackendConfig } from "../memory/backend-config.js";
import { getMemorySearchManager } from "../memory/index.js";

const MEMORY_STUB = "# Memory\n\nAgent long-term memory lives here.\n";
const MODEL_DEFAULTS_STUB = "{}\n";

export async function ensureWorkspaceMemoryFiles(params: {
  cfg: IronCliwConfig;
  log: { info?: (msg: string) => void; warn: (msg: string) => void };
}): Promise<void> {
  const agentIds = listAgentIds(params.cfg);
  const candidates = agentIds.length > 0 ? agentIds : ["main"];
  for (const agentId of candidates) {
    try {
      const workspaceDir = resolveAgentWorkspaceDir(params.cfg, agentId);
      await fs.mkdir(workspaceDir, { recursive: true });
      const memoryFile = path.join(workspaceDir, "MEMORY.md");
      const memoryDir = path.join(workspaceDir, "memory");
      await fs.mkdir(memoryDir, { recursive: true });
      try {
        await fs.access(memoryFile);
      } catch {
        await fs.writeFile(memoryFile, MEMORY_STUB, { encoding: "utf-8", flag: "wx" });
        params.log.info?.(`[workspace] created ${memoryFile}`);
      }
    } catch (err) {
      params.log.warn(`[workspace] failed to ensure memory files for agent "${agentId}": ${String(err)}`);
    }
  }
}

export async function ensureConfigFiles(params: {
  log: { info?: (msg: string) => void; warn: (msg: string) => void };
}): Promise<void> {
  try {
    const stateDir = resolveStateDir(process.env);
    const configDir = path.join(stateDir, "config");
    await fs.mkdir(configDir, { recursive: true });
    const modelDefaultsFile = path.join(configDir, "model-defaults.json");
    try {
      await fs.access(modelDefaultsFile);
    } catch {
      await fs.writeFile(modelDefaultsFile, MODEL_DEFAULTS_STUB, { encoding: "utf-8", flag: "wx" });
      params.log.info?.(`[config] created ${modelDefaultsFile}`);
    }
  } catch (err) {
    params.log.warn(`[config] failed to ensure config files: ${String(err)}`);
  }
}

export async function startGatewayMemoryBackend(params: {
  cfg: IronCliwConfig;
  log: { info?: (msg: string) => void; warn: (msg: string) => void };
}): Promise<void> {
  const agentIds = listAgentIds(params.cfg);
  for (const agentId of agentIds) {
    if (!resolveMemorySearchConfig(params.cfg, agentId)) {
      continue;
    }
    const resolved = resolveMemoryBackendConfig({ cfg: params.cfg, agentId });
    if (resolved.backend !== "qmd" || !resolved.qmd) {
      continue;
    }

    const { manager, error } = await getMemorySearchManager({ cfg: params.cfg, agentId });
    if (!manager) {
      params.log.warn(
        `qmd memory startup initialization failed for agent "${agentId}": ${error ?? "unknown error"}`,
      );
      continue;
    }
    params.log.info?.(`qmd memory startup initialization armed for agent "${agentId}"`);
  }
}
