import Image from "next/image";
import { Star } from "lucide-react";
import type { getProductsAction } from "@/lib/actions/products";
import { formatPrice, getProductEffectivePrice } from "@/lib/price-utils";
import { cn } from "@/lib/utils";

export type HomeProduct = Awaited<ReturnType<typeof getProductsAction>>["products"][number];

export interface HomeCategory {
  id: string;
  name: string;
  slug: string;
}

/** "saas-templates" -> "Saas templates" when no category record name is available. */
export function humanizeSlug(slug: string | null | undefined) {
  if (!slug) return "";
  const text = slug.replace(/[-_]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function categoryName(slug: string, categories: HomeCategory[]) {
  return categories.find((c) => c.slug === slug)?.name ?? humanizeSlug(slug);
}

/** Effective price with the original struck through while a discount runs. */
export function ProductPrice({
  product,
  className,
}: {
  product: Pick<HomeProduct, "price" | "isFree" | "discountPercent" | "promoStart" | "promoEnd">;
  className?: string;
}) {
  const promo = getProductEffectivePrice(product);

  if (promo.isFree || promo.effectivePrice <= 0) {
    return <span className={cn("font-medium text-success", className)}>Free</span>;
  }

  return (
    <span className={cn("tabular inline-flex items-baseline gap-1.5", className)}>
      <span className="font-medium text-foreground">{formatPrice(promo.effectivePrice)}</span>
      {promo.hasDiscount && promo.price > promo.effectivePrice && (
        <span className="text-xs text-muted-foreground line-through">
          <span className="sr-only">was </span>
          {formatPrice(promo.price)}
        </span>
      )}
    </span>
  );
}

/** Rating is only shown when it is backed by real reviews. */
export function ProductRating({ product }: { product: Pick<HomeProduct, "rating" | "ratingCount"> }) {
  if (!product.ratingCount || product.ratingCount <= 0 || !product.rating) return null;
  return (
    <span className="tabular inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Star className="size-3.5 fill-amber-500 text-amber-500" strokeWidth={1.75} aria-hidden="true" />
      <span className="text-foreground">{product.rating}</span>
      <span className="sr-only">out of 5 from {product.ratingCount} ratings</span>
    </span>
  );
}

/** 16:10 product thumbnail; falls back to a quiet paper panel with the title. */
export function ProductThumb({
  product,
  sizes,
  preload = false,
  className,
}: {
  product: Pick<HomeProduct, "thumbnail" | "title">;
  sizes: string;
  preload?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-secondary", className)}>
      {product.thumbnail ? (
        <Image
          src={product.thumbnail}
          alt=""
          fill
          sizes={sizes}
          preload={preload}
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-3 text-center font-display text-base leading-snug text-muted-foreground [&>span]:line-clamp-3">
          <span>{product.title}</span>
        </div>
      )}
    </div>
  );
}
