import fs from "node:fs/promises";
import path from "node:path";
import {
  getRuntimeConfigSnapshot,
  getRuntimeConfigSourceSnapshot,
  type IronCliwConfig,
  loadConfig,
} from "../config/config.js";
import { createConfigRuntimeEnv } from "../config/env-vars.js";
import { resolveIronCliwAgentDir } from "./agent-paths.js";
import { planIronCliwModelsJson } from "./models-config.plan.js";

const MODELS_JSON_WRITE_LOCKS = new Map<string, Promise<void>>();

const MODELS_JSON_SKIP_CACHE = new Map<string, { cfgRef: IronCliwConfig; agentDir: string }>();

async function readExistingModelsFile(pathname: string): Promise<{
  raw: string;
  parsed: unknown;
}> {
  try {
    const raw = await fs.readFile(pathname, "utf8");
    return {
      raw,
      parsed: JSON.parse(raw) as unknown,
    };
  } catch {
    return {
      raw: "",
      parsed: null,
    };
  }
}

async function ensureModelsFileMode(pathname: string): Promise<void> {
  await fs.chmod(pathname, 0o600).catch(() => {
    // best-effort
  });
}

async function writeModelsFileAtomic(targetPath: string, contents: string): Promise<void> {
  const tempPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, contents, { mode: 0o600 });
  await fs.rename(tempPath, targetPath);
}

function resolveModelsConfigInput(config?: IronCliwConfig): IronCliwConfig {
  const runtimeSource = getRuntimeConfigSourceSnapshot();
  if (!runtimeSource) {
    return config ?? loadConfig();
  }
  if (!config) {
    return runtimeSource;
  }
  const runtimeResolved = getRuntimeConfigSnapshot();
  if (runtimeResolved && config === runtimeResolved) {
    return runtimeSource;
  }
  return config;
}

async function withModelsJsonWriteLock<T>(targetPath: string, run: () => Promise<T>): Promise<T> {
  const prior = MODELS_JSON_WRITE_LOCKS.get(targetPath) ?? Promise.resolve();
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const pending = prior.then(() => gate);
  MODELS_JSON_WRITE_LOCKS.set(targetPath, pending);
  try {
    await prior;
    return await run();
  } finally {
    release();
    if (MODELS_JSON_WRITE_LOCKS.get(targetPath) === pending) {
      MODELS_JSON_WRITE_LOCKS.delete(targetPath);
    }
  }
}

export async function ensureIronCliwModelsJson(
  config?: IronCliwConfig,
  agentDirOverride?: string,
): Promise<{ agentDir: string; wrote: boolean }> {
  const cfg = resolveModelsConfigInput(config);
  const agentDir = agentDirOverride?.trim() ? agentDirOverride.trim() : resolveIronCliwAgentDir();
  const targetPath = path.join(agentDir, "models.json");

  const cached = MODELS_JSON_SKIP_CACHE.get(targetPath);
  if (cached && cached.cfgRef === cfg && cached.agentDir === agentDir) {
    return { agentDir, wrote: false };
  }

  return await withModelsJsonWriteLock(targetPath, async () => {
    const cached2 = MODELS_JSON_SKIP_CACHE.get(targetPath);
    if (cached2 && cached2.cfgRef === cfg && cached2.agentDir === agentDir) {
      return { agentDir, wrote: false };
    }

    // Ensure config env vars (e.g. AWS_PROFILE, AWS_ACCESS_KEY_ID) are
    // are available to provider discovery without mutating process.env.
    const env = createConfigRuntimeEnv(cfg);
    const existingModelsFile = await readExistingModelsFile(targetPath);
    const plan = await planIronCliwModelsJson({
      cfg,
      agentDir,
      env,
      existingRaw: existingModelsFile.raw,
      existingParsed: existingModelsFile.parsed,
    });

    if (plan.action === "skip") {
      MODELS_JSON_SKIP_CACHE.set(targetPath, { cfgRef: cfg, agentDir });
      return { agentDir, wrote: false };
    }

    if (plan.action === "noop") {
      await ensureModelsFileMode(targetPath);
      MODELS_JSON_SKIP_CACHE.set(targetPath, { cfgRef: cfg, agentDir });
      return { agentDir, wrote: false };
    }

    MODELS_JSON_SKIP_CACHE.delete(targetPath);
    await fs.mkdir(agentDir, { recursive: true, mode: 0o700 });
    await writeModelsFileAtomic(targetPath, plan.contents);
    await ensureModelsFileMode(targetPath);
    return { agentDir, wrote: true };
  });
}
