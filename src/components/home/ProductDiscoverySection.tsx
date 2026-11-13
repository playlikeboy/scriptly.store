import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ProductCard from "@/components/marketplace/ProductCard";
import { Button } from "@/components/ui/button";
import { type HomeCategory, type HomeProduct, categoryName } from "@/components/home/product-bits";

interface ProductDiscoverySectionProps {
  products: HomeProduct[];
  categories: HomeCategory[];
}

export default function ProductDiscoverySection({ products, categories }: ProductDiscoverySectionProps) {
  return (
    <section aria-labelledby="home-latest-title">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <h2
              id="home-latest-title"
              className="font-display text-3xl font-medium tracking-[-0.02em] text-foreground md:text-4xl"
            >
              New in the catalogue
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Production codebases, automation scripts and UI systems, ready for commercial use.
            </p>
          </div>
          <Button asChild variant="outline" className="self-start sm:self-auto">
            <Link href="/explore">
              Browse all products
              <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {products.length > 0 ? (
          <ul className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <li key={product.id} className="min-w-0">
                <ProductCard product={product} categoryName={categoryName(product.category, categories)} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-10 rounded-2xl bg-secondary px-6 py-14 text-center">
            <p className="text-base font-medium text-foreground">The catalogue is being restocked.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              New products appear here as soon as they are approved.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/explore">Open the catalogue</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
