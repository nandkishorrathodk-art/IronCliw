import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  target: string;
  status: "success" | "failed" | "denied";
  durationMs?: number;
  metadata?: unknown;
}

export class AuditLogger {
  private logDirectory: string;

  constructor(logDirectory = path.join(process.cwd(), "logs", "audit")) {
    this.logDirectory = logDirectory;
  }

  public async initialize() {
    await fs.mkdir(this.logDirectory, { recursive: true });
  }

  public async log(entry: Omit<AuditEntry, "id" | "timestamp">) {
    if (!this.logDirectory) {return;} // Not initialized

    const fullEntry: AuditEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };

    // ELK-compatible JSON line
    const logLine = JSON.stringify(fullEntry) + "\n";
    
    // Rotate files daily: audit-YYYY-MM-DD.log
    const dateStr = fullEntry.timestamp.split("T")[0];
    const filePath = path.join(this.logDirectory, `audit-${dateStr}.log`);

    await fs.appendFile(filePath, logLine, "utf-8");
  }
}
