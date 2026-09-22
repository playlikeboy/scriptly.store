import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@/db/schema";

const getDbInstance = () => {
  const connectionString =
    (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("."))
      ? process.env.DATABASE_URL
      : "postgresql://neondb_owner:npg_Jm8eVuf9QLZq@ep-snowy-waterfall-aolziam1-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
  const client = neon(connectionString);
  return drizzle(client, { schema });
};

// Create a proxy that forwards all database calls to a fresh per-request/query instance
export const db = new Proxy({} as ReturnType<typeof getDbInstance>, {
  get(target, prop, receiver) {
    const instance = getDbInstance();
    return Reflect.get(instance, prop, receiver);
  }
});

