import { execSync } from "child_process";

try {
  execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
  execSync("git config core.hooksPath git-hooks", { stdio: "ignore" });
} catch {
  // Not a git repo or git not available — skip silently (e.g. npm global install)
}
