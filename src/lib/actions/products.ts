"use server";

import { cache } from "react";
import { db } from "@/db";
import { products, categories as categoriesTable, subcategories } from "@/db/schema";
import { eq, desc, asc, inArray, and, or, ilike, gt, ne, sql, getTableColumns, type SQL } from "drizzle-orm";
import { isAdmin, getOrCreateDbUser } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Input parsing helpers (server-side validation for FormData-based actions)
// ---------------------------------------------------------------------------

const PRODUCT_STATUSES = new Set(["pending", "approved", "rejected"]);
const MAX_PRICE_PAISE = 100_000_000; // $1,000,000 in cents
const MAX_BULK_IDS = 500;

type DbUser = NonNullable<Awaited<ReturnType<typeof getOrCreateDbUser>>>;

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formInt(formData: FormData, key: string, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(formString(formData, key) || String(fallback), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function formDate(formData: FormData, key: string): Date | null {
  const raw = formString(formData, key);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** http(s) URLs only — blocks javascript:/data: payloads in rendered links. */
function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Absolute http(s) URL or a site-relative path (e.g. "/thumbnails/x.png"). */
function isHttpOrRelativeUrl(value: string): boolean {
  return (value.startsWith("/") && !value.startsWith("//")) || isHttpUrl(value);
}

function optionalUrl(
  formData: FormData,
  key: string,
  label: string,
  check: (v: string) => boolean = isHttpOrRelativeUrl
): string | null {
  const value = formString(formData, key).trim();
  if (!value) return null;
  if (value.length > 2048 || !check(value)) {
    throw new Error(`Invalid ${label} URL. Use an http(s) link.`);
  }
  return value;
}

function assertValidId(id: unknown): asserts id is string {
  if (typeof id !== "string" || id.length === 0 || id.length > 200) {
    throw new Error("Product not found");
  }
}

function sanitizeIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const clean = ids.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 200);
  if (clean.length > MAX_BULK_IDS) {
    throw new Error(`Too many products selected (max ${MAX_BULK_IDS}).`);
  }
  return Array.from(new Set(clean));
}

/** Escapes LIKE/ILIKE wildcards so user search text matches literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

async function assertSlugAvailable(slug: string, excludeId?: string) {
  const conflict = await db
    .select({ id: products.id })
    .from(products)
    .where(excludeId ? and(eq(products.slug, slug), ne(products.id, excludeId)) : eq(products.slug, slug))
    .limit(1);
  if (conflict.length > 0) {
    throw new Error(`The slug "${slug}" is already used by another product.`);
  }
}

/**
 * Parses the fields shared by create and update. Price arrives in rupees and
 * is stored as integer paise. Admin-only fields are ignored for creators.
 */
function parseProductForm(formData: FormData, isUserAdmin: boolean, existingFileUrl: string | null) {
  const title = formString(formData, "title").trim().slice(0, 200) || "Draft Product";

  const priceParsed = Number.parseFloat(formString(formData, "price"));
  const price = Number.isFinite(priceParsed)
    ? Math.min(MAX_PRICE_PAISE, Math.max(0, Math.round(priceParsed * 100)))
    : 0;

  // Creators may only point to hosted (http/https) files; local storage paths
  // are reserved for admins so a creator can't reference another product's file.
  const rawFileUrl = formString(formData, "fileUrl").trim();
  let fileUrl: string | null = rawFileUrl || null;
  if (fileUrl && fileUrl.length > 2048) {
    throw new Error("Invalid product file URL.");
  }
  if (fileUrl && !isUserAdmin && fileUrl !== existingFileUrl && !isHttpUrl(fileUrl)) {
    throw new Error("Product file must be an uploaded file or an http(s) link.");
  }
  if (fileUrl && /^\s*(javascript|data|vbscript):/i.test(fileUrl)) {
    fileUrl = null;
  }

  return {
    title,
    rawSlug: formString(formData, "slug").trim(),
    shortDescription: formString(formData, "shortDescription").slice(0, 2000) || "No description provided.",
    description: formString(formData, "description").slice(0, 200_000) || "No full description provided yet.",
    category: formString(formData, "category").trim().slice(0, 100) || "templates",
    subcategory: formString(formData, "subcategory").trim().slice(0, 100) || null,
    tags: formString(formData, "tags").slice(0, 2000) || null,
    demoUrl: optionalUrl(formData, "demoUrl", "demo", isHttpUrl),
    thumbnail: optionalUrl(formData, "thumbnail", "thumbnail"),
    previewGif: optionalUrl(formData, "previewGif", "preview"),
    screenshots: formString(formData, "screenshots").slice(0, 20_000) || null,
    videoUrl: optionalUrl(formData, "videoUrl", "video", isHttpUrl),
    fileUrl,
    redirectDownload: formString(formData, "redirectDownload") !== "false",
    price,
    version: formString(formData, "version").trim().slice(0, 50) || "1.0.0",
    isFree: formString(formData, "isFree") === "true",
    discountPercent: formInt(formData, "discountPercent", 0, 0, 100),
    promoStart: formDate(formData, "promoStart"),
    promoEnd: formDate(formData, "promoEnd"),
    personal: formString(formData, "personal") === "true",
    showStats: formString(formData, "showStats") === "true",
    affiliateCommissionPercent: formInt(formData, "affiliateCommissionPercent", 30, 5, 50),
  };
}

/** Public counters can only be edited by admins (creators can't fake social proof). */
function parseAdminStats(formData: FormData) {
  return {
    views: formInt(formData, "views", 0, 0, 2_000_000_000),
    downloadsCount: formInt(formData, "downloadsCount", 0, 0, 2_000_000_000),
    saves: formInt(formData, "saves", 0, 0, 2_000_000_000),
  };
}

async function requireUser(): Promise<DbUser> {
  const user = await getOrCreateDbUser();
  if (!user) {
    throw new Error("Unauthorized: Sign in required.");
  }
  return user;
}

async function requireAdminUser() {
  if (!(await isAdmin())) {
    throw new Error("Unauthorized: Admin access required.");
  }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createProductAction(formData: FormData) {
  const user = await requireUser();
  const isUserAdmin = user.role === "admin";

  const fields = parseProductForm(formData, isUserAdmin, null);
  const slug = slugify(fields.rawSlug || fields.title) || "draft-product-" + crypto.randomUUID().slice(0, 8);
  await assertSlugAvailable(slug);

  // Rules: Creators cannot set featured or publish directly.
  const featured = isUserAdmin ? formString(formData, "featured") === "true" : false;
  const published = isUserAdmin ? formString(formData, "published") === "true" : false;
  const status = isUserAdmin ? (published ? "approved" : "pending") : "pending";
  const creatorId = isUserAdmin ? formString(formData, "creatorId").trim() || null : user.id;
  const stats = isUserAdmin ? parseAdminStats(formData) : { views: 0, downloadsCount: 0, saves: 0 };

  const { rawSlug: _rawSlug, ...data } = fields;
  void _rawSlug;

  await db.insert(products).values({
    id: crypto.randomUUID(),
    ...data,
    slug,
    featured,
    published,
    creatorId,
    status,
    ...stats,
  });

  revalidatePath("/");
  revalidatePath("/admin/products");
  return { success: true };
}

export async function updateProductAction(id: string, formData: FormData) {
  const user = await requireUser();
  assertValidId(id);

  const existing = await db.query.products.findFirst({
    where: eq(products.id, id),
    columns: { id: true, slug: true, creatorId: true, fileUrl: true },
  });

  if (!existing) {
    throw new Error("Product not found");
  }

  const isUserAdmin = user.role === "admin";
  if (!isUserAdmin && existing.creatorId !== user.id) {
    throw new Error("Unauthorized: You do not own this product.");
  }

  const fields = parseProductForm(formData, isUserAdmin, existing.fileUrl);

  // Keep an unchanged slug byte-for-byte so existing URLs never break; normalize new ones.
  let slug = fields.rawSlug === existing.slug ? existing.slug : slugify(fields.rawSlug || fields.title);
  if (!slug) slug = "draft-product-" + crypto.randomUUID().slice(0, 8);
  if (slug !== existing.slug) {
    await assertSlugAvailable(slug, id);
  }

  // Rules: Creators cannot set featured. Editing resets a creator's product to pending/unpublished.
  const featured = isUserAdmin ? formString(formData, "featured") === "true" : false;
  const published = isUserAdmin ? formString(formData, "published") === "true" : false;
  const requestedStatus = formString(formData, "status");
  const status = isUserAdmin
    ? PRODUCT_STATUSES.has(requestedStatus)
      ? requestedStatus
      : published
        ? "approved"
        : "pending"
    : "pending";

  const { rawSlug: _rawSlug, ...data } = fields;
  void _rawSlug;

  await db
    .update(products)
    .set({
      ...data,
      slug,
      featured,
      published,
      status,
      // Counters are admin-editable only; creators keep the live values.
      ...(isUserAdmin ? parseAdminStats(formData) : {}),
      updatedAt: new Date(),
    })
    .where(eq(products.id, id));

  revalidatePath("/");
  revalidatePath(`/products/${slug}`);
  if (slug !== existing.slug) revalidatePath(`/products/${existing.slug}`);
  revalidatePath("/admin/products");
  return { success: true };
}

export async function deleteProductAction(id: string) {
  const user = await requireUser();
  assertValidId(id);

  const isUserAdmin = user.role === "admin";

  // Ownership enforced inside the DELETE itself (no read-then-write race).
  const deleted = await db
    .delete(products)
    .where(isUserAdmin ? eq(products.id, id) : and(eq(products.id, id), eq(products.creatorId, user.id)))
    .returning({ slug: products.slug });

  if (deleted.length === 0) {
    const exists = await db.query.products.findFirst({
      where: eq(products.id, id),
      columns: { id: true },
    });
    throw new Error(exists ? "Unauthorized: You do not own this product." : "Product not found");
  }

  revalidatePath("/");
  revalidatePath(`/products/${deleted[0].slug}`);
  revalidatePath("/admin/products");
  return { success: true };
}

export async function toggleProductPublishAction(id: string) {
  await requireAdminUser();
  assertValidId(id);

  // Atomic flip; publishing also approves, unpublishing keeps the current status.
  const [updated] = await db
    .update(products)
    .set({
      published: sql`NOT ${products.published}`,
      status: sql`CASE WHEN ${products.published} THEN ${products.status} ELSE 'approved' END`,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning({ slug: products.slug });

  if (!updated) {
    throw new Error("Product not found");
  }

  revalidatePath("/");
  revalidatePath(`/products/${updated.slug}`);
  revalidatePath("/admin/products");
  return { success: true };
}

export async function bulkDeleteProductsAction(ids: string[]) {
  await requireAdminUser();
  const cleanIds = sanitizeIds(ids);
  if (cleanIds.length === 0) return { success: true, count: 0 };

  const deleted = await db
    .delete(products)
    .where(inArray(products.id, cleanIds))
    .returning({ id: products.id });

  revalidatePath("/");
  revalidatePath("/admin/products");
  return { success: true, count: deleted.length };
}

export async function bulkSetProductsPublishAction(ids: string[], published: boolean) {
  await requireAdminUser();
  const cleanIds = sanitizeIds(ids);
  if (cleanIds.length === 0) return { success: true, count: 0 };
  const publish = published === true;

  const updated = await db
    .update(products)
    .set({
      published: publish,
      status: publish ? "approved" : "pending",
      updatedAt: new Date(),
    })
    .where(inArray(products.id, cleanIds))
    .returning({ id: products.id });

  revalidatePath("/");
  revalidatePath("/admin/products");
  return { success: true, count: updated.length };
}

export async function toggleProductFeaturedAction(id: string) {
  await requireAdminUser();
  assertValidId(id);

  const [updated] = await db
    .update(products)
    .set({
      featured: sql`NOT ${products.featured}`,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning({ slug: products.slug, featured: products.featured });

  if (!updated) {
    throw new Error("Product not found");
  }

  revalidatePath("/");
  revalidatePath("/featured");
  revalidatePath(`/products/${updated.slug}`);
  revalidatePath("/admin/products");

  return { success: true, featured: updated.featured };
}

export async function bulkSetProductsFeaturedAction(ids: string[], featured: boolean) {
  await requireAdminUser();
  const cleanIds = sanitizeIds(ids);
  if (cleanIds.length === 0) return { success: true, count: 0 };
  const isFeatured = featured === true;

  const updated = await db
    .update(products)
    .set({
      featured: isFeatured,
      updatedAt: new Date(),
    })
    .where(inArray(products.id, cleanIds))
    .returning({ id: products.id });

  revalidatePath("/");
  revalidatePath("/featured");
  revalidatePath("/admin/products");
  return { success: true, count: updated.length, featured: isFeatured };
}

export async function ensureCategoriesSeeded() {
  try {
    // Check if categories exist
    const existingCategories = await db.query.categories.findFirst();
    if (!existingCategories) {
      console.log("Seeding default categories...");
      const DEFAULT_CATEGORIES = [
        { id: "saas-templates", name: "SaaS Templates", slug: "saas-templates" },
        { id: "landing-pages", name: "Landing Pages", slug: "landing-pages" },
        { id: "scripts", name: "Scripts & Automations", slug: "scripts" },
        { id: "design-assets", name: "Design Assets", slug: "design-assets" },
        { id: "ai-prompts", name: "AI Prompts", slug: "ai-prompts" },
        { id: "ebooks", name: "Ebooks & Playbooks", slug: "ebooks" },
      ];
      await db.insert(categoriesTable).values(DEFAULT_CATEGORIES);
    }

    // Check if subcategories exist
    const existingSubcategories = await db.query.subcategories.findFirst();
    if (!existingSubcategories) {
      console.log("Seeding default subcategories...");
      const DEFAULT_SUBCATEGORIES = [
        // SaaS Templates
        { id: "nextjs-react-boilerplates", name: "Next.js & React Boilerplates", slug: "nextjs-react-boilerplates", categoryId: "saas-templates" },
        { id: "python-backends", name: "Python Backends", slug: "python-backends", categoryId: "saas-templates" },
        { id: "rest-apis-microservices", name: "REST APIs & Microservices", slug: "rest-apis-microservices", categoryId: "saas-templates" },
        { id: "mobile-app-starters", name: "Mobile App Starters", slug: "mobile-app-starters", categoryId: "saas-templates" },
        { id: "web3-crypto-templates", name: "Web3 & Crypto Templates", slug: "web3-crypto-templates", categoryId: "saas-templates" },

        // Landing Pages
        { id: "gsap-3d-animated-pages", name: "GSAP & 3D Animated Pages", slug: "gsap-3d-animated-pages", categoryId: "landing-pages" },
        { id: "waitlist-newsletter-pages", name: "Waitlist & Newsletter Pages", slug: "waitlist-newsletter-pages", categoryId: "landing-pages" },
        { id: "saas-pricing-checkout", name: "SaaS Pricing & Checkout", slug: "saas-pricing-checkout", categoryId: "landing-pages" },
        { id: "agency-portfolio-pages", name: "Agency & Portfolio Pages", slug: "agency-portfolio-pages", categoryId: "landing-pages" },
        { id: "no-code-themes", name: "No-Code Themes", slug: "no-code-themes", categoryId: "landing-pages" },

        // Scripts
        { id: "web-scrapers-crawlers", name: "Web Scrapers & Crawlers", slug: "web-scrapers-crawlers", categoryId: "scripts" },
        { id: "browser-extensions", name: "Browser Extensions", slug: "browser-extensions", categoryId: "scripts" },
        { id: "social-media-bots", name: "Social Media Bots", slug: "social-media-bots", categoryId: "scripts" },
        { id: "devops-cicd-pipelines", name: "DevOps & CI/CD Pipelines", slug: "devops-cicd-pipelines", categoryId: "scripts" },
        { id: "script-automation-macros", name: "Script Automation Macros", slug: "script-automation-macros", categoryId: "scripts" },

        // Design Assets
        { id: "tailwind-css-component-kits", name: "Tailwind & CSS Component Kits", slug: "tailwind-css-component-kits", categoryId: "design-assets" },
        { id: "figma-ui-kits-design-systems", name: "Figma UI Kits & Design Systems", slug: "figma-ui-kits-design-systems", categoryId: "design-assets" },
        { id: "custom-svg-icon-libraries", name: "Custom SVG Icon Libraries", slug: "custom-svg-icon-libraries", categoryId: "design-assets" },
        { id: "saas-display-typography", name: "SaaS Display Typography", slug: "saas-display-typography", categoryId: "design-assets" },
        { id: "3d-models-illustrations", name: "3D Models & Illustrations", slug: "3d-models-illustrations", categoryId: "design-assets" },

        // AI Prompts
        { id: "developer-prompt-engineering", name: "Developer Prompt Engineering", slug: "developer-prompt-engineering", categoryId: "ai-prompts" },
        { id: "marketing-copywriter-prompts", name: "Marketing Copywriter Prompts", slug: "marketing-copywriter-prompts", categoryId: "ai-prompts" },
        { id: "creative-ai-recipes", name: "Creative AI Recipes", slug: "creative-ai-recipes", categoryId: "ai-prompts" },
        { id: "autonomous-ai-agents", name: "Autonomous AI Agents", slug: "autonomous-ai-agents", categoryId: "ai-prompts" },

        // Ebooks
        { id: "launch-marketing-playbooks", name: "Launch & Marketing Playbooks", slug: "launch-marketing-playbooks", categoryId: "ebooks" },
        { id: "seo-checklists", name: "SEO Checklists", slug: "seo-checklists", categoryId: "ebooks" },
        { id: "coding-handbooks", name: "Coding Handbooks", slug: "coding-handbooks", categoryId: "ebooks" },
        { id: "creator-business-guides", name: "Creator Business Guides", slug: "creator-business-guides", categoryId: "ebooks" },
      ];
      await db.insert(subcategories).values(DEFAULT_SUBCATEGORIES);
    }

    // Check if products exist
    const existingProducts = await db.query.products.findFirst();
    if (!existingProducts) {
      console.log("Seeding default products...");
      const DEFAULT_PRODUCTS = [
        {
          id: "prod-saas-template",
          title: "SaaS Starter Template",
          slug: "saas-starter-template",
          shortDescription: "A Next.js SaaS starter kit with auth, database, and Stripe/Razorpay integrations pre-configured.",
          description: "This starter kit helps you launch your SaaS product in hours, not weeks.\n\n### Features:\n- Next.js 15 App Router\n- Tailwind CSS styling\n- Drizzle ORM and Postgres database client\n- Full user authentication flow\n- Pre-built landing pages and dashboard",
          category: "saas-templates",
          subcategory: "nextjs-react-boilerplates",
          tags: "nextjs,saas,boilerplate,drizzle",
          thumbnail: "/thumbnails/saas_starter.png",
          demoUrl: "https://demo.scriptlystore.com/saas-starter",
          fileUrl: "/mock/saas-starter.zip",
          price: 100, // $1.00
          version: "1.0.0",
          featured: true,
          published: true,
        },
        {
          id: "prod-growth-hacking-ebook",
          title: "Growth Hacking Guide Ebook",
          slug: "growth-hacking-guide-ebook",
          shortDescription: "The ultimate ebook guide containing 50+ growth tactics to scale your digital product or community.",
          description: "Learn how we scaled ScriptlyHQ from 0 to 10k users in 3 months.\n\n### What's inside:\n- SEO and Content Marketing frameworks\n- Viral referral loops setup\n- Cold email templates that convert\n- Interactive marketing tactics checklist",
          category: "ebooks",
          subcategory: "launch-marketing-playbooks",
          tags: "marketing,growth,ebook,guide",
          thumbnail: "/thumbnails/growth_guide.png",
          demoUrl: null,
          fileUrl: "/mock/growth-guide.pdf",
          price: 300, // $3.00
          version: "2.1.0",
          featured: true,
          published: true,
        },
        {
          id: "prod-copywriter-prompt",
          title: "Marketing Copywriter AI Prompt",
          slug: "marketing-copywriter-ai-prompt",
          shortDescription: "Advanced LLM system prompt to write high-converting landing pages, ads, and email sequences.",
          description: "Get copy that sells. Tested on GPT-4 and Claude 3.5 Sonnet to produce conversion rates 2x higher than standard drafts.\n\n### Includes:\n- Headline writing prompts\n- Full page copy outline generator\n- Call-to-action variants creator",
          category: "ai-prompts",
          subcategory: "marketing-copywriter-prompts",
          tags: "ai,prompt,gpt,claude,marketing",
          thumbnail: "/thumbnails/copywriter_prompt.png",
          demoUrl: null,
          fileUrl: "/mock/copywriter-prompt.txt",
          price: 400, // $4.00
          version: "1.0.0",
          featured: false,
          published: true,
        },
        {
          id: "prod-chrome-extension-boilerplate",
          title: "Chrome Extension Boilerplate",
          slug: "chrome-extension-boilerplate",
          shortDescription: "A Manifest V3 extension boilerplate with React, Tailwind CSS, and message passing structure.",
          description: "Launch browser extensions instantly. Clean structure with options page, popup UI, and background scripts.\n\n### Features:\n- Manifest V3 compliant\n- React + TypeScript popup\n- Tailwind CSS for premium styles\n- Message passing utilities",
          category: "scripts",
          subcategory: "browser-extensions",
          tags: "chrome,extension,javascript,react",
          thumbnail: "/thumbnails/chrome_boilerplate.png",
          demoUrl: "https://demo.scriptlystore.com/chrome-extension",
          fileUrl: "/mock/chrome-boilerplate.zip",
          price: 1000, // $10.00
          version: "1.2.0",
          featured: false,
          published: true,
        },
        {
          id: "prod-glassmorphism-ui-kit",
          title: "Tailwind Glassmorphism UI Kit",
          slug: "tailwind-glassmorphism-ui-kit",
          shortDescription: "A collection of 30+ premium glassmorphic UI components styled with Tailwind CSS.",
          description: "Wow your users with modern, elegant design layouts. Includes charts, navigations, form inputs, and modal designs.\n\n### Inclusions:\n- Fully responsive grid layouts\n- Smooth CSS backdrop blur overrides\n- Light and dark theme variables support",
          category: "design-assets",
          subcategory: "tailwind-css-component-kits",
          tags: "tailwind,ui,glassmorphism,css",
          thumbnail: "/thumbnails/glass_ui.png",
          demoUrl: "https://demo.scriptlystore.com/glassmorphism",
          fileUrl: "/mock/glass-ui-kit.zip",
          price: 4900, // $49.00
          version: "1.0.0",
          featured: false,
          published: true,
        },
        {
          id: "prod-solo-dev-micro-saas",
          title: "The Solo Developer's Guide to Micro-SaaS",
          slug: "solo-developers-guide-to-micro-saas",
          shortDescription: "A complete roadmap for software engineers to validate, build, launch, and scale profitable Micro-SaaS products to $5,000/month in recurring revenue.",
          description: "Most developers fail not because their code is bad, but because they build things nobody wants. This eBook teaches you the business side of coding.\n\n### What's Inside:\n- Ideation & Validation: How to find high-intent problems worth paying for.\n- MVP Blueprint: Deciding what features to build first and what to ignore.\n- Stripe & Customer Operations: Handling subscriptions, tax compliance, and refunds.\n- Cold Outreach Templates: Copy-paste scripts to acquire your first 50 paid users.",
          category: "ebooks",
          subcategory: "creator-business-guides",
          tags: "saas,indie-hacking,micro-saas,business",
          thumbnail: "https://iili.io/CAQrjUX.jpg",
          demoUrl: null,
          fileUrl: "/mock/solo-developers-guide-to-micro-saas.pdf",
          price: 1900, // $19.00
          version: "1.0.0",
          featured: true,
          published: true,
          status: "approved",
          rating: "4.9",
          ratingCount: 18,
          views: 2840,
          downloadsCount: 247,
          saves: 189,
          showStats: true,
        },
        {
          id: "prod-seo-for-developers",
          title: "SEO for Developers: Rank Without a Marketing Budget",
          slug: "seo-for-developers",
          shortDescription: "The technical search engine optimization handbook. Learn to optimize React components, fix hydration layout shifts, and dominate Google search results.",
          description: "Stop paying for ads. This book teaches you how to leverage your technical skills to drive thousands of free organic visits to your products every single day.\n\n### What's Inside:\n- Server-Side Rendering (SSR) Optimization: Structuring metadata, OpenGraph tags, and JSON-LD schemas.\n- Lighthouse Score Mastery: Optimizing Core Web Vitals (LCP, FID, CLS) to score a perfect 100/100.\n- Programmatic SEO: Building hundreds of dynamic landing pages that rank for long-tail keywords.\n- XML Sitemaps & Indexing: Configuring IndexNow and instant indexing APIs.",
          category: "ebooks",
          subcategory: "seo-checklists",
          tags: "seo,marketing,nextjs,nextjs-seo",
          thumbnail: "https://iili.io/CAQreOG.jpg",
          demoUrl: null,
          fileUrl: "/mock/seo-for-developers.pdf",
          price: 1200, // $12.00
          version: "1.0.0",
          featured: true,
          published: true,
          status: "approved",
          rating: "4.8",
          ratingCount: 14,
          views: 1980,
          downloadsCount: 168,
          saves: 112,
          showStats: true,
        },
        {
          id: "prod-design-for-developers",
          title: "Design for Developers: Build Premium Interfaces with Tailwind CSS",
          slug: "design-for-developers-tailwind",
          shortDescription: "Learn UI/UX design fundamentals, typography rules, dark mode scaling, and color theory specifically using Tailwind CSS variables.",
          description: "You don't need a designer to build stunning websites. Master the visual principles that make apps look professional, modern, and high-converting.\n\n### What's Inside:\n- Visual Hierarchy: How spacing, size, and layout guide your user's eyes to the \"Buy Now\" button.\n- Tailwind Color Architecture: Setting up premium HSL-tailored dark modes and gradients.\n- Typography Rules: Pairing pairing modern fonts (Inter, Geist, Outfit) and choosing perfect line-heights.\n- Micro-Animations: Adding interactive hover and transition effects using Tailwind transition classes.",
          category: "ebooks",
          subcategory: "creator-business-guides",
          tags: "design,tailwind,ui-ux,css",
          thumbnail: "https://iili.io/CAQrrfS.jpg",
          demoUrl: null,
          fileUrl: "/mock/design-for-developers-tailwind.pdf",
          price: 1500, // $15.00
          version: "1.0.0",
          featured: true,
          published: true,
          status: "approved",
          rating: "5.0",
          ratingCount: 22,
          views: 3120,
          downloadsCount: 289,
          saves: 215,
          showStats: true,
        },
        {
          id: "prod-api-design-patterns",
          title: "API Design Patterns & Serverless Architecture Playbook",
          slug: "api-design-patterns-serverless",
          shortDescription: "A masterclass in architecting resilient serverless APIs, database caching layers, and Webhook security with Drizzle ORM and Neon Postgres.",
          description: "Scale your app to millions of requests without high server bills. Learn patterns for rate-limiting, batching queries, and securing API endpoints.\n\n### What's Inside:\n- Database Caching: Integrating Redis or Cloudflare KV to bypass heavy SQL lookups.\n- Serverless API Performance: Avoiding database connection pooling leaks inside Next.js edge route handlers.\n- Webhook Reliability: Writing retry mechanisms and signature verification for payment processors.\n- Rate Limiting: Building token-bucket middleware using serverless edge runtimes.",
          category: "ebooks",
          subcategory: "coding-handbooks",
          tags: "api,backend,nextjs,serverless,edge",
          thumbnail: "https://iili.io/CAQrLOb.jpg",
          demoUrl: null,
          fileUrl: "/mock/api-design-patterns-serverless.pdf",
          price: 2400, // $24.00
          version: "1.0.0",
          featured: true,
          published: true,
          status: "approved",
          rating: "4.9",
          ratingCount: 19,
          views: 2450,
          downloadsCount: 198,
          saves: 154,
          showStats: true,
        },
        {
          id: "prod-ai-automation-scraping",
          title: "The AI Automation & Scraping Playbook",
          slug: "ai-automation-scraping-playbook",
          shortDescription: "Learn to build automated scraping scripts, headless browser engines, and AI pipelines to save hours of manual data entry.",
          description: "A practical guide to automating the web. Build systems that monitor competitors, scrape structured data, and feed information into LLM pipelines.\n\n### What's Inside:\n- Headless Browsers: Scripting Puppeteer and Playwright to bypass Cloudflare and CAPTCHAs.\n- Data Structuring: Using Cheerio and Node.js streams to process huge datasets.\n- LLM Context Pipelines: Automatically scraping blogs/documentation and converting them into vector embeddings.\n- Cron Automation: Running background jobs on GitHub Actions or Cloudflare Workers.",
          category: "ebooks",
          subcategory: "coding-handbooks",
          tags: "ai,automation,scraping,puppeteer,nodejs",
          thumbnail: "https://iili.io/CAQrDWQ.jpg",
          demoUrl: null,
          fileUrl: "/mock/ai-automation-scraping-playbook.pdf",
          price: 1900, // $19.00
          version: "1.0.0",
          featured: true,
          published: true,
          status: "approved",
          rating: "4.9",
          ratingCount: 26,
          views: 3560,
          downloadsCount: 312,
          saves: 242,
          showStats: true,
        },
      ];

      await db.insert(products).values(DEFAULT_PRODUCTS);
    }
  } catch (err) {
    // Check if the error is about missing tables
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (errorMessage.includes('relation "categories" does not exist') || 
        errorMessage.includes('relation "products" does not exist') ||
        errorMessage.includes('Failed query')) {
      console.warn("Database tables not found. Please run migrations.");
    } else {
      console.error("Failed to seed categories and products:", err);
    }
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

// React cache() dedupes these lookups within a single server request
// (generateMetadata + layout + page all ask for the taxonomy).
const loadCategories = cache(async () => db.select().from(categoriesTable));
const loadSubcategories = cache(async () => db.select().from(subcategories));

export async function getCategoriesAction() {
  try {
    return await loadCategories();
  } catch (err) {
    console.error("getCategoriesAction failed:", err);
    return [];
  }
}

export async function getSubcategoriesAction() {
  try {
    return await loadSubcategories();
  } catch (err) {
    console.error("getSubcategoriesAction failed:", err);
    return [];
  }
}

// Listing columns: everything except the downloadable file location, which must
// only ever be resolved by the entitlement-checked /api/download route.
const { fileUrl: _omitFileUrl, ...listingColumns } = getTableColumns(products);
void _omitFileUrl;

export async function getProductsAction(options?: {
  category?: string;
  subcategory?: string;
  search?: string;
  tag?: string;
  priceType?: "all" | "free" | "paid";
  featuredOnly?: boolean;
  sortBy?: "newest" | "rating" | "price_asc" | "price_desc" | "featured_premium";
  page?: number;
  limit?: number;
}) {
  try {
    const page = Math.min(10_000, Math.max(1, Math.floor(Number(options?.page) || 1)));
    const limit = Math.max(1, Math.min(100, Math.floor(Number(options?.limit) || 12)));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [
      eq(products.published, true),
      eq(products.status, "approved"),
    ];

    if (options?.featuredOnly) {
      conditions.push(eq(products.featured, true));
    }

    if (typeof options?.category === "string" && options.category && options.category !== "all") {
      conditions.push(eq(products.category, options.category.slice(0, 100)));
    }

    if (typeof options?.subcategory === "string" && options.subcategory && options.subcategory !== "all") {
      conditions.push(eq(products.subcategory, options.subcategory.slice(0, 100)));
    }

    if (options?.priceType === "free") {
      conditions.push(or(eq(products.isFree, true), eq(products.price, 0))!);
    } else if (options?.priceType === "paid") {
      conditions.push(and(eq(products.isFree, false), gt(products.price, 0))!);
    }

    const tag = typeof options?.tag === "string" ? options.tag.trim().slice(0, 100) : "";
    if (tag) {
      conditions.push(ilike(products.tags, `%${escapeLike(tag)}%`));
    }

    const search = typeof options?.search === "string" ? options.search.trim().slice(0, 200) : "";
    if (search) {
      const term = `%${escapeLike(search)}%`;
      conditions.push(
        or(
          ilike(products.title, term),
          ilike(products.shortDescription, term),
          ilike(products.description, term),
          ilike(products.tags, term)
        )!
      );
    }

    const whereClause = and(...conditions);

    // SQL sorting; products.id is the final tie-breaker so pagination is stable.
    let orderBys: SQL[] = [desc(products.createdAt)];
    const sortBy = options?.sortBy || "newest";
    if (sortBy === "rating") {
      orderBys = [
        sql`CASE WHEN ${products.rating} ~ '^[0-9]+([.][0-9]+)?$' THEN (${products.rating})::numeric END DESC NULLS LAST`,
        desc(products.createdAt),
      ];
    } else if (sortBy === "price_asc") {
      orderBys = [asc(products.price), desc(products.createdAt)];
    } else if (sortBy === "price_desc") {
      orderBys = [desc(products.price), desc(products.createdAt)];
    } else if (sortBy === "featured_premium") {
      orderBys = [desc(products.featured), desc(products.price), desc(products.createdAt)];
    }
    orderBys.push(desc(products.id));

    const [countResult, productRows] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(whereClause),
      db
        .select(listingColumns)
        .from(products)
        .where(whereClause)
        .orderBy(...orderBys)
        .limit(limit)
        .offset(offset),
    ]);

    const total = Number(countResult[0]?.count || 0);

    return {
      // fileUrl is kept in the shape (as null) so callers' types are unchanged.
      products: productRows.map((row) => ({ ...row, fileUrl: null as string | null })),
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  } catch (err) {
    console.error("getProductsAction failed:", err);
    return {
      products: [],
      total: 0,
      totalPages: 0,
      currentPage: 1,
    };
  }
}

export async function approveProductAction(id: string) {
  await requireAdminUser();
  assertValidId(id);

  const [updated] = await db
    .update(products)
    .set({
      status: "approved",
      published: true,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning({ slug: products.slug });

  revalidatePath("/");
  if (updated) revalidatePath(`/products/${updated.slug}`);
  revalidatePath("/admin/products");
  revalidatePath("/admin/approvals");
  return { success: true };
}

export async function rejectProductAction(id: string) {
  await requireAdminUser();
  assertValidId(id);

  const [updated] = await db
    .update(products)
    .set({
      status: "rejected",
      published: false,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning({ slug: products.slug });

  revalidatePath("/");
  if (updated) revalidatePath(`/products/${updated.slug}`);
  revalidatePath("/admin/products");
  revalidatePath("/admin/approvals");
  return { success: true };
}

export async function rateProductAction(productId: string, ratingValue: number) {
  if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
    throw new Error("Invalid rating value. Must be between 1 and 5.");
  }
  assertValidId(productId);

  // Ratings move public social proof, so anonymous callers are rejected.
  await requireUser();

  // Atomic running-average update: no lost writes under concurrent ratings.
  const [updated] = await db
    .update(products)
    .set({
      rating: sql`round(((coalesce(nullif(${products.rating}, '')::numeric, 5.0) * greatest(${products.ratingCount}, 0)) + ${ratingValue}) / (greatest(${products.ratingCount}, 0) + 1), 1)::text`,
      ratingCount: sql`greatest(${products.ratingCount}, 0) + 1`,
    })
    .where(eq(products.id, productId))
    .returning({ slug: products.slug, rating: products.rating });

  if (!updated) {
    throw new Error("Product not found");
  }

  revalidatePath(`/products/${updated.slug}`);
  revalidatePath("/");
  return { success: true, rating: updated.rating };
}
