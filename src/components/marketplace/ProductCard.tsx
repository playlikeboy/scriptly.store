"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/CartContext";
import { formatMoney, getProductEffectivePrice } from "@/lib/price-utils";

/**
 * Structural shape the card needs. Matches `products.$inferSelect` and any
 * subset of it passed by home / product pages, so callers stay untouched.
 */
export interface ProductCardProduct {
  id: string;
  title: string;
  slug: string;
  price: number; // paise
  category: string;
  shortDescription?: string | null;
  thumbnail?: string | null;
  previewGif?: string | null;
  rating?: string | number | null;
  ratingCount?: number | null;
  isFree?: boolean | null;
  discountPercent?: number | null;
  promoStart?: Date | string | null;
  promoEnd?: Date | string | null;
}

export interface ProductCardProps {
  product?: ProductCardProduct;
  /** Legacy alias of `product`. */
  prod?: ProductCardProduct;
  categoryName?: string;
}

export default function ProductCard({ product: productProp, prod, categoryName }: ProductCardProps) {
  const product = productProp ?? prod;
  const [showPreview, setShowPreview] = useState(false);
  const { addToCart, isInCart } = useCart();

  if (!product) return null;

  const inCart = isInCart(product.id);
  const promo = getProductEffectivePrice({
    price: product.price,
    isFree: product.isFree ?? false,
    discountPercent: product.discountPercent ?? 0,
    promoStart: product.promoStart ?? null,
    promoEnd: product.promoEnd ?? null,
  });
  const isFree = promo.isFree || promo.effectivePrice <= 0;
  const category = categoryName || product.category;
  const ratingCount = product.ratingCount ?? 0;
  const ratingValue = ratingCount > 0 ? Number(product.rating ?? 5) : null;
  const hasGif = Boolean(product.previewGif);

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      title: product.title,
      slug: product.slug,
      price: promo.effectivePrice,
      originalPrice: product.price,
      category: product.category,
      thumbnail: product.thumbnail || null,
    });
  };

  return (
    <article
      className="group relative flex w-full min-w-0 flex-col gap-3"
      onMouseEnter={hasGif ? () => setShowPreview(true) : undefined}
      onMouseLeave={hasGif ? () => setShowPreview(false) : undefined}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border bg-secondary">
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt=""
            width={640}
            height={400}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="flex h-full w-full items-end p-4">
            <span className="font-display text-2xl leading-tight text-muted-foreground line-clamp-2">
              {product.title}
            </span>
          </div>
        )}

        {hasGif && showPreview && (
          <img
            src={product.previewGif as string}
            alt=""
            width={640}
            height={400}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate text-xs text-muted-foreground">{category}</p>
        <h3 className="text-[15px] font-medium leading-snug text-foreground">
          <Link
            href={`/products/${product.slug}`}
            className="line-clamp-1 outline-none transition-colors duration-150 group-hover:text-primary after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-offset-4 focus-visible:after:ring-offset-background"
          >
            {product.title}
          </Link>
        </h3>
        {product.shortDescription && (
          <p className="line-clamp-1 text-sm text-muted-foreground">{product.shortDescription}</p>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 tabular-nums">
          {isFree ? (
            <span className="text-sm font-semibold text-success">Free</span>
          ) : (
            <>
              <span className="text-sm font-semibold text-foreground">
                {formatMoney(promo.effectivePrice)}
              </span>
              {promo.hasDiscount && (
                <span className="text-xs text-muted-foreground line-through">
                  <span className="sr-only">Was </span>
                  {formatMoney(product.price)}
                </span>
              )}
            </>
          )}

          {ratingValue !== null && Number.isFinite(ratingValue) && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="size-3.5 fill-amber-500 text-amber-500" strokeWidth={1.75} aria-hidden="true" />
              <span className="sr-only">Rated </span>
              {ratingValue.toFixed(1)}
              <span>({ratingCount})</span>
            </span>
          )}
        </div>

        {inCart ? (
          <Button
            asChild
            variant="secondary"
            size="icon-sm"
            className="relative z-10"
          >
            <Link href="/cart" aria-label={`${product.title} is in your cart. View cart`}>
              <Check className="size-4 text-success" strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={handleAddToCart}
            className="relative z-10"
            aria-label={`Add ${product.title} to cart`}
          >
            <Plus className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </Button>
        )}
      </div>
    </article>
  );
}
