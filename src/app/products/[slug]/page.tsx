export const dynamic = "force-dynamic";

import { cache } from "react";
import { db } from "@/db";
import { products, orders, users, affiliateProfiles } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getOrCreateDbUser } from "@/lib/auth-utils";
import ProductCheckout from "@/components/ProductCheckout";
import Link from "next/link";
import ProductAffiliateShare from "@/components/ProductAffiliateShare";
import { getProductEffectivePrice, formatPrice, formatMoney, CATALOG_CURRENCY } from "@/lib/price-utils";
import { Check, ChevronRight, ExternalLink, Heart, Lock } from "lucide-react";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { marked } from "marked";
import ShareButton from "@/components/ShareButton";
import AdminToolbar from "@/app/products/[slug]/AdminToolbar";
import ProductScreenshots from "@/components/ProductScreenshots";
import ProductMediaSwitcher from "@/components/ProductMediaSwitcher";
import ProductRating from "@/components/ProductRating";
import ProductInteractionAndReviews from "@/components/ProductInteractionAndReviews";
import ProductStickyBar from "@/components/ProductStickyBar";
import ProductCard from "@/components/marketplace/ProductCard";
import { getProductSeo } from "@/lib/seo-data";
import { siteConfig } from "@/config/site";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Deduplicate the product + session lookups shared by generateMetadata and the page render.
const getProductBySlug = cache(async (slug: string) =>
  db.query.products.findFirst({
    where: eq(products.slug, slug),
  })
);
const getCurrentUser = cache(getOrCreateDbUser);

const humanizeCategory = (category: string) => category.replace(/-/g, " ");

const INCLUDED = [
  {
    title: "Full source code",
    body: "Clean, unminified Next.js & TypeScript repository with modular architecture and zero obfuscation.",
  },
  {
    title: "Commercial license",
    body: "Use for unlimited personal & client commercial projects without recurring royalty fees.",
  },
  {
    title: "Instant digital delivery",
    body: "Download link generated immediately upon checkout and stored in your customer dashboard forever.",
  },
  {
    title: "Lifetime access & updates",
    body: "Get free access to future version updates and bug fixes directly from your account library.",
  },
] as const;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "Product Not Found | ScriptlyStore" };
  }

  const user = await getCurrentUser();
  const isUserAdmin = user?.role === "admin";
  const isUserCreator = user !== null && product.creatorId === user.id;
  const isAccessible = product.published && product.status === "approved";

  if (!isAccessible && !isUserAdmin && !isUserCreator) {
    return { title: "Product Not Found | ScriptlyStore" };
  }

  const promo = getProductEffectivePrice(product);
  const priceText = promo.isFree ? "FREE" : formatMoney(promo.effectivePrice);
  const seo = getProductSeo(product.slug, product.title, product.shortDescription, product.category, priceText);

  const ogImages: { url: string; width?: number; height?: number; alt?: string }[] = [];
  if (product.thumbnail) {
    ogImages.push({
      url: product.thumbnail,
      width: 1200,
      height: 630,
      alt: `${product.title} Preview — ScriptlyStore`,
    });
  }
  if (product.previewGif) {
    ogImages.push({ url: product.previewGif, alt: `${product.title} Animated Demo` });
  }

  const keywords = product.tags
    ? product.tags.split(",").map((t) => t.trim())
    : [product.category, "developer tool", "source code", "boilerplate", "Next.js template", "React component"];

  return {
    title: `${product.title} — Premium ${humanizeCategory(product.category)} | ScriptlyStore`,
    description: seo.description,
    keywords,
    alternates: {
      canonical: `${siteConfig.url}/products/${product.slug}`,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      title: `${product.title} | ScriptlyStore`,
      description: seo.description,
      url: `${siteConfig.url}/products/${product.slug}`,
      siteName: siteConfig.name,
      type: "website",
      images: ogImages,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.title} | ScriptlyStore`,
      description: seo.description,
      creator: "@sh20raj",
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const user = await getCurrentUser();
  const isUserAdmin = user?.role === "admin";
  const isUserCreator = user !== null && product.creatorId === user.id;
  const isAccessible = product.published && product.status === "approved";

  if (!isAccessible && !isUserAdmin && !isUserCreator) {
    notFound();
  }

  // Independent lookups run in parallel instead of a serial waterfall.
  const [affiliateProfile, creatorRecord, relatedProducts, purchase] = await Promise.all([
    user
      ? db.query.affiliateProfiles.findFirst({ where: eq(affiliateProfiles.id, user.id) })
      : Promise.resolve(undefined),
    product.creatorId
      ? db.query.users.findFirst({ where: eq(users.id, product.creatorId) })
      : Promise.resolve(undefined),
    db.query.products.findMany({
      where: and(
        eq(products.category, product.category),
        ne(products.id, product.id),
        eq(products.published, true),
        eq(products.status, "approved")
      ),
      limit: 3,
    }),
    user
      ? db.query.orders.findFirst({
          where: and(
            eq(orders.userId, user.id),
            eq(orders.productId, product.id),
            eq(orders.status, "completed")
          ),
        })
      : Promise.resolve(undefined),
  ]);

  const isApprovedAffiliate = affiliateProfile?.status === "approved";
  const storeName: string | null = creatorRecord?.storeName || creatorRecord?.name || null;
  const hasPurchased = Boolean(purchase);

  const promo = getProductEffectivePrice(product);
  const categoryLabel = humanizeCategory(product.category);
  const categoryHref = `/explore/${encodeURIComponent(product.category.toLowerCase())}`;

  const tagsList = product.tags
    ? product.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const screenshotsList = Array.from(
    new Set(
      product.screenshots
        ? product.screenshots.split(",").map((s) => s.trim()).filter(Boolean)
        : []
    )
  ).filter((src) => src !== product.thumbnail);

  const customRenderer = new marked.Renderer();
  customRenderer.link = function (token) {
    return `<a href="${token.href}" title="${token.title || ""}" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-4 hover:no-underline">${token.text}</a>`;
  };
  const htmlDescription = await marked.parse(product.description || "", { renderer: customRenderer });

  const priceFormatted = promo.isFree ? "FREE" : formatMoney(promo.effectivePrice);
  const seo = getProductSeo(product.slug, product.title, product.shortDescription, product.category, priceFormatted);

  // Rich Schema.org JSON-LD structured data
  const productSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: product.thumbnail ? [product.thumbnail, ...screenshotsList] : [],
    description: product.shortDescription,
    sku: product.id,
    mpn: product.slug,
    brand: {
      "@type": "Brand",
      name: "ScriptlyStore",
    },
    category: product.category,
    offers: {
      "@type": "Offer",
      url: `${siteConfig.url}/products/${product.slug}`,
      priceCurrency: CATALOG_CURRENCY,
      price: (promo.effectivePrice / 100).toString(),
      priceValidUntil: "2030-12-31",
      itemCondition: "https://schema.org/NewCondition",
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: storeName || "ScriptlyStore",
        url: siteConfig.url,
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating || "5.0",
      reviewCount: Math.max(product.ratingCount || 1, 1),
      bestRating: "5",
      worstRating: "1",
    },
  };

  const breadcrumbsSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Explore", item: `${siteConfig.url}/explore` },
      {
        "@type": "ListItem",
        position: 3,
        name: categoryLabel,
        item: `${siteConfig.url}${categoryHref}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: product.title,
        item: `${siteConfig.url}/products/${product.slug}`,
      },
    ],
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: product.title,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web, macOS, Linux, Windows",
    offers: {
      "@type": "Offer",
      price: (promo.effectivePrice / 100).toString(),
      priceCurrency: CATALOG_CURRENCY,
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: seo.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  const promoEndLabel =
    promo.hasDiscount && promo.promoEnd
      ? promo.promoEnd.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : null;

  return (
    <div className="bg-background text-foreground pb-24 lg:pb-0">
      {/* Structured SEO Schemas */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Mobile buy bar: appears once the purchase panel scrolls away */}
      <ProductStickyBar
        title={product.title}
        thumbnail={product.thumbnail}
        pricePaise={promo.effectivePrice}
        isFree={promo.isFree}
        demoUrl={product.demoUrl}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {/* Breadcrumbs + admin controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <li>
                <Link href="/" className="rounded-sm hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-3 opacity-60" strokeWidth={1.75} />
              </li>
              <li>
                <Link href="/explore" className="rounded-sm hover:text-foreground transition-colors">
                  Explore
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-3 opacity-60" strokeWidth={1.75} />
              </li>
              <li>
                <Link href={categoryHref} className="rounded-sm capitalize hover:text-foreground transition-colors">
                  {categoryLabel}
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-3 opacity-60" strokeWidth={1.75} />
              </li>
              <li className="min-w-0">
                <span aria-current="page" className="block max-w-[220px] truncate text-foreground sm:max-w-xs">
                  {product.title}
                </span>
              </li>
            </ol>
          </nav>

          {isUserAdmin && <AdminToolbar productId={product.id} isPublished={product.published} />}
        </div>

        {/* Title block */}
        <header className="mt-6 max-w-4xl space-y-3 md:mt-8">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <Link href={categoryHref} className="capitalize hover:text-foreground transition-colors">
              {categoryLabel}
            </Link>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-xs">v{product.version || "1.0.0"}</span>
            {storeName && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  by{" "}
                  {product.creatorId ? (
                    <Link href={`/stores/${product.creatorId}`} className="text-foreground hover:text-primary transition-colors">
                      {storeName}
                    </Link>
                  ) : (
                    <span className="text-foreground">{storeName}</span>
                  )}
                </span>
              </>
            )}
          </p>
          <h1 className="font-display text-3xl leading-[1.1] text-foreground md:text-5xl">{product.title}</h1>
          {product.shortDescription && (
            <p className="max-w-[68ch] text-base leading-relaxed text-muted-foreground md:text-lg">
              {product.shortDescription}
            </p>
          )}
          <ProductRating productId={product.id} initialRating={product.rating || "5.0"} />
        </header>

        <div className="mt-8 grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Media + documentation */}
          <div className="min-w-0 space-y-12 lg:col-span-7">
            <section aria-label="Product media" className="space-y-4">
              <ProductMediaSwitcher
                videoUrl={product.videoUrl}
                previewGif={product.previewGif}
                thumbnail={product.thumbnail}
                title={product.title}
              />
              {screenshotsList.length > 0 && (
                <ProductScreenshots screenshots={screenshotsList} productTitle={product.title} />
              )}
            </section>

            <section aria-labelledby="overview-heading" className="space-y-4">
              <h2 id="overview-heading" className="text-xl font-semibold tracking-tight text-foreground">
                Overview
              </h2>
              <div
                dangerouslySetInnerHTML={{ __html: htmlDescription }}
                className="markdown-content max-w-[68ch] text-[15px] [&>*:first-child]:mt-0"
              />
            </section>

            {tagsList.length > 0 && (
              <section aria-labelledby="stack-heading" className="space-y-3">
                <h2 id="stack-heading" className="text-xl font-semibold tracking-tight text-foreground">
                  Built with
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {tagsList.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {seo.faqs.length > 0 && (
              <section aria-labelledby="faq-heading" className="space-y-3">
                <h2 id="faq-heading" className="text-xl font-semibold tracking-tight text-foreground">
                  Questions
                </h2>
                <div className="divide-y divide-border border-y border-border">
                  {seo.faqs.map((faq) => (
                    <details key={faq.question} className="group py-4">
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-sm text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                        <span>{faq.question}</span>
                        <ChevronRight
                          aria-hidden="true"
                          strokeWidth={1.75}
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-90"
                        />
                      </summary>
                      <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            <ProductAffiliateShare
              productSlug={product.slug}
              productTitle={product.title}
              affiliateSlug={user?.affiliateSlug || user?.id || null}
              isApproved={isApprovedAffiliate}
              isLoggedIn={!!user}
              commissionPercent={product.affiliateCommissionPercent ?? 30}
            />
          </div>

          {/* Purchase panel */}
          <aside className="lg:col-span-5 lg:sticky lg:top-20" aria-label="Purchase">
            <div
              id="checkout-panel"
              className="scroll-mt-24 rounded-2xl bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)] sm:p-6"
            >
              {/* Price */}
              <div className="space-y-1">
                {promo.isFree ? (
                  <p className="text-3xl font-semibold tracking-tight text-success">Free</p>
                ) : promo.hasDiscount ? (
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="tabular text-3xl font-semibold tracking-tight text-foreground">
                      {formatMoney(promo.effectivePrice)}
                    </p>
                    <p className="tabular text-base text-muted-foreground line-through">
                      <span className="sr-only">Was </span>
                      {formatMoney(promo.price)}
                    </p>
                    <p className="text-sm font-medium text-primary">{promo.discountPercent}% off</p>
                  </div>
                ) : (
                  <p
                    className={`tabular text-3xl font-semibold tracking-tight ${
                      product.price <= 0 ? "text-success" : "text-foreground"
                    }`}
                  >
                    {formatPrice(product.price)}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {promo.isFree
                    ? "Open source · Instant ZIP download"
                    : "One-time purchase · Lifetime access · Free updates"}
                </p>
                {promoEndLabel && (
                  <p className="text-xs text-muted-foreground">Offer ends {promoEndLabel}</p>
                )}
              </div>

              <div className="mt-5">
                <ProductCheckout
                  product={product}
                  hasPurchased={hasPurchased}
                  userLoggedIn={!!user}
                  isFree={promo.isFree}
                />
              </div>

              <div className="mt-3 flex items-center gap-2">
                {product.demoUrl && (
                  <Button asChild variant="outline" className="flex-1">
                    <a href={product.demoUrl} target="_blank" rel="noopener noreferrer">
                      Live preview
                      <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden="true" />
                    </a>
                  </Button>
                )}
                <div className={product.demoUrl ? "flex-1" : "w-full"}>
                  <ShareButton productTitle={product.title} productSlug={product.slug} />
                </div>
              </div>

              {/* What's included */}
              <div className="mt-6 border-t border-border pt-5">
                <h2 className="text-sm font-semibold text-foreground">What you get</h2>
                <ul className="mt-3 space-y-3">
                  {INCLUDED.map((item) => (
                    <li key={item.title} className="flex gap-3">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={1.75} aria-hidden="true" />
                      <div className="text-sm">
                        <p className="font-medium text-foreground">{item.title}</p>
                        <p className="text-muted-foreground leading-relaxed">{item.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  Razorpay secure checkout — UPI, cards and netbanking.
                </p>
              </div>

              {/* Creator */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border pt-5 text-sm">
                <p className="min-w-0 text-muted-foreground">
                  Sold by{" "}
                  {product.creatorId ? (
                    <Link
                      href={`/stores/${product.creatorId}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {storeName || "Verified Developer"}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">{storeName || "Verified Developer"}</span>
                  )}
                </p>
                <a
                  href="https://razorpay.me/@iamsh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Heart className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                  Tip &amp; sponsor
                </a>
              </div>
            </div>

          </aside>
        </div>

        {/* Reviews */}
        <section aria-label="Reviews" className="mt-16 border-t border-border pt-10 md:mt-20">
          <ProductInteractionAndReviews
            productId={product.id}
            productSlug={product.slug}
            initialViews={product.views || 0}
            initialDownloads={product.downloadsCount || 0}
            initialSaves={product.saves || 0}
            initialRating={product.rating || "5.0"}
            initialRatingCount={product.ratingCount || 0}
            userLoggedIn={!!user}
            showStats={product.showStats}
          />
        </section>

        {/* Related */}
        {relatedProducts.length > 0 && (
          <section aria-labelledby="related-heading" className="mt-16 border-t border-border pt-10 md:mt-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="related-heading" className="text-2xl font-semibold tracking-tight text-foreground">
                More in <span className="capitalize">{categoryLabel}</span>
              </h2>
              <Button asChild variant="link" className="h-auto">
                <Link href={categoryHref}>
                  View all
                  <ChevronRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
                </Link>
              </Button>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProducts.map((rel) => (
                <ProductCard key={rel.id} product={rel} categoryName={rel.category} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
