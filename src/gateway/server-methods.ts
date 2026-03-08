import { formatControlPlaneActor, resolveControlPlaneActor } from "./control-plane-audit.js";
import { consumeControlPlaneWriteBudget } from "./control-plane-rate-limit.js";
import { ADMIN_SCOPE, authorizeOperatorScopesForMethod } from "./method-scopes.js";
import { ErrorCodes, errorShape } from "./protocol/index.js";
import { isRoleAuthorizedForMethod, parseGatewayRole } from "./role-policy.js";
import { agentHandlers } from "./server-methods/agent.js";
import { agentsHandlers } from "./server-methods/agents.js";
import { browserHandlers } from "./server-methods/browser.js";
import { channelsHandlers } from "./server-methods/channels.js";
import { chatHandlers } from "./server-methods/chat.js";
import { configHandlers } from "./server-methods/config.js";
import { connectHandlers } from "./server-methods/connect.js";
import { cronHandlers } from "./server-methods/cron.js";
import { deviceHandlers } from "./server-methods/devices.js";
import { doctorHandlers } from "./server-methods/doctor.js";
import { execApprovalsHandlers } from "./server-methods/exec-approvals.js";
import { healthHandlers } from "./server-methods/health.js";
import { logsHandlers } from "./server-methods/logs.js";
import { modelsHandlers } from "./server-methods/models.js";
import { nodeHandlers } from "./server-methods/nodes.js";
import { pushHandlers } from "./server-methods/push.js";
import { sendHandlers } from "./server-methods/send.js";
import { sessionsHandlers } from "./server-methods/sessions.js";
import { skillsHandlers } from "./server-methods/skills.js";
import { systemHandlers } from "./server-methods/system.js";
import { talkHandlers } from "./server-methods/talk.js";
import { toolsCatalogHandlers } from "./server-methods/tools-catalog.js";
import { ttsHandlers } from "./server-methods/tts.js";
import type { GatewayRequestHandlers, GatewayRequestOptions } from "./server-methods/types.js";
import { updateHandlers } from "./server-methods/update.js";
import { usageHandlers } from "./server-methods/usage.js";
import { voicewakeHandlers } from "./server-methods/voicewake.js";
import { webHandlers } from "./server-methods/web.js";
import { visionHandlers } from "./server-methods/vision.js";
import { wizardHandlers } from "./server-methods/wizard.js";
import { desktopHandlers } from "./server-methods/desktop.js";
import { ParallelExecutor, Task } from "../muscle/parallel-executor.js";
import { AuditLogger } from "../security/audit-logger.js";
import { RateLimiter } from "../security/rate-limiter.js";
import { PluginManager } from "../plugins/plugin-manager.js";

let auditLogger: AuditLogger;
export function setAuditLogger(instance: AuditLogger) {
  auditLogger = instance;
}

const globalRateLimiter = new RateLimiter();
const pluginManager = new PluginManager();
void pluginManager.discoverAndLoad();

const CONTROL_PLANE_WRITE_METHODS = new Set(["config.apply", "config.patch", "update.run"]);
function authorizeGatewayMethod(method: string, client: GatewayRequestOptions["client"]) {
  if (!client?.connect) {
    return null;
  }
  if (method === "health") {
    return null;
  }
  const roleRaw = client.connect.role ?? "operator";
  const role = parseGatewayRole(roleRaw);
  if (!role) {
    return errorShape(ErrorCodes.INVALID_REQUEST, `unauthorized role: ${roleRaw}`);
  }
  const scopes = client.connect.scopes ?? [];
  if (!isRoleAuthorizedForMethod(role, method)) {
    return errorShape(ErrorCodes.INVALID_REQUEST, `unauthorized role: ${role}`);
  }
  if (role === "node") {
    return null;
  }
  if (scopes.includes(ADMIN_SCOPE)) {
    return null;
  }
  const scopeAuth = authorizeOperatorScopesForMethod(method, scopes);
  if (!scopeAuth.allowed) {
    return errorShape(ErrorCodes.INVALID_REQUEST, `missing scope: ${scopeAuth.missingScope}`);
  }
  return null;
}

export const coreGatewayHandlers: GatewayRequestHandlers = {
  ...connectHandlers,
  ...logsHandlers,
  ...voicewakeHandlers,
  ...healthHandlers,
  ...channelsHandlers,
  ...chatHandlers,
  ...visionHandlers,
  ...cronHandlers,
  ...deviceHandlers,
  ...doctorHandlers,
  ...execApprovalsHandlers,
  ...webHandlers,
  ...modelsHandlers,
  ...configHandlers,
  ...wizardHandlers,
  ...talkHandlers,
  ...toolsCatalogHandlers,
  ...ttsHandlers,
  ...skillsHandlers,
  ...sessionsHandlers,
  ...systemHandlers,
  ...updateHandlers,
  ...nodeHandlers,
  ...pushHandlers,
  ...sendHandlers,
  ...usageHandlers,
  ...agentHandlers,
  ...agentsHandlers,
  ...browserHandlers,
  ...desktopHandlers,
  "execution.parallel": async ({ params, respond, context }) => {
    const { tasks: taskConfigs } = params as { tasks: Array<{ id: string, command: string, dependencies?: string[] }> };
    if (!Array.isArray(taskConfigs)) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "tasks must be an array"));
      return;
    }

    const executor = new ParallelExecutor();
    const tasks: Task[] = taskConfigs.map(tc => ({
      id: tc.id,
      execute: async () => {
        // Find the appropriate handler for the command
        const [method, ...args] = tc.command.split(" ");
        const handler = coreGatewayHandlers[method];
        if (!handler) {throw new Error(`Unknown method in parallel task: ${method}`);}
        
        return new Promise((resolve, reject) => {
          void handler({
            req: { id: tc.id, method, params: { args } },
            params: { args },
            respond: (success, result, error) => {
              if (success) {resolve(result);}
              else {reject(error);}
            },
            context,
          });
        });
      },
      dependencies: tc.dependencies
    }));

    executor.addTasks(tasks);
    const result = await executor.executeAll();
    respond(true, result);
  }
};

export async function handleGatewayRequest(
  opts: GatewayRequestOptions & { extraHandlers?: GatewayRequestHandlers },
): Promise<void> {
  const { req, respond, client, isWebchatConnect, context } = opts;

  // Global Rate Limiting
  const clientId = client?.connect?.id ?? "anonymous";
  if (!globalRateLimiter.consume(clientId)) {
    respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, "Rate limit exceeded (Phase 2 Security)"));
    return;
  }

  const startTime = Date.now();
  const authError = authorizeGatewayMethod(req.method, client);
  if (authError) {
    await auditLogger.log({
      user: clientId,
      action: req.method,
      target: "gateway",
      status: "denied",
      metadata: { error: authError.message }
    });
    respond(false, undefined, authError);
    return;
  }

  // Plugin Command Hook (Phase 3)
  const pluginIntercept = await pluginManager.hookCommand(req.method);
  if (pluginIntercept) {
    respond(true, { pluginResponse: pluginIntercept });
    return;
  }

  if (CONTROL_PLANE_WRITE_METHODS.has(req.method)) {
    const budget = consumeControlPlaneWriteBudget({ client });
    if (!budget.allowed) {
      const actor = resolveControlPlaneActor(client);
      context.logGateway.warn(
        `control-plane write rate-limited method=${req.method} ${formatControlPlaneActor(actor)} retryAfterMs=${budget.retryAfterMs} key=${budget.key}`,
      );
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.UNAVAILABLE,
          `rate limit exceeded for ${req.method}; retry after ${Math.ceil(budget.retryAfterMs / 1000)}s`,
          {
            retryable: true,
            retryAfterMs: budget.retryAfterMs,
            details: {
              method: req.method,
              limit: "3 per 60s",
            },
          },
        ),
      );
      return;
    }
  }
  const handler = opts.extraHandlers?.[req.method] ?? coreGatewayHandlers[req.method];
  if (!handler) {
    respond(
      false,
      undefined,
      errorShape(ErrorCodes.INVALID_REQUEST, `unknown method: ${req.method}`),
    );
    return;
  }
  
  const wrappedRespond = async (success: boolean, result?: unknown, error?: unknown) => {
    const duration = Date.now() - startTime;
    await auditLogger.log({
      user: clientId,
      action: req.method,
      target: "gateway",
      status: success ? "success" : "failed",
      durationMs: duration,
      metadata: { error: error?.message }
    });
    respond(success, result, error);
  };

  await handler({
    req,
    params: (req.params ?? {}) as Record<string, unknown>,
    client,
    isWebchatConnect,
    respond: wrappedRespond,
    context,
  });
}
