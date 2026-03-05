import { createHash } from "node:crypto";
import { promises as fs, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const HASH_FILE = path.join(ROOT_DIR, "src/canvas-host/a2ui/.bundle.hash");
const OUTPUT_FILE = path.join(ROOT_DIR, "src/canvas-host/a2ui/a2ui.bundle.js");
const A2UI_RENDERER_DIR = path.join(ROOT_DIR, "vendor/a2ui/renderers/lit");
const A2UI_APP_DIR = path.join(ROOT_DIR, "apps/shared/IronCliwKit/Tools/CanvasA2UI");

async function main() {
  if (!existsSync(A2UI_RENDERER_DIR) || !existsSync(A2UI_APP_DIR)) {
    if (existsSync(OUTPUT_FILE)) {
      console.log("A2UI sources missing; keeping prebuilt bundle.");
      process.exit(0);
    }
    console.error(`A2UI sources missing and no prebuilt bundle found at: ${OUTPUT_FILE}`);
    process.exit(1);
  }

  const inputPaths = [
    path.join(ROOT_DIR, "package.json"),
    path.join(ROOT_DIR, "pnpm-lock.yaml"),
    A2UI_RENDERER_DIR,
    A2UI_APP_DIR,
  ];

  const currentHash = await computeHash(inputPaths);

  if (existsSync(HASH_FILE)) {
    const previousHash = await fs.readFile(HASH_FILE, "utf-8");
    if (previousHash.trim() === currentHash && existsSync(OUTPUT_FILE)) {
      console.log("A2UI bundle up to date; skipping.");
      process.exit(0);
    }
  }

  console.log("Bundling A2UI...");
  
  try {
    // Run tsc
    execSync(`pnpm -s exec tsc -p "${path.join(A2UI_RENDERER_DIR, "tsconfig.json")}"`, { stdio: "inherit" });
    
    // Run rolldown
    const rolldownConfig = path.join(A2UI_APP_DIR, "rolldown.config.mjs");
    try {
      execSync(`rolldown -c "${rolldownConfig}"`, { stdio: "inherit" });
    } catch {
      execSync(`pnpm -s dlx rolldown -c "${rolldownConfig}"`, { stdio: "inherit" });
    }

    await fs.writeFile(HASH_FILE, currentHash);
    console.log("A2UI bundle updated.");
  } catch (err) {
    console.error("A2UI bundling failed.");
    console.error(err);
    process.exit(1);
  }
}

async function computeHash(inputs) {
  const files = [];

  async function walk(entryPath) {
    const st = await fs.stat(entryPath);
    if (st.isDirectory()) {
      const entries = await fs.readdir(entryPath);
      for (const entry of entries) {
        await walk(path.join(entryPath, entry));
      }
      return;
    }
    files.push(entryPath);
  }

  for (const input of inputs) {
    if (existsSync(input)) {
      await walk(input);
    }
  }

  files.sort((a, b) => a.localeCompare(b));

  const hash = createHash("sha256");
  for (const filePath of files) {
    const rel = path.relative(ROOT_DIR, filePath).split(path.sep).join("/");
    hash.update(rel);
    hash.update("\0");
    hash.update(await fs.readFile(filePath));
    hash.update("\0");
  }

  return hash.digest("hex");
}

main();
