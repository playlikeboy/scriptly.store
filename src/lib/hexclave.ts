import { HexclaveServerApp } from "@hexclave/next";
import { stack } from "@/lib/stack";

const isValidUuid = (id?: string) =>
  Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));

const projectId = isValidUuid(process.env.NEXT_PUBLIC_HEXCLAVE_PROJECT_ID)
  ? process.env.NEXT_PUBLIC_HEXCLAVE_PROJECT_ID!
  : "25eb3b80-274f-4c41-b4d0-79d11070e070";

const publishableClientKey =
  process.env.NEXT_PUBLIC_HEXCLAVE_PUBLISHABLE_CLIENT_KEY ||
  "pck_qfzm0sgb5rz8eh4eypns6wvf0v13815zkksazh6518zgg";

const secretServerKey =
  process.env.HEXCLAVE_SECRET_SERVER_KEY ||
  "ssk_50ze9a4w0waw3g3j8aze2mm0tnf6vnwq3xgj4a4266sa0";

export const hexclave = new HexclaveServerApp({
  projectId,
  publishableClientKey,
  secretServerKey,
  inheritsFrom: stack,
});

