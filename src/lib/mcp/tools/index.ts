import type { McpTool } from "../registry";
import { affiliateTools } from "./affiliates";
import { categoryTools } from "./categories";
import { couponTools } from "./coupons";
import { orderTools } from "./orders";
import { paymentLinkTools } from "./payment-links";
import { payoutTools } from "./payouts";
import { productTools } from "./products";
import { reviewTools } from "./reviews";
import { siteTools } from "./site";
import { userTools } from "./users";

export const ALL_TOOLS: McpTool[] = [
  ...siteTools,
  ...productTools,
  ...categoryTools,
  ...couponTools,
  ...orderTools,
  ...userTools,
  ...payoutTools,
  ...affiliateTools,
  ...paymentLinkTools,
  ...reviewTools,
];

export const TOOLS_BY_NAME = new Map(ALL_TOOLS.map((t) => [t.name, t]));

if (TOOLS_BY_NAME.size !== ALL_TOOLS.length) {
  throw new Error("Duplicate MCP tool name.");
}
