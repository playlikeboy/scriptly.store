import { sql } from "drizzle-orm";
import { db } from "@/db";
import { timingSafeEqualString } from "@/app/api/agent/_lib/auth";
import { handlePayload, rpcError, RPC } from "./server";

/**
 * Legacy MCP HTTP+SSE transport (protocol 2024-11-05), kept for existing
 * clients (`claude mcp add --transport sse ...`).
 *
 * Workers cannot share memory between the SSE GET and later POSTs, so
 * responses are relayed through the `mcp_messages` table, polled by the stream.
 *
 * Session binding: the authenticated GET writes a marker row whose message is
 * HMAC-SHA256(AGENT_API_KEY, session id). The endpoint URL handed to the client
 * carries only the random session id, never the key. A session POST is
 * accepted when it presents a valid key header, or when the marker's HMAC still
 * matches the current key (so rotating AGENT_API_KEY kills every session).
 * Sessions expire after 24 hours.
 */

const SESSION_RECIPIENT = "__session__";
const SESSION_TTL_HOURS = 24;
const POLL_MS = 1000;
const encoder = new TextEncoder();

// DDL is idempotent and runs at most once per isolate, and only on legacy paths
// (Streamable HTTP never touches this table).
let queueTableReady: Promise<void> | null = null;
function ensureQueueTable(): Promise<void> {
  queueTableReady ??= db
    .execute(sql`
      CREATE TABLE IF NOT EXISTS mcp_messages (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        recipient TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    .then(() => undefined)
    .catch((err) => {
      queueTableReady = null;
      throw err;
    });
  return queueTableReady;
}

async function sessionBinding(sessionId: string, key: string): Promise<string> {
  const hmacKey = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", hmacKey, encoder.encode(`mcp-session:${sessionId}`));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function rows<T>(res: unknown): T[] {
  return ((res as { rows?: T[] })?.rows ?? []) as T[];
}

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/** Opens the SSE stream. `key` must already be validated. */
export async function openLegacySse(request: Request, key: string, headers: Record<string, string>): Promise<Response> {
  try {
    await ensureQueueTable();
  } catch (err) {
    console.error("MCP: failed to prepare message queue:", err instanceof Error ? err.message : err);
    return json({ error: "Server error" }, 500, headers);
  }

  const sessionId = crypto.randomUUID();
  await db.execute(sql`
    INSERT INTO mcp_messages (session_id, recipient, message)
    VALUES (${sessionId}, ${SESSION_RECIPIENT}, ${await sessionBinding(sessionId, key)})
  `);
  // Best-effort sweep of sessions whose stream died without cleanup.
  db.execute(sql`DELETE FROM mcp_messages WHERE created_at < now() - make_interval(hours => ${SESSION_TTL_HOURS * 2})`).catch(() => {});

  const endpoint = `${new URL(request.url).origin}/api/agents/mcp?session=${encodeURIComponent(sessionId)}`;

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let polling = false;

      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };

      send(`event: endpoint\ndata: ${endpoint}\n\n`);

      const interval = setInterval(async () => {
        if (closed || polling) return;
        polling = true;
        try {
          const claimed = rows<{ id: number; message: string }>(
            await db.execute(sql`
              DELETE FROM mcp_messages
              WHERE session_id = ${sessionId} AND recipient = 'client'
              RETURNING id, message
            `)
          ).sort((a, b) => Number(a.id) - Number(b.id));
          if (claimed.length > 0) {
            for (const row of claimed) send(`event: message\ndata: ${row.message}\n\n`);
          } else {
            send(`:\n\n`); // keep-alive
          }
        } catch (err) {
          console.error("MCP SSE polling error:", err instanceof Error ? err.message : err);
        } finally {
          polling = false;
        }
      }, POLL_MS);

      function cleanup() {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        db.execute(sql`DELETE FROM mcp_messages WHERE session_id = ${sessionId}`).catch((err) =>
          console.error("MCP session cleanup failed:", err instanceof Error ? err.message : err)
        );
      }

      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      ...headers,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

/**
 * Handles a POST to `?session=<id>` (body already read and size-capped).
 * `presentedKey` is the header key (if any)
 * and `keyValid` whether it matched AGENT_API_KEY.
 */
export async function handleLegacyPost(
  rawBody: string,
  sessionId: string,
  presentedKey: string | null,
  keyValid: boolean,
  headers: Record<string, string>
): Promise<Response> {
  if (presentedKey && !keyValid) return json({ error: "Unauthorized" }, 401, headers);
  try {
    await ensureQueueTable();
  } catch {
    return json({ error: "Server error" }, 500, headers);
  }

  const [marker] = rows<{ message: string }>(
    await db.execute(sql`
      SELECT message FROM mcp_messages
      WHERE session_id = ${sessionId} AND recipient = ${SESSION_RECIPIENT}
        AND created_at > now() - make_interval(hours => ${SESSION_TTL_HOURS})
      LIMIT 1
    `)
  );
  if (!marker) return json({ error: "Unknown or expired session" }, 404, headers);

  if (!keyValid) {
    const currentKey = process.env.AGENT_API_KEY;
    if (!currentKey || !(await timingSafeEqualString(marker.message, await sessionBinding(sessionId, currentKey)))) {
      return json({ error: "Unauthorized" }, 401, headers);
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json(rpcError(null, RPC.PARSE_ERROR, "Parse error"), 400, headers);
  }

  const { body } = await handlePayload(payload);
  if (body) {
    await db.execute(sql`
      INSERT INTO mcp_messages (session_id, recipient, message)
      VALUES (${sessionId}, 'client', ${JSON.stringify(body)})
    `);
  }
  return new Response(null, { status: 202, headers });
}
