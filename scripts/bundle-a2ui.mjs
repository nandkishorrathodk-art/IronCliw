#!/usr/bin/env node
import { execSync } from "node:child_process";
/**
 * Windows-compatible replacement for bundle-a2ui.sh
 * Bundles the A2UI canvas component, or creates a stub if sources are missing.
 */
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

const HASH_FILE = path.join(ROOT_DIR, "src/canvas-host/a2ui/.bundle.hash");
const OUTPUT_FILE = path.join(ROOT_DIR, "src/canvas-host/a2ui/a2ui.bundle.js");
const A2UI_RENDERER_DIR = path.join(ROOT_DIR, "vendor/a2ui/renderers/lit");
const A2UI_APP_DIR = path.join(ROOT_DIR, "apps/shared/IronCliwKit/Tools/CanvasA2UI");

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function isDir(p) {
  try {
    const st = await fs.stat(p);
    return st.isDirectory();
  } catch {
    return false;
  }
}

async function walk(entryPath, files = []) {
  const st = await fs.stat(entryPath);
  if (st.isDirectory()) {
    const entries = await fs.readdir(entryPath);
    for (const entry of entries) {
      await walk(path.join(entryPath, entry), files);
    }
  } else {
    files.push(entryPath);
  }
  return files;
}

function normalize(p) {
  return p.split(path.sep).join("/");
}

async function computeHash(inputPaths) {
  const files = [];
  for (const inputPath of inputPaths) {
    if (await exists(inputPath)) {
      await walk(inputPath, files);
    }
  }
  files.sort((a, b) => normalize(a).localeCompare(normalize(b)));

  const hash = createHash("sha256");
  for (const filePath of files) {
    const rel = normalize(path.relative(ROOT_DIR, filePath));
    hash.update(rel);
    hash.update("\0");
    hash.update(await fs.readFile(filePath));
    hash.update("\0");
  }
  return hash.digest("hex");
}

async function main() {
  const rendererExists = await isDir(A2UI_RENDERER_DIR);
  const appExists = await isDir(A2UI_APP_DIR);

  if (!rendererExists || !appExists) {
    if (await exists(OUTPUT_FILE)) {
      console.log("A2UI sources missing; keeping prebuilt bundle.");
      process.exit(0);
    }
    // Sources missing and no prebuilt — create a stub so the build can continue
    console.log("A2UI sources missing and no prebuilt bundle found; creating stub bundle.");
    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
    await fs.writeFile(
      OUTPUT_FILE,
      "// A2UI stub — sources not available on this platform\nexport default {};\n",
    );
    process.exit(0);
  }

  const inputPaths = [
    path.join(ROOT_DIR, "package.json"),
    path.join(ROOT_DIR, "pnpm-lock.yaml"),
    A2UI_RENDERER_DIR,
    A2UI_APP_DIR,
  ];

  const currentHash = await computeHash(inputPaths);

  if (await exists(HASH_FILE)) {
    const previousHash = (await fs.readFile(HASH_FILE, "utf8")).trim();
    if (previousHash === currentHash && (await exists(OUTPUT_FILE))) {
      console.log("A2UI bundle up to date; skipping.");
      process.exit(0);
    }
  }

  console.log("Building A2UI bundle...");

  const tsconfigPath = path.join(A2UI_RENDERER_DIR, "tsconfig.json");
  execSync(`pnpm -s exec tsc -p "${tsconfigPath}"`, { stdio: "inherit", cwd: ROOT_DIR });

  const rolldownConfig = path.join(A2UI_APP_DIR, "rolldown.config.mjs");
  try {
    execSync(`rolldown -c "${rolldownConfig}"`, { stdio: "inherit", cwd: ROOT_DIR });
  } catch {
    execSync(`pnpm -s dlx rolldown -c "${rolldownConfig}"`, { stdio: "inherit", cwd: ROOT_DIR });
  }

  await fs.mkdir(path.dirname(HASH_FILE), { recursive: true });
  await fs.writeFile(HASH_FILE, currentHash);
  console.log("A2UI bundle complete.");
}

main().catch((err) => {
  console.error("A2UI bundling failed:", err.message);
  console.error("Re-run with: pnpm canvas:a2ui:bundle");
  process.exit(1);
});
