import { NextRequest } from "next/server";
import { getPresentedAgentKey, isValidAgentKey } from "@/app/api/agent/_lib/auth";
import { handlePayload, rpcError, RPC } from "@/lib/mcp/server";
import { handleLegacyPost, openLegacySse } from "@/lib/mcp/legacy-sse";

/**
 * ScriptlyStore MCP server. See docs/MCP.md.
 *
 * - Streamable HTTP (2025-06-18 / 2025-03-26), stateless: POST a JSON-RPC
 *   message or batch, get application/json (or one SSE frame when the client
 *   only accepts text/event-stream). Notifications-only bodies get 202.
 * - Legacy HTTP+SSE (2024-11-05): GET with Accept: text/event-stream opens the
 *   stream; POST ?session=<id> delivers messages.
 *
 * Auth: `Authorization: Bearer <AGENT_API_KEY>` or `x-api-key: <AGENT_API_KEY>`.
 */

const MAX_BODY_BYTES = 1_000_000;
const ALLOW = "GET, POST, DELETE, OPTIONS";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": ALLOW,
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version, X-API-Key, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, MCP-Protocol-Version, WWW-Authenticate",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, ...extra, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function unauthorized() {
  return json({ error: "Unauthorized: send Authorization: Bearer <key> or x-api-key: <key>." }, 401, {
    "WWW-Authenticate": 'Bearer realm="scriptly-mcp"',
  });
}

function legacySessionId(request: NextRequest): string | null {
  const sp = request.nextUrl.searchParams;
  const id = (sp.get("session") || sp.get("sessionId") || "").trim();
  return id && id.length <= 128 ? id : null;
}

async function readBody(request: NextRequest): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) return null;
  const text = await request.text();
  return text.length > MAX_BODY_BYTES ? null : text;
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { ...CORS, Allow: ALLOW } });
}

export async function GET(request: NextRequest) {
  const accept = request.headers.get("accept") || "";
  // Streamable HTTP clients probe GET for a server->client stream; this server
  // is stateless and has none, so per spec answer 405. A plain SSE GET (no
  // Mcp-Session-Id) is the legacy transport.
  if (!accept.includes("text/event-stream") || request.headers.has("mcp-session-id")) {
    return new Response(null, { status: 405, headers: { ...CORS, Allow: ALLOW } });
  }

  let key = getPresentedAgentKey(request);
  if (!key) {
    // Deprecated: query-string keys leak into logs. Kept only for old SSE clients.
    const sp = request.nextUrl.searchParams;
    key = sp.get("token") || sp.get("apiKey");
    if (key) console.warn(JSON.stringify({ type: "mcp_deprecated_query_token" }));
  }
  if (!key || !(await isValidAgentKey(key))) return unauthorized();
  return openLegacySse(request, key, CORS);
}

export async function POST(request: NextRequest) {
  const presented = getPresentedAgentKey(request);
  const keyValid = await isValidAgentKey(presented);

  const raw = await readBody(request);
  if (raw === null) return json(rpcError(null, RPC.INVALID_REQUEST, "Request body too large (max 1 MB)."), 413);

  const sessionId = legacySessionId(request);
  if (sessionId) return handleLegacyPost(raw, sessionId, presented, keyValid, CORS);

  if (!keyValid) return unauthorized();

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json(rpcError(null, RPC.PARSE_ERROR, "Parse error: body must be valid JSON."), 400);
  }

  const { body, isInitialize } = await handlePayload(payload);
  const extra: Record<string, string> = {};
  // Stateless: any id works; clients echo it back and we ignore it.
  if (isInitialize) extra["Mcp-Session-Id"] = crypto.randomUUID();
  else {
    const echoed = request.headers.get("mcp-session-id");
    if (echoed && echoed.length <= 128) extra["Mcp-Session-Id"] = echoed;
  }

  if (body === null) return new Response(null, { status: 202, headers: { ...CORS, ...extra } });

  const accept = request.headers.get("accept") || "";
  const wantsSseOnly =
    accept.includes("text/event-stream") && !accept.includes("application/json") && !accept.includes("*/*");
  if (wantsSseOnly) {
    return new Response(`event: message\ndata: ${JSON.stringify(body)}\n\n`, {
      status: 200,
      headers: { ...CORS, ...extra, "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform" },
    });
  }
  return json(body, 200, extra);
}

export async function DELETE(request: NextRequest) {
  // Stateless session termination: nothing to tear down.
  if (!(await isValidAgentKey(getPresentedAgentKey(request)))) return unauthorized();
  return new Response(null, { status: 204, headers: CORS });
}

export const dynamic = "force-dynamic";
