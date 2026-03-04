import { createHash } from "node:crypto";
import fs from "node:fs";
import { promises as fsPromises } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const HASH_FILE = path.join(ROOT_DIR, "src", "canvas-host", "a2ui", ".bundle.hash");
const OUTPUT_FILE = path.join(ROOT_DIR, "src", "canvas-host", "a2ui", "a2ui.bundle.js");
const A2UI_RENDERER_DIR = path.join(ROOT_DIR, "vendor", "a2ui", "renderers", "lit");
const A2UI_APP_DIR = path.join(ROOT_DIR, "apps", "shared", "IroncliwKit", "Tools", "CanvasA2UI");

async function walk(entryPath, files) {
  const st = await fsPromises.stat(entryPath);
  if (st.isDirectory()) {
    const entries = await fsPromises.readdir(entryPath);
    for (const entry of entries) {
      await walk(path.join(entryPath, entry), files);
    }
    return;
  }
  files.push(entryPath);
}

async function computeHash(inputPaths) {
  const files = [];
  for (const input of inputPaths) {
    if (fs.existsSync(input)) {
        await walk(input, files);
    }
  }

  function normalize(p) {
    return p.split(path.sep).join("/");
  }

  files.sort((a, b) => normalize(a).localeCompare(normalize(b)));

  const hash = createHash("sha256");
  for (const filePath of files) {
    const rel = normalize(path.relative(ROOT_DIR, filePath));
    hash.update(rel);
    hash.update("\0");
    hash.update(await fsPromises.readFile(filePath));
    hash.update("\0");
  }

  return hash.digest("hex");
}

async function main() {
  const sourcesExist = fs.existsSync(A2UI_RENDERER_DIR) && fs.existsSync(A2UI_APP_DIR);

  if (!sourcesExist) {
    if (fs.existsSync(OUTPUT_FILE)) {
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

  if (fs.existsSync(HASH_FILE)) {
    const previousHash = await fsPromises.readFile(HASH_FILE, "utf-8");
    if (previousHash.trim() === currentHash && fs.existsSync(OUTPUT_FILE)) {
      console.log("A2UI bundle up to date; skipping.");
      process.exit(0);
    }
  }

  console.log("Bundling A2UI...");

  const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

  const tscResult = spawnSync(pnpm, ["-s", "exec", "tsc", "-p", path.join(A2UI_RENDERER_DIR, "tsconfig.json")], {
    stdio: "inherit",
    shell: true,
  });

  if (tscResult.status !== 0) {
    console.error("tsc failed");
    process.exit(tscResult.status ?? 1);
  }

  const rolldownArgs = ["-c", path.join(A2UI_APP_DIR, "rolldown.config.mjs")];

  // Check if rolldown is in path
  const rolldownCmd = process.platform === "win32" ? "rolldown.cmd" : "rolldown";
  const rolldownCheck = spawnSync(rolldownCmd, ["--version"], { shell: true });

  let rollResult;
  if (rolldownCheck.status === 0) {
    rollResult = spawnSync(rolldownCmd, rolldownArgs, { stdio: "inherit", shell: true });
  } else {
    rollResult = spawnSync(pnpm, ["-s", "dlx", "rolldown", ...rolldownArgs], {
      stdio: "inherit",
      shell: true,
    });
  }

  if (rollResult.status !== 0) {
    console.error("rolldown failed");
    process.exit(rollResult.status ?? 1);
  }

  await fsPromises.writeFile(HASH_FILE, currentHash);
  console.log("A2UI bundling completed.");
}

main().catch((err) => {
  console.error("A2UI bundling failed:", err);
  process.exit(1);
});
