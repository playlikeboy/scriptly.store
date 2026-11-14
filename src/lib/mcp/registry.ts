import { z } from "zod";
import { ToolError } from "./util";

export type ToolAnnotations = {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
};

export type ToolOutput = {
  /** One or two human-readable sentences. */
  summary: string;
  /** JSON-serializable payload returned as structuredContent. */
  data: Record<string, unknown>;
};

export type CallToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

export interface McpTool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: ToolAnnotations & { title: string };
  run(args: unknown): Promise<ToolOutput>;
}

type ToolKind = "read" | "write" | "destructive";

interface ToolSpec<S extends z.ZodType> {
  name: string;
  title: string;
  description: string;
  input: S;
  /**
   * read: no side effects. write: creates/updates data. destructive: deletes
   * data, moves money or touches many rows (input must carry confirm: true).
   */
  kind: ToolKind;
  /** Calling twice with the same arguments has no additional effect. */
  idempotent?: boolean;
  handler: (args: z.output<S>) => Promise<ToolOutput>;
}

function toInputJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as Record<string, unknown>;
  delete json.$schema;
  if (json.type !== "object") {
    throw new Error("MCP tool input schemas must be objects.");
  }
  return json;
}

function formatIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 10)
    .map((i) => `${i.path.length ? i.path.join(".") : "(arguments)"}: ${i.message}`)
    .join("; ");
}

export function defineTool<S extends z.ZodType>(spec: ToolSpec<S>): McpTool {
  const readOnly = spec.kind === "read";
  // destructiveHint marks tools that delete data, move money or touch many
  // rows; those also require confirm: true in their input schema.
  const annotations = {
    title: spec.title,
    readOnlyHint: readOnly,
    destructiveHint: spec.kind === "destructive",
    idempotentHint: readOnly ? true : (spec.idempotent ?? false),
    openWorldHint: false,
  };
  let cachedSchema: Record<string, unknown> | null = null;
  return {
    name: spec.name,
    title: spec.title,
    description: spec.description,
    get inputSchema() {
      cachedSchema ??= toInputJsonSchema(spec.input);
      return cachedSchema;
    },
    annotations,
    async run(args: unknown) {
      const parsed = spec.input.safeParse(args ?? {});
      if (!parsed.success) {
        throw new ToolError(`Invalid arguments: ${formatIssues(parsed.error)}`);
      }
      return spec.handler(parsed.data);
    },
  };
}

// ---------------------------------------------------------------------------
// Execution + audit
// ---------------------------------------------------------------------------

const SENSITIVE_KEY = /key|token|secret|password|authorization|account_?number|accountNumber/i;

/** Compact, secret-free description of the arguments for the audit log. */
export function summarizeArgs(args: unknown, depth = 0): unknown {
  if (args == null || typeof args === "number" || typeof args === "boolean") return args;
  if (typeof args === "string") return args.length > 80 ? `<string len=${args.length}>` : args;
  if (Array.isArray(args)) {
    return depth > 1 ? `<array len=${args.length}>` : { len: args.length, head: args.slice(0, 3).map((a) => summarizeArgs(a, depth + 1)) };
  }
  if (typeof args === "object") {
    if (depth > 1) return "<object>";
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(args as Record<string, unknown>).slice(0, 30)) {
      out[k] = SENSITIVE_KEY.test(k) ? "<redacted>" : summarizeArgs(v, depth + 1);
    }
    return out;
  }
  return `<${typeof args}>`;
}

function textOf(output: ToolOutput): string {
  // Many clients only forward `content` to the model, so the JSON payload is
  // included after the summary as well as in structuredContent.
  return `${output.summary}\n\n${JSON.stringify(output.data)}`;
}

export async function executeTool(tool: McpTool, args: unknown): Promise<CallToolResult> {
  const started = Date.now();
  let ok = false;
  let errorKind: string | undefined;
  try {
    const output = await tool.run(args);
    ok = true;
    return { content: [{ type: "text", text: textOf(output) }], structuredContent: output.data };
  } catch (err) {
    let message: string;
    if (err instanceof ToolError) {
      errorKind = "tool_error";
      message = err.message;
    } else {
      errorKind = "internal";
      message = `Internal error while running ${tool.name}. It may or may not have completed; re-read the affected records before retrying.`;
      console.error(
        JSON.stringify({
          type: "mcp_tool_failure",
          tool: tool.name,
          error: err instanceof Error ? `${err.name}: ${err.message}`.slice(0, 500) : String(err).slice(0, 500),
        })
      );
    }
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  } finally {
    console.log(
      JSON.stringify({
        type: "mcp_audit",
        tool: tool.name,
        ok,
        error: errorKind,
        durationMs: Date.now() - started,
        args: summarizeArgs(args),
        at: new Date().toISOString(),
      })
    );
  }
}
