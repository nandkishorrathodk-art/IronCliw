export type SandboxAction = "allow" | "deny" | "require_approval";

export class SandboxEngine {
  // Safe commands that don't require deep inspection
  private readonly whitelist = new Set([
    "echo",
    "dir",
    "ls",
    "pwd",
    "whoami",
    "date",
    "get-content",
    "cat",
  ]);

  // Commands that inherently change system state or interact with desktop
  private readonly dangerousPatterns = [
    /^rm\s+-rf/i,
    /^del\s+-force/i,
    /reg\s+add/i,
    /reg\s+delete/i,
    /stop-service/i,
    /net\s+user/i,
    /format\s+/i,
    /mouse_event/i, // Desktop automation check
    /SendKeys/i, // Desktop automation check
    /CopyFromScreen/i, // Screen capture check
  ];

  public validateCommand(command: string): SandboxAction {
    const baseCommand = command.trim().split(/\s+/)[0].toLowerCase();

    if (this.whitelist.has(baseCommand)) {
      return "allow";
    }

    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(command)) {
        return "require_approval";
      }
    }

    // Default to requiring human approval for unknown commands
    return "require_approval";
  }

  public generateDryRunPlan(command: string): string {
    return `[DRY RUN] Will execute in PowerShell Runspace:\n> ${command}\nWarning: Check target paths carefully.`;
  }
}
