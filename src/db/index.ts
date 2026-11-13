import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@/db/schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

// One Neon HTTP client + Drizzle instance per isolate (Cloudflare Workers / Node).
// The Neon HTTP driver is stateless (each query is a single fetch), so sharing the
// instance across requests is safe and avoids rebuilding the client on every
// property access. The instance is created lazily so `process.env` is read at
// request time (Workers populate env per request via nodejs_compat_populate_process_env),
// and it is rebuilt only if the connection string changes.
let cached: { url: string; instance: Database } | null = null;

function getDbInstance(): Database {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }
  if (!cached || cached.url !== connectionString) {
    cached = {
      url: connectionString,
      instance: drizzle(neon(connectionString), { schema }),
    };
  }
  return cached.instance;
}

export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const instance = getDbInstance();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
