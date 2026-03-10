import { WebSocket } from "ws";

export interface PoolConfig {
  minConnections: number;
  maxConnections: number;
  healthCheckIntervalMs: number;
  reconnectBaseDelayMs: number;
  maxReconnectDelayMs: number;
}

const ACQUIRE_TIMEOUT_MS = 30_000;

type Waiter = {
  resolve: (ws: WebSocket) => void;
  reject: (err: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

export class ConnectionPool {
  private connections: Set<WebSocket> = new Set();
  private available: WebSocket[] = [];
  private waiters: Waiter[] = [];
  private config: PoolConfig;
  private healthCheckTimer?: NodeJS.Timeout;
  private reconnectAttempts: Map<string, number> = new Map();
  private shutdownRequested = false;

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

  public acquire(): Promise<WebSocket> {
    if (this.available.length > 0) {
      return Promise.resolve(this.available.shift()!);
    }

    if (this.connections.size < this.config.maxConnections) {
      this.createNewConnection();
    }

    return new Promise<WebSocket>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const idx = this.waiters.findIndex((w) => w.timeoutId === timeoutId);
        if (idx !== -1) {
          this.waiters.splice(idx, 1);
        }
        reject(new Error(`[ConnectionPool] acquire() timed out after ${ACQUIRE_TIMEOUT_MS}ms`));
      }, ACQUIRE_TIMEOUT_MS);

      this.waiters.push({ resolve, reject, timeoutId });
    });
  }

  public release(ws: WebSocket) {
    if (ws.readyState === WebSocket.OPEN) {
      if (this.waiters.length > 0) {
        const waiter = this.waiters.shift()!;
        clearTimeout(waiter.timeoutId);
        waiter.resolve(ws);
      } else {
        this.available.push(ws);
      }
    } else {
      this.connections.delete(ws);
      if (!this.shutdownRequested) {
        this.reconnect(ws.url);
      }
    }
  }

  private createNewConnection(url = "ws://localhost:18789"): WebSocket {
    const ws = new WebSocket(url);
    this.connections.add(ws);

    ws.on("open", () => {
      this.reconnectAttempts.delete(url);
      if (this.waiters.length > 0) {
        const waiter = this.waiters.shift()!;
        clearTimeout(waiter.timeoutId);
        waiter.resolve(ws);
      } else {
        this.available.push(ws);
      }
    });

    ws.on("close", () => {
      this.connections.delete(ws);
      this.available = this.available.filter((c) => c !== ws);
      if (!this.shutdownRequested) {
        this.reconnect(url);
      }
    });

    ws.on("error", (err: unknown) => {
      if ((err as { code?: string }).code === "ECONNREFUSED") {
        return;
      }
      console.error("[ConnectionPool] WebSocket error:", err);
    });

    return ws;
  }

  private reconnect(url: string) {
    if (this.shutdownRequested) {
      return;
    }
    if (this.connections.size >= this.config.minConnections) {
      return;
    }

    const attempt = (this.reconnectAttempts.get(url) ?? 0) + 1;
    this.reconnectAttempts.set(url, attempt);

    const delay = Math.min(
      this.config.reconnectBaseDelayMs * Math.pow(2, attempt - 1),
      this.config.maxReconnectDelayMs,
    );

    setTimeout(() => {
      if (!this.shutdownRequested && this.connections.size < this.config.minConnections) {
        this.createNewConnection(url);
      }
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
    this.healthCheckTimer.unref();
  }

  public shutdown() {
    this.shutdownRequested = true;
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    this.reconnectAttempts.clear();
    for (const waiter of this.waiters) {
      clearTimeout(waiter.timeoutId);
      waiter.reject(new Error("[ConnectionPool] pool shut down"));
    }
    this.waiters = [];
    for (const ws of this.connections) {
      ws.close();
    }
    this.connections.clear();
    this.available = [];
  }
}
