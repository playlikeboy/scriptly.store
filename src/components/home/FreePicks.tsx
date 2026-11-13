import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  type HomeCategory,
  type HomeProduct,
  ProductThumb,
  categoryName,
} from "@/components/home/product-bits";

interface FreePicksProps {
  products: HomeProduct[];
  categories: HomeCategory[];
}

export default function FreePicks({ products, categories }: FreePicksProps) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="home-free-title" className="border-t border-border">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-12 lg:gap-16 lg:px-8">
        <div className="lg:col-span-4">
          <h2
            id="home-free-title"
            className="font-display text-3xl font-medium tracking-[-0.02em] text-foreground md:text-4xl"
          >
            Free for your next weekend build
          </h2>
          <p className="mt-3 max-w-[40ch] text-base text-muted-foreground">
            Open source boilerplates, scraper scripts, starter templates and micro-utilities. Download
            with zero friction.
          </p>
          <Link
            href="/free"
            className="mt-6 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            All free products
            <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>

        <ul className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:col-span-8">
          {products.map((product) => (
            <li key={product.id} className="border-t border-border">
              <Link
                href={`/products/${product.slug}`}
                className="group flex items-center gap-4 rounded-lg py-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ProductThumb product={product} sizes="96px" className="w-24 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                    {product.title}
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {categoryName(product.category, categories)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium text-success">Free</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
