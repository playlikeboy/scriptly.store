import { z } from "zod";
import { and, desc, eq, ilike, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { coupons, orders, users } from "@/db/schema";
import { defineTool } from "../registry";
import {
  INT4_MAX,
  ToolError,
  catalogAmount,
  catalogMoney,
  confirmField,
  idField,
  isUniqueViolation,
  iso,
  likeTerm,
  page,
  paginationFields,
  revalidate,
  searchField,
} from "../util";

const discountType = z.enum(["percentage", "fixed"]);
const codeField = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_-]{3,32}$/, "Code must be 3-32 letters, numbers, '-' or '_'.")
  .describe("Coupon code (stored uppercase).");
const discountValueField = z
  .number()
  .int()
  .min(1)
  .max(INT4_MAX)
  .describe("percentage: whole percent 1-100. fixed: integer USD cents off.");

function assertDiscount(type: string, value: number) {
  if (type === "percentage" && value > 100) throw new ToolError("Percentage discount cannot exceed 100.");
}

/** Per-code usage, aggregated in SQL (orders store the code, not the coupon id). */
const usageSubquery = () =>
  db
    .select({
      code: sql<string>`upper(${orders.couponCode})`.as("usage_code"),
      uses: sql<number>`count(*)`.as("usage_uses"),
      discountTotal: sql<number>`coalesce(sum(${orders.discountApplied}), 0)`.as("usage_discount_total"),
    })
    .from(orders)
    .where(and(eq(orders.status, "completed"), sql`${orders.couponCode} is not null`))
    .groupBy(sql`upper(${orders.couponCode})`)
    .as("cu");

type CouponRow = {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  minPurchaseAmount: number;
  active: boolean;
  creatorId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function formatCoupon(c: CouponRow) {
  return {
    id: c.id,
    code: c.code,
    discountType: c.discountType,
    discount:
      c.discountType === "percentage"
        ? { percent: c.discountValue, formatted: `${c.discountValue}%` }
        : catalogMoney(c.discountValue),
    minPurchase: catalogMoney(c.minPurchaseAmount),
    active: c.active,
    creatorId: c.creatorId,
    scope: c.creatorId ? "creator" : "platform",
    createdAt: iso(c.createdAt),
    updatedAt: iso(c.updatedAt),
  };
}

const couponColumns = {
  id: coupons.id,
  code: coupons.code,
  discountType: coupons.discountType,
  discountValue: coupons.discountValue,
  minPurchaseAmount: coupons.minPurchaseAmount,
  active: coupons.active,
  creatorId: coupons.creatorId,
  createdAt: coupons.createdAt,
  updatedAt: coupons.updatedAt,
};

const couponsList = defineTool({
  name: "coupons_list",
  title: "List coupons",
  description:
    "Coupons with completed-order usage counts and totals. Fixed discounts and minimum purchase are catalog money (USD cents).",
  kind: "read",
  input: z.strictObject({
    query: searchField.optional().describe("Match on code."),
    active: z.boolean().optional(),
    discountType: discountType.optional(),
    scope: z.enum(["all", "platform", "creator"]).default("all").describe("platform = no creatorId."),
    creatorId: z.string().trim().min(1).max(200).optional(),
    ...paginationFields,
  }),
  async handler(a) {
    const where: SQL[] = [];
    if (a.query) where.push(ilike(coupons.code, likeTerm(a.query)));
    if (a.active !== undefined) where.push(eq(coupons.active, a.active));
    if (a.discountType) where.push(eq(coupons.discountType, a.discountType));
    if (a.scope === "platform") where.push(isNull(coupons.creatorId));
    if (a.scope === "creator") where.push(sql`${coupons.creatorId} is not null`);
    if (a.creatorId) where.push(eq(coupons.creatorId, a.creatorId));
    const cond = where.length ? and(...where) : undefined;
    const usage = usageSubquery();
    const [rows, [{ total }]] = await Promise.all([
      db
        .select({ ...couponColumns, uses: usage.uses, discountTotal: usage.discountTotal })
        .from(coupons)
        .leftJoin(usage, eq(usage.code, coupons.code))
        .where(cond)
        .orderBy(desc(coupons.createdAt), desc(coupons.id))
        .limit(a.limit)
        .offset(a.offset),
      db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(coupons).where(cond),
    ]);
    const items = rows.map((r) => ({
      ...formatCoupon(r),
      completedUses: Number(r.uses ?? 0),
      totalDiscountGiven: catalogMoney(r.discountTotal),
    }));
    return { summary: `${items.length} of ${total} coupons.`, data: page(items, total, a.limit, a.offset) };
  },
});

async function findCoupon(idOrCode: string) {
  const [c] = await db
    .select(couponColumns)
    .from(coupons)
    .where(or(eq(coupons.id, idOrCode), eq(coupons.code, idOrCode.toUpperCase())))
    .limit(1);
  if (!c) throw new ToolError(`Coupon not found: ${idOrCode}`);
  return c;
}

const couponsGet = defineTool({
  name: "coupons_get",
  title: "Get coupon",
  description: "One coupon by id or code, with usage stats and creator info.",
  kind: "read",
  input: z.strictObject({ idOrCode: z.string().trim().min(1).max(200) }),
  async handler({ idOrCode }) {
    const c = await findCoupon(idOrCode);
    const [[u], creator] = await Promise.all([
      db
        .select({
          uses: sql<number>`count(*) filter (where ${orders.status} = 'completed')`.mapWith(Number),
          attempts: sql<number>`count(*)`.mapWith(Number),
          discountTotal: sql<number>`coalesce(sum(${orders.discountApplied}) filter (where ${orders.status} = 'completed'), 0)`.mapWith(Number),
          revenue: sql<number>`coalesce(sum(${orders.amount}) filter (where ${orders.status} = 'completed'), 0)`.mapWith(Number),
          lastUsedAt: sql<Date | null>`max(${orders.createdAt}) filter (where ${orders.status} = 'completed')`,
        })
        .from(orders)
        .where(sql`upper(${orders.couponCode}) = ${c.code}`),
      c.creatorId
        ? db.select({ id: users.id, email: users.email, storeName: users.storeName }).from(users).where(eq(users.id, c.creatorId)).limit(1)
        : Promise.resolve([]),
    ]);
    const data = {
      coupon: formatCoupon(c),
      creator: creator[0] ?? null,
      usage: {
        completedOrders: u.uses,
        allOrders: u.attempts,
        totalDiscountGiven: catalogMoney(u.discountTotal),
        revenueWithCoupon: catalogMoney(u.revenue),
        lastUsedAt: iso(u.lastUsedAt),
      },
    };
    return { summary: `Coupon ${c.code}: ${c.active ? "active" : "inactive"}, used in ${u.uses} completed orders.`, data };
  },
});

const couponsCreate = defineTool({
  name: "coupons_create",
  title: "Create coupon",
  description:
    "Create a coupon. percentage: discountValue is 1-100. fixed: discountValue is integer USD cents. minPurchaseAmount is USD cents. Omit creatorId for a platform-wide coupon.",
  kind: "write",
  input: z.strictObject({
    code: codeField,
    discountType,
    discountValue: discountValueField,
    minPurchaseAmount: catalogAmount("Minimum cart subtotal.").default(0),
    active: z.boolean().default(true),
    creatorId: z.string().trim().min(1).max(200).optional().describe("Restrict to this creator's products."),
  }),
  async handler(a) {
    assertDiscount(a.discountType, a.discountValue);
    if (a.creatorId) {
      const [u] = await db.select({ id: users.id }).from(users).where(eq(users.id, a.creatorId)).limit(1);
      if (!u) throw new ToolError(`User not found: ${a.creatorId}`);
    }
    const [dupe] = await db.select({ id: coupons.id }).from(coupons).where(eq(coupons.code, a.code)).limit(1);
    if (dupe) throw new ToolError(`Coupon code '${a.code}' already exists.`);
    const id = crypto.randomUUID();
    try {
      await db.insert(coupons).values({
        id,
        code: a.code,
        discountType: a.discountType,
        discountValue: a.discountValue,
        minPurchaseAmount: a.minPurchaseAmount,
        active: a.active,
        creatorId: a.creatorId ?? null,
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new ToolError(`Coupon code '${a.code}' already exists.`);
      throw err;
    }
    revalidate("/admin/coupons");
    const c = await findCoupon(id);
    return { summary: `Created coupon ${a.code}.`, data: { coupon: formatCoupon(c) } };
  },
});

const couponsUpdate = defineTool({
  name: "coupons_update",
  title: "Update coupon",
  description: "Partially update a coupon (code, type, value, minimum purchase, active). Values follow coupons_create units.",
  kind: "write",
  idempotent: true,
  input: z.strictObject({
    id: idField("coupon"),
    code: codeField.optional(),
    discountType: discountType.optional(),
    discountValue: discountValueField.optional(),
    minPurchaseAmount: catalogAmount("Minimum cart subtotal.").optional(),
    active: z.boolean().optional(),
  }),
  async handler({ id, ...patch }) {
    const keys = Object.entries(patch).filter(([, v]) => v !== undefined).map(([k]) => k);
    if (keys.length === 0) throw new ToolError("Provide at least one field to change.");
    const current = await findCoupon(id);
    if (current.id !== id) throw new ToolError(`Coupon not found: ${id} (pass the coupon id, not the code).`);
    assertDiscount(patch.discountType ?? current.discountType, patch.discountValue ?? current.discountValue);
    if (patch.code && patch.code !== current.code) {
      const [dupe] = await db.select({ id: coupons.id }).from(coupons).where(and(eq(coupons.code, patch.code), ne(coupons.id, id))).limit(1);
      if (dupe) throw new ToolError(`Coupon code '${patch.code}' already exists.`);
    }
    try {
      await db
        .update(coupons)
        .set({ ...Object.fromEntries(keys.map((k) => [k, patch[k as keyof typeof patch]])), updatedAt: new Date() })
        .where(eq(coupons.id, id));
    } catch (err) {
      if (isUniqueViolation(err)) throw new ToolError(`Coupon code '${patch.code}' already exists.`);
      throw err;
    }
    revalidate("/admin/coupons");
    const c = await findCoupon(id);
    return { summary: `Updated coupon ${c.code}: ${keys.join(", ")}.`, data: { coupon: formatCoupon(c), changed: keys } };
  },
});

const couponsSetActive = defineTool({
  name: "coupons_set_active",
  title: "Activate / deactivate coupon",
  description: "Enable or disable a coupon without deleting it.",
  kind: "write",
  idempotent: true,
  input: z.strictObject({ idOrCode: z.string().trim().min(1).max(200), active: z.boolean() }),
  async handler({ idOrCode, active }) {
    const c = await findCoupon(idOrCode);
    await db.update(coupons).set({ active, updatedAt: new Date() }).where(eq(coupons.id, c.id));
    revalidate("/admin/coupons");
    return { summary: `Coupon ${c.code} is now ${active ? "active" : "inactive"}.`, data: { id: c.id, code: c.code, active } };
  },
});

const couponsDelete = defineTool({
  name: "coupons_delete",
  title: "Delete coupon",
  description: "Permanently delete a coupon. Past orders keep their coupon code text. Prefer coupons_set_active(false).",
  kind: "destructive",
  input: z.strictObject({ idOrCode: z.string().trim().min(1).max(200), confirm: confirmField }),
  async handler({ idOrCode }) {
    const c = await findCoupon(idOrCode);
    const deleted = await db.delete(coupons).where(eq(coupons.id, c.id)).returning({ id: coupons.id });
    if (deleted.length === 0) throw new ToolError(`Coupon not found: ${idOrCode}`);
    revalidate("/admin/coupons");
    return { summary: `Deleted coupon ${c.code}.`, data: { id: c.id, code: c.code } };
  },
});

export const couponTools = [couponsList, couponsGet, couponsCreate, couponsUpdate, couponsSetActive, couponsDelete];
