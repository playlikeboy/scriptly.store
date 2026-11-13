import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs, ProductGrid, categoryNameMap } from "@/app/explore/_components/catalog";
import { getDirectoryBySlug, safeExternalUrl } from "../_lib/directories";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const directory = await getDirectoryBySlug(slug);

  if (!directory) {
    return { title: "Directory Not Found | ScriptlyStore" };
  }

  return {
    title: `How to Submit to ${directory.name} - Startup Directory SEO Insights`,
    description: `Complete guide on submitting your software and SaaS products to ${directory.name}. ${directory.description}`,
    alternates: {
      canonical: `https://scriptly.store/directories/${slug}`,
    },
  };
}

export default async function DirectoryDetailPage({ params }: PageProps) {
  const { slug } = await params;

  // Directory lookup and related products are independent: run in parallel.
  const [directory, relatedProducts, categoryRows] = await Promise.all([
    getDirectoryBySlug(slug),
    // 3 related products to cross-link and boost internal SEO authority
    db
      .select()
      .from(products)
      .where(and(eq(products.published, true), eq(products.status, "approved")))
      .orderBy(desc(products.rating), desc(products.createdAt))
      .limit(3),
    db.select({ slug: categories.slug, name: categories.name }).from(categories),
  ]);

  if (!directory) {
    notFound();
  }

  const submitUrl = safeExternalUrl(directory.submission_link);

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": `How to Submit to ${directory.name} - Startup Directory Insights`,
    "description": `Detailed submission guidelines and details for ${directory.name} SaaS directory.`,
    "publisher": {
      "@type": "Organization",
      "name": "ScriptlyStore",
      "logo": {
        "@type": "ImageObject",
        "url": "https://scriptly.store/favicon.svg",
      },
    },
    "mainEntity": {
      "@type": "Service",
      "name": directory.name,
      "description": directory.description,
      "url": submitUrl ?? undefined,
    },
  };

  return (
    <div className="bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />

      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Directories", href: "/directories" },
            { label: directory.name },
          ]}
        />

        <div className="mt-6 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <article className="min-w-0 max-w-[68ch]">
            <h1 className="font-display text-3xl leading-tight tracking-[-0.02em] text-balance md:text-4xl">
              {directory.name}
            </h1>
            {directory.description && (
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{directory.description}</p>
            )}

            <h2 className="mt-10 font-display text-2xl tracking-[-0.02em]">Submission instructions</h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              To list your startup, SaaS boilerplate, or script on{" "}
              <strong className="font-medium text-foreground">{directory.name}</strong>, follow these best practices:
            </p>
            <ul className="mt-4 list-disc space-y-3 pl-5 text-base leading-relaxed text-muted-foreground marker:text-border">
              <li>Prepare a clear, high-impact tagline and description explaining your product&apos;s unique value proposition.</li>
              <li>Include high-resolution screenshots and/or video demonstration links to increase review conversion rates.</li>
              <li>
                Select appropriate category tags (e.g. <em>developer tools</em>, <em>productivity</em>,{" "}
                <em>artificial intelligence</em>) that match your tech stack.
              </li>
              <li>Provide clean URLs to your product landing page, pricing page, or GitHub repository.</li>
            </ul>
          </article>

          <aside className="lg:pt-2">
            <div className="rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24">
              <dl className="text-sm">
                <dt className="text-muted-foreground">Submission type</dt>
                <dd className="mt-0.5 font-medium">Startup &amp; tech launchpad</dd>
              </dl>
              {submitUrl ? (
                <Button asChild className="mt-5 w-full">
                  <a href={submitUrl} target="_blank" rel="noopener noreferrer">
                    Go to submission form
                    <ArrowUpRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </Button>
              ) : (
                <p className="mt-5 text-sm text-muted-foreground">No submission link is listed for this directory.</p>
              )}
              <Link
                href="/directories"
                className="mt-4 block rounded-sm text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                All directories
              </Link>
            </div>
          </aside>
        </div>

        {relatedProducts.length > 0 && (
          <section aria-labelledby="related-templates" className="mt-20 border-t border-border pt-12">
            <h2 id="related-templates" className="font-display text-2xl tracking-[-0.02em]">
              Launch faster with pre-built code
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Don&apos;t build from scratch. Ship your SaaS to directories like {directory.name} sooner with starter
              templates and scripts from the marketplace.
            </p>
            <ProductGrid products={relatedProducts} categoryNames={categoryNameMap(categoryRows)} className="mt-8 xl:grid-cols-3" />
          </section>
        )}
      </div>
    </div>
  );
}
