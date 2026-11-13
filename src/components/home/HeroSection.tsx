import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type HomeCategory,
  type HomeProduct,
  ProductPrice,
  ProductThumb,
  categoryName,
} from "@/components/home/product-bits";

interface HeroSectionProps {
  featuredProducts?: HomeProduct[];
  categories?: HomeCategory[];
}

const PROMISES = [
  "Full source code",
  "Instant ZIP delivery",
  "Commercial licensing",
  "No recurring subscriptions",
];

export default function HeroSection({ featuredProducts = [], categories = [] }: HeroSectionProps) {
  const [lead, ...rest] = featuredProducts;
  const supporting = rest.slice(0, 2);

  return (
    <section aria-labelledby="home-hero-title" className="border-b border-border">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 pt-12 pb-16 sm:px-6 md:pt-16 md:pb-24 lg:grid-cols-12 lg:gap-16 lg:px-8">
        <div className="flex flex-col justify-center lg:col-span-5">
          <h1
            id="home-hero-title"
            className="font-display text-[2.75rem] leading-[1.02] font-medium tracking-[-0.03em] text-balance text-foreground sm:text-6xl md:text-7xl"
          >
            Build less.
            <br />
            <span className="italic text-muted-foreground">Ship more.</span>
          </h1>
          <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-pretty text-muted-foreground">
            Production-ready code, SaaS boilerplates, automation scripts and developer tools for
            founders who ship.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/explore">
                Explore the catalogue
                <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/featured">Featured products</Link>
            </Button>
          </div>

          <ul className="mt-10 grid grid-cols-1 gap-x-6 gap-y-2.5 text-sm text-muted-foreground min-[400px]:grid-cols-2">
            {PROMISES.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-foreground" strokeWidth={1.75} aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {lead && (
          <div className="lg:col-span-7">
            <h2 className="sr-only">Featured products</h2>
            <Link
              href={`/products/${lead.slug}`}
              className="group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
            >
              <ProductThumb
                product={lead}
                preload
                sizes="(min-width: 1280px) 720px, (min-width: 1024px) 58vw, 100vw"
                className="rounded-2xl shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)]"
              />
              <div className="mt-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-medium text-foreground transition-colors group-hover:text-primary">
                    {lead.title}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {categoryName(lead.category, categories)} · {lead.shortDescription}
                  </p>
                </div>
                <ProductPrice product={lead} className="shrink-0 text-base" />
              </div>
            </Link>

            {supporting.length > 0 && (
              <ul className="mt-8 grid grid-cols-1 gap-6 border-t border-border pt-6 sm:grid-cols-2">
                {supporting.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={`/products/${product.slug}`}
                      className="group flex items-center gap-4 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
                    >
                      <ProductThumb product={product} sizes="128px" className="w-28 shrink-0 rounded-lg" />
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                          {product.title}
                        </h3>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {categoryName(product.category, categories)}
                        </p>
                        <ProductPrice product={product} className="mt-1.5 text-sm" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
