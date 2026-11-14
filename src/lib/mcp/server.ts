import { executeTool } from "./registry";
import { listResources, readResource } from "./resources";
import { ALL_TOOLS, TOOLS_BY_NAME } from "./tools";

/** Newest first; the first entry is the fallback for unknown client versions. */
export const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"] as const;
export const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];

export const SERVER_INFO = { name: "scriptly-admin", title: "ScriptlyStore Admin", version: "2.0.0" };

const INSTRUCTIONS = `ScriptlyStore admin control plane (full admin access to the live store database).
- Money: catalog amounts (product price, orders, coupons, payouts, affiliate commissions) are integer USD cents; payment links are integer INR paise. Outputs give {amount, unit, formatted}. Read scriptly://guide/money if unsure.
- Lists are paginated (limit <= 100, offset); responses include total and nextOffset.
- Tools that delete data, record money movements or touch many rows require confirm: true. Ask the human before setting it.
- Orders are read-only. Recording a payout or marking a commission paid only logs a transfer you already made; it does not send money.
- Admin roles cannot be changed here (ADMIN_EMAILS is authoritative).
- Start with site_overview, products_list or categories_list to orient.`;

export type JsonRpcId = string | number;
export type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: JsonRpcId | null; result: unknown }
  | { jsonrpc: "2.0"; id: JsonRpcId | null; error: { code: number; message: string; data?: unknown } };

export const RPC = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  RESOURCE_NOT_FOUND: -32002,
} as const;

export function rpcError(id: JsonRpcId | null, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function ok(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function negotiateProtocolVersion(requested: unknown): string {
  return typeof requested === "string" && (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(requested)
    ? requested
    : LATEST_PROTOCOL_VERSION;
}

let toolListCache: unknown[] | null = null;
function toolList() {
  toolListCache ??= ALL_TOOLS.map((t) => ({
    name: t.name,
    title: t.title,
    description: t.description,
    inputSchema: t.inputSchema,
    annotations: t.annotations,
  }));
  return toolListCache;
}

async function dispatch(id: JsonRpcId, method: string, params: unknown): Promise<JsonRpcResponse> {
  switch (method) {
    case "initialize": {
      const p = isObject(params) ? params : {};
      return ok(id, {
        protocolVersion: negotiateProtocolVersion(p.protocolVersion),
        capabilities: {
          tools: { listChanged: false },
          resources: { subscribe: false, listChanged: false },
          prompts: { listChanged: false },
        },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, { tools: toolList() });
    case "tools/call": {
      if (!isObject(params) || typeof params.name !== "string") {
        return rpcError(id, RPC.INVALID_PARAMS, "tools/call requires params.name (string).");
      }
      const tool = TOOLS_BY_NAME.get(params.name);
      if (!tool) return rpcError(id, RPC.INVALID_PARAMS, `Unknown tool: ${params.name.slice(0, 100)}`);
      const args = params.arguments ?? {};
      if (!isObject(args)) return rpcError(id, RPC.INVALID_PARAMS, "params.arguments must be an object.");
      return ok(id, await executeTool(tool, args));
    }
    case "resources/list":
      return ok(id, { resources: listResources() });
    case "resources/templates/list":
      return ok(id, { resourceTemplates: [] });
    case "resources/read": {
      if (!isObject(params) || typeof params.uri !== "string") {
        return rpcError(id, RPC.INVALID_PARAMS, "resources/read requires params.uri (string).");
      }
      const res = await readResource(params.uri);
      return res ? ok(id, res) : rpcError(id, RPC.RESOURCE_NOT_FOUND, `Resource not found: ${params.uri.slice(0, 200)}`);
    }
    case "prompts/list":
      return ok(id, { prompts: [] });
    case "logging/setLevel":
      return ok(id, {});
    default:
      return rpcError(id, RPC.METHOD_NOT_FOUND, `Method not found: ${method.slice(0, 100)}`);
  }
}

/**
 * Handles one JSON-RPC message. Returns null for notifications and for
 * client responses (nothing to send back).
 */
export async function handleMessage(msg: unknown): Promise<JsonRpcResponse | null> {
  if (!isObject(msg)) return rpcError(null, RPC.INVALID_REQUEST, "Invalid Request: expected a JSON-RPC object.");
  const rawId = msg.id;
  const hasId = rawId !== undefined;
  const id: JsonRpcId | null = typeof rawId === "string" || typeof rawId === "number" ? rawId : null;

  if (msg.method === undefined && ("result" in msg || "error" in msg)) return null; // client response
  if (msg.jsonrpc !== "2.0" || typeof msg.method !== "string" || !msg.method || (hasId && id === null)) {
    return rpcError(id, RPC.INVALID_REQUEST, "Invalid Request: requires jsonrpc '2.0', a method and a string/number id.");
  }
  if (!hasId) return null; // notification (initialized, cancelled, ...): nothing to do in a stateless server
  if (msg.params !== undefined && !isObject(msg.params) && !Array.isArray(msg.params)) {
    return rpcError(id, RPC.INVALID_PARAMS, "params must be an object.");
  }
  try {
    return await dispatch(id as JsonRpcId, msg.method, msg.params);
  } catch (err) {
    console.error(
      JSON.stringify({
        type: "mcp_rpc_failure",
        method: msg.method,
        error: err instanceof Error ? `${err.name}: ${err.message}`.slice(0, 500) : "unknown",
      })
    );
    return rpcError(id, RPC.INTERNAL_ERROR, "Internal error.");
  }
}

export type PayloadResult = {
  /** null when the payload held only notifications/responses (reply 202). */
  body: JsonRpcResponse | JsonRpcResponse[] | null;
  isInitialize: boolean;
};

/** Handles a parsed JSON body: a single message or a batch array. */
export async function handlePayload(payload: unknown): Promise<PayloadResult> {
  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      return { body: rpcError(null, RPC.INVALID_REQUEST, "Invalid Request: empty batch."), isInitialize: false };
    }
    if (payload.length > 50) {
      return { body: rpcError(null, RPC.INVALID_REQUEST, "Invalid Request: batch limited to 50 messages."), isInitialize: false };
    }
    // Sequential so mutations in one batch apply in the order sent.
    const responses: JsonRpcResponse[] = [];
    for (const m of payload) {
      const r = await handleMessage(m);
      if (r) responses.push(r);
    }
    return {
      body: responses.length ? responses : null,
      isInitialize: payload.some((m) => isObject(m) && m.method === "initialize"),
    };
  }
  return { body: await handleMessage(payload), isInitialize: isObject(payload) && payload.method === "initialize" };
}
