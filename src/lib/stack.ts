import { StackClientApp } from "@hexclave/next";

const isValidUuid = (id?: string) =>
  Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));

const projectId = isValidUuid(process.env.NEXT_PUBLIC_HEXCLAVE_PROJECT_ID)
  ? process.env.NEXT_PUBLIC_HEXCLAVE_PROJECT_ID!
  : "25eb3b80-274f-4c41-b4d0-79d11070e070";

const publishableClientKey =
  process.env.NEXT_PUBLIC_HEXCLAVE_PUBLISHABLE_CLIENT_KEY ||
  "pck_qfzm0sgb5rz8eh4eypns6wvf0v13815zkksazh6518zgg";

export const stack = new StackClientApp({
  projectId,
  publishableClientKey,
  tokenStore: "nextjs-cookie",
});

