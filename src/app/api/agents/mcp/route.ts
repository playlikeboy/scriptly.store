import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { products } from "@/db/schema";
import { and, eq, ne, or, sql } from "drizzle-orm";
import { getBearerToken, isValidAgentKey } from "@/app/api/agent/_lib/auth";
import {
  cleanSlug,
  formatZodIssues,
  productCreateSchema,
  productPatchSchema,
} from "@/app/api/agent/_lib/product-schema";

/** Token may come from the Authorization header or (for SSE clients) ?token= / ?apiKey=. */
function getPresentedToken(request: NextRequest): string | null {
  const sp = request.nextUrl.searchParams;
  return getBearerToken(request) || sp.get("token") || sp.get("apiKey");
}

async function authorize(request: NextRequest): Promise<boolean> {
  return isValidAgentKey(getPresentedToken(request));
}

function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
}

// DDL only needs to run once per isolate, not on every SSE connection.
let queueTableReady: Promise<void> | null = null;
function ensureQueueTable(): Promise<void> {
  if (!queueTableReady) {
    queueTableReady = db
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
  }
  return queueTableReady;
}

const sessionIdSchema = z.string().trim().min(1).max(128);

const jsonRpcSchema = z.object({
  jsonrpc: z.string().optional(),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
  method: z.string().min(1).max(200),
  params: z.unknown().optional(),
});

const toolCallParamsSchema = z.object({
  name: z.string().min(1).max(100),
  arguments: z.record(z.string(), z.unknown()).optional().default({}),
});

const listArgsSchema = z.object({
  category: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).catch(50).optional(),
});

const createArgsSchema = productCreateSchema.pick({
  title: true,
  slug: true,
  shortDescription: true,
  description: true,
  category: true,
  price: true,
  tags: true,
  thumbnail: true,
  previewGif: true,
  fileUrl: true,
});

const updateArgsSchema = productPatchSchema
  .pick({ title: true, slug: true, price: true, published: true, tags: true })
  .extend({ id: z.string().trim().min(1).max(200) });

const idArgsSchema = z.object({ id: z.string().trim().min(1).max(200) });

const TOOLS = [
  {
    name: "list_products",
    description: "List products from the store catalog",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Filter products by category slug (e.g. 'ui-kits')" },
        limit: { type: "number", description: "Maximum number of products to return (default 50)" },
      },
    },
  },
  {
    name: "create_product",
    description: "Create and publish a new digital product listing",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        slug: { type: "string" },
        shortDescription: { type: "string" },
        description: { type: "string" },
        category: { type: "string" },
        price: { type: "number", description: "Price in USD cents (e.g. 2500 is $25.00)" },
        tags: { type: "string", description: "Comma-separated list of tags (e.g., 'animation, react')" },
        thumbnail: { type: "string", description: "jsDelivr image URL" },
        previewGif: { type: "string", description: "jsDelivr GIF/WebP preview URL" },
        fileUrl: { type: "string", description: "Product file URL or path" },
      },
      required: ["title", "slug", "shortDescription", "description", "category", "price"],
    },
  },
  {
    name: "update_product",
    description: "Update fields of an existing product listing",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "UUID or unique slug of the product to update" },
        title: { type: "string" },
        slug: { type: "string" },
        price: { type: "number", description: "Price in paise" },
        published: { type: "boolean" },
        tags: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_product",
    description: "Delete a product from the database permanently",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "UUID or unique slug of the product to delete" },
      },
      required: ["id"],
    },
  },
];

class ToolInputError extends Error {}

function textResult(text: string) {
  return { content: [{ type: "text", text }] };
}

function parseArgs<T extends z.ZodTypeAny>(schema: T, args: unknown): z.infer<T> {
  const parsed = schema.safeParse(args);
  if (!parsed.success) {
    const details = formatZodIssues(parsed.error)
      .map((i) => `${i.path || "(root)"}: ${i.message}`)
      .join("; ");
    throw new ToolInputError(`Invalid arguments: ${details}`);
  }
  return parsed.data;
}

async function runTool(name: string, args: unknown) {
  if (name === "list_products") {
    const { category, limit } = parseArgs(listArgsSchema, args);
    const results = await db
      .select()
      .from(products)
      .where(category ? eq(products.category, category) : undefined)
      .limit(limit ?? 50);
    return textResult(JSON.stringify(results, null, 2));
  }

  if (name === "create_product") {
    const input = parseArgs(createArgsSchema, args);
    const slug = cleanSlug(input.slug);
    if (!slug) throw new ToolInputError("Slug must contain at least one alphanumeric character.");

    const conflict = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);
    if (conflict.length > 0) throw new ToolInputError(`Slug '${slug}' already exists.`);

    const id = crypto.randomUUID();
    await db.insert(products).values({
      id,
      title: input.title,
      slug,
      shortDescription: input.shortDescription,
      description: input.description,
      category: input.category,
      price: input.price,
      tags: input.tags ?? null,
      thumbnail: input.thumbnail ?? null,
      previewGif: input.previewGif ?? null,
      fileUrl: input.fileUrl ?? null,
      published: true,
      status: "approved",
    });
    return textResult(`Successfully created product. ID: ${id}, Slug: ${slug}`);
  }

  if (name === "update_product") {
    const { id, slug: rawSlug, ...rest } = parseArgs(updateArgsSchema, args);
    const [target] = await db
      .select({ id: products.id })
      .from(products)
      .where(or(eq(products.id, id), eq(products.slug, id)))
      .limit(1);
    if (!target) throw new ToolInputError(`Product not found: ${id}`);

    const updateData: Partial<typeof products.$inferInsert> = { updatedAt: new Date() };
    if (rest.title !== undefined) updateData.title = rest.title;
    if (rest.price !== undefined) updateData.price = rest.price;
    if (rest.published !== undefined) updateData.published = rest.published;
    if (rest.tags !== undefined) updateData.tags = rest.tags;
    if (rawSlug !== undefined) {
      const slug = cleanSlug(rawSlug);
      if (!slug) throw new ToolInputError("Slug must contain at least one alphanumeric character.");
      const conflict = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.slug, slug), ne(products.id, target.id)))
        .limit(1);
      if (conflict.length > 0) throw new ToolInputError(`Slug '${slug}' is already taken.`);
      updateData.slug = slug;
    }

    await db.update(products).set(updateData).where(eq(products.id, target.id));
    return textResult(`Successfully updated product ${id}`);
  }

  if (name === "delete_product") {
    const { id } = parseArgs(idArgsSchema, args);
    const deleted = await db
      .delete(products)
      .where(or(eq(products.id, id), eq(products.slug, id)))
      .returning({ id: products.id });
    if (deleted.length === 0) throw new ToolInputError(`Product not found: ${id}`);
    return textResult(`Successfully deleted product ${id}`);
  }

  throw new ToolInputError(`Unknown tool: ${name}`);
}

export async function GET(request: NextRequest) {
  const token = getPresentedToken(request);
  if (!(await isValidAgentKey(token))) {
    return unauthorized();
  }

  try {
    await ensureQueueTable();
  } catch (err) {
    console.error("MCP: failed to prepare message queue:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }

  const sessionId = crypto.randomUUID();
  const origin = request.nextUrl.origin;
  const encoder = new TextEncoder();

  const responseStream = new ReadableStream({
    start(controller) {
      let closed = false;
      let polling = false;
      let interval: ReturnType<typeof setInterval> | undefined;

      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };

      // Tell the client where to POST JSON-RPC messages for this session. The
      // token is echoed back (URL-encoded) so clients that authenticated via
      // query string can keep doing so.
      const endpoint = `${origin}/api/agents/mcp?session=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(token ?? "")}`;
      send(`event: endpoint\ndata: ${endpoint}\n\n`);

      interval = setInterval(async () => {
        if (closed || polling) return;
        polling = true;
        try {
          // Atomically claim and remove queued messages for this session in one round trip.
          const result = (await db.execute(sql`
            DELETE FROM mcp_messages
            WHERE session_id = ${sessionId} AND recipient = 'client'
            RETURNING id, message
          `)) as unknown as { rows?: Array<{ id: number; message: string }> };

          const rows = (result?.rows ?? []).slice().sort((a, b) => Number(a.id) - Number(b.id));
          if (rows.length > 0) {
            for (const row of rows) send(`event: message\ndata: ${row.message}\n\n`);
          } else {
            send(`:\n\n`); // keep-alive comment
          }
        } catch (err) {
          console.error("MCP SSE polling error:", err);
        } finally {
          polling = false;
        }
      }, 1000);

      function cleanup() {
        if (closed) return;
        closed = true;
        if (interval !== undefined) clearInterval(interval);
        db.execute(sql`DELETE FROM mcp_messages WHERE session_id = ${sessionId}`).catch((err) =>
          console.error("MCP session cleanup failed:", err)
        );
      }

      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new NextResponse(responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: NextRequest) {
  if (!(await authorize(request))) {
    return unauthorized();
  }

  const sp = request.nextUrl.searchParams;
  const sessionParse = sessionIdSchema.safeParse(
    sp.get("session") || sp.get("sessionId") || request.headers.get("mcp-session-id")
  );
  if (!sessionParse.success) {
    return NextResponse.json({ success: false, error: "Missing session ID" }, { status: 400 });
  }
  const sessionId = sessionParse.data;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Request body must be valid JSON" }, { status: 400 });
  }

  const rpc = jsonRpcSchema.safeParse(body);
  if (!rpc.success) {
    return NextResponse.json(
      { success: false, error: "Invalid JSON-RPC message", details: formatZodIssues(rpc.error) },
      { status: 400 }
    );
  }
  const json = rpc.data;
  const rpcId = json.id ?? null;

  try {
    let responseJson: Record<string, unknown> | null = null;

    if (json.method === "initialize") {
      responseJson = {
        jsonrpc: "2.0",
        id: rpcId,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "scriptly-agent-server", version: "1.0.0" },
        },
      };
    } else if (json.method === "notifications/initialized") {
      return new NextResponse(null, { status: 202 });
    } else if (json.method === "tools/list") {
      responseJson = { jsonrpc: "2.0", id: rpcId, result: { tools: TOOLS } };
    } else if (json.method === "tools/call") {
      const callParams = toolCallParamsSchema.safeParse(json.params);
      let toolResult: Record<string, unknown>;
      if (!callParams.success) {
        toolResult = { isError: true, ...textResult("Error executing tool: invalid tools/call params") };
      } else {
        try {
          toolResult = await runTool(callParams.data.name, callParams.data.arguments);
        } catch (err) {
          const message =
            err instanceof ToolInputError ? err.message : "Internal error while executing the tool.";
          if (!(err instanceof ToolInputError)) console.error("MCP tool execution failed:", err);
          toolResult = { isError: true, ...textResult(`Error executing tool: ${message}`) };
        }
      }
      responseJson = { jsonrpc: "2.0", id: rpcId, result: toolResult };
    } else {
      responseJson = {
        jsonrpc: "2.0",
        id: rpcId,
        error: { code: -32601, message: `Method not found: ${json.method}` },
      };
    }

    if (responseJson) {
      await ensureQueueTable();
      await db.execute(sql`
        INSERT INTO mcp_messages (session_id, recipient, message)
        VALUES (${sessionId}, 'client', ${JSON.stringify(responseJson)})
      `);
    }

    return new NextResponse(null, { status: 202 });
  } catch (error) {
    console.error("MCP POST session handling failed:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
