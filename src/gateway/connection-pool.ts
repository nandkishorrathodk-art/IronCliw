import { WebSocket } from "ws";

export interface PoolConfig {
  minConnections: number;
  maxConnections: number;
  healthCheckIntervalMs: number;
  reconnectBaseDelayMs: number;
  maxReconnectDelayMs: number;
}

export class ConnectionPool {
  private connections: Set<WebSocket> = new Set();
  private available: WebSocket[] = [];
  private config: PoolConfig;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(config?: Partial<PoolConfig>) {
    this.config = {
      minConnections: 2,
      maxConnections: 10,
      healthCheckIntervalMs: 30000,
      reconnectBaseDelayMs: 1000,
      maxReconnectDelayMs: 30000,
      ...config,
    };
  }

  public start() {
    for (let i = 0; i < this.config.minConnections; i++) {
      this.createNewConnection();
    }
    this.startHealthChecks();
  }

  public async acquire(): Promise<WebSocket> {
    if (this.available.length > 0) {
      return this.available.pop()!;
    }
    
    if (this.connections.size < this.config.maxConnections) {
      return this.createNewConnection();
    }

    // Wait for a connection to become available
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.available.length > 0) {
          clearInterval(checkInterval);
          resolve(this.available.pop()!);
        }
      }, 50);
    });
  }

  public release(ws: WebSocket) {
    if (ws.readyState === WebSocket.OPEN) {
      this.available.push(ws);
    } else {
      this.connections.delete(ws);
      this.reconnect(ws.url);
    }
  }

  private createNewConnection(url = "ws://localhost:18789"): WebSocket {
    const ws = new WebSocket(url);
    this.connections.add(ws);
    
    ws.on("open", () => {
      this.available.push(ws);
    });

    ws.on("close", () => {
      this.connections.delete(ws);
      this.available = this.available.filter(c => c !== ws);
      this.reconnect(url);
    });

    ws.on("error", (err: unknown) => {
      if ((err as { code?: string }).code === "ECONNREFUSED") {
        // Silent during startup/reconnect noise
        return;
      }
      console.error("[ConnectionPool] WebSocket error:", err);
    });

    return ws;
  }

  private reconnect(url: string, attempt = 1) {
    if (this.connections.size >= this.config.minConnections) {return;}

    const delay = Math.min(
      this.config.reconnectBaseDelayMs * Math.pow(2, attempt),
      this.config.maxReconnectDelayMs
    );

    setTimeout(() => {
      console.log(`[ConnectionPool] Reconnecting... (Attempt ${attempt})`);
      this.createNewConnection(url);
    }, delay);
  }

  private startHealthChecks() {
    this.healthCheckTimer = setInterval(() => {
      for (const ws of this.connections) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      }
    }, this.config.healthCheckIntervalMs);
  }

  public shutdown() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    for (const ws of this.connections) {
      ws.close();
    }
    this.connections.clear();
    this.available = [];
  }
}
