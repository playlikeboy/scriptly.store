import { z } from "zod";

/** Normalizes a free-form slug to lowercase kebab-case. */
export function cleanSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Accepts real booleans and the strings "true"/"false" (agents often send strings).
const boolish = z.union([
  z.boolean(),
  z.enum(["true", "false"]).transform((v) => v === "true"),
]);

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform((v) => (v && v.trim() ? v : null));

// Tags may arrive as "a,b,c" or ["a","b","c"].
const tagsField = z
  .union([z.string().max(2000), z.array(z.string().max(100)).max(100)])
  .nullish()
  .transform((v) => {
    if (v == null) return null;
    const joined = Array.isArray(v) ? v.map((t) => t.trim()).filter(Boolean).join(",") : v;
    return joined.trim() ? joined : null;
  });

const dateField = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v, ctx) => {
    if (v == null || v === "") return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Invalid date" });
      return z.NEVER;
    }
    return d;
  });

const paise = z.coerce
  .number()
  .finite()
  .min(0, "Must be >= 0")
  .max(100_000_000, "Too large")
  .transform((v) => Math.round(v));

export const productStatusSchema = z.enum(["pending", "approved", "rejected"]);

const productFields = {
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200),
  shortDescription: z.string().max(2000),
  description: z.string().max(200_000),
  category: z.string().trim().min(1).max(100),
  subcategory: optionalText(100),
  tags: tagsField,
  thumbnail: optionalText(2000),
  previewGif: optionalText(2000),
  screenshots: optionalText(20_000),
  videoUrl: optionalText(2000),
  demoUrl: optionalText(2000),
  fileUrl: optionalText(2000),
  redirectDownload: boolish,
  price: paise,
  version: z.string().trim().min(1).max(50),
  featured: boolish,
  published: boolish,
  creatorId: optionalText(200),
  status: productStatusSchema,
  rating: z
    .union([z.string(), z.number()])
    .transform((v) => String(v))
    .refine((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 && n <= 5;
    }, "Rating must be between 0 and 5"),
  ratingCount: z.coerce.number().int().min(0).max(10_000_000),
  isFree: boolish,
  discountPercent: z.coerce.number().int().min(0).max(100),
  promoStart: dateField,
  promoEnd: dateField,
};

export const productCreateSchema = z.object({
  ...productFields,
  subcategory: productFields.subcategory.optional(),
  tags: productFields.tags.optional(),
  thumbnail: productFields.thumbnail.optional(),
  previewGif: productFields.previewGif.optional(),
  screenshots: productFields.screenshots.optional(),
  videoUrl: productFields.videoUrl.optional(),
  demoUrl: productFields.demoUrl.optional(),
  fileUrl: productFields.fileUrl.optional(),
  redirectDownload: productFields.redirectDownload.optional(),
  version: productFields.version.optional(),
  featured: productFields.featured.optional(),
  published: productFields.published.optional(),
  creatorId: productFields.creatorId.optional(),
  status: productFields.status.optional(),
  rating: productFields.rating.optional(),
  ratingCount: productFields.ratingCount.optional(),
  isFree: productFields.isFree.optional(),
  discountPercent: productFields.discountPercent.optional(),
  promoStart: productFields.promoStart.optional(),
  promoEnd: productFields.promoEnd.optional(),
});

export const productPatchSchema = z.object(productFields).partial();

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductPatchInput = z.infer<typeof productPatchSchema>;

export function formatZodIssues(error: z.ZodError) {
  return error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}
