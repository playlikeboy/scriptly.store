import { db } from "@/db";
import { coupons } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/price-utils";
import { PRICING_RULES } from "@/config/pricing";
import { CopyCodeButton } from "./_components/CopyCodeButton";

export const metadata: Metadata = {
  title: "Exclusive Deals, Offers & Coupons",
  description: "Redeem active coupon codes and flat discounts on premium SaaS templates, browser extensions, automation scripts, and digital tools.",
  alternates: {
    canonical: "https://scriptly.store/offers",
  },
};

export const dynamic = "force-dynamic";

function describeDiscount(coupon: { discountType: string; discountValue: number }) {
  return coupon.discountType === "percentage"
    ? `${coupon.discountValue}% off`
    : `${formatMoney(coupon.discountValue)} off`;
}

export default async function OffersPage() {
  // Active coupons only, newest first.
  const activeCoupons = await db
    .select({
      id: coupons.id,
      code: coupons.code,
      discountType: coupons.discountType,
      discountValue: coupons.discountValue,
      minPurchaseAmount: coupons.minPurchaseAmount,
    })
    .from(coupons)
    .where(eq(coupons.active, true))
    .orderBy(desc(coupons.createdAt));

  const bulkThreshold = formatMoney(PRICING_RULES.bulkDiscountThresholdCents);
  const bulkPercent = PRICING_RULES.bulkDiscountPercent;

  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <header className="max-w-2xl">
          <h1 className="font-display text-3xl leading-tight tracking-[-0.02em] text-balance md:text-4xl">
            Marketplace offers &amp; discounts
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Grab high-quality templates, kits, and ebooks for a fraction of the cost with our active campaigns.
          </p>
        </header>

        {/* Automatic bulk discount */}
        <section
          aria-labelledby="bulk-offer"
          className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8"
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-lg">
              <p className="text-sm text-success">Applied automatically</p>
              <h2 id="bulk-offer" className="mt-1 text-2xl font-medium tracking-[-0.01em]">
                {bulkPercent}% off your cart
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Add boilerplates, kits, or prompts to your cart. Once your subtotal reaches{" "}
                <span className="font-medium tabular-nums text-foreground">{bulkThreshold}</span>, a flat{" "}
                {bulkPercent}% discount is applied at checkout. No code needed.
              </p>
            </div>
            <Button asChild variant="accent" className="self-start sm:self-auto">
              <Link href="/explore">Shop now</Link>
            </Button>
          </div>
          <p className="mt-6 border-t border-border pt-4 text-sm tabular-nums text-muted-foreground">
            Minimum cart: {bulkThreshold}
          </p>
        </section>

        {/* Coupon codes */}
        <section aria-labelledby="coupon-codes" className="mt-14">
          <h2 id="coupon-codes" className="font-display text-2xl tracking-[-0.02em]">
            Coupon codes
          </h2>

          {activeCoupons.length > 0 ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter a code on the cart page to redeem it.
              </p>
              <ul className="mt-6 divide-y divide-border border-y border-border">
                {activeCoupons.map((coupon) => (
                  <li
                    key={coupon.id}
                    className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-lg font-medium tabular-nums">{describeDiscount(coupon)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Code{" "}
                        <span className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[13px] text-foreground">
                          {coupon.code}
                        </span>
                        {coupon.minPurchaseAmount > 0 && (
                          <span className="tabular-nums">
                            {" "}
                            · on purchases over {formatMoney(coupon.minPurchaseAmount)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <CopyCodeButton code={coupon.code} />
                      <Button asChild variant="ghost" size="sm">
                        <Link href="/cart">Go to cart</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="mt-6 rounded-2xl bg-secondary/60 px-6 py-10">
              <p className="text-base font-medium">No coupon codes right now</p>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                We launch custom coupon codes during holiday drops and builder spotlights. Check back soon.
              </p>
              <Button asChild variant="outline" className="mt-5">
                <Link href="/explore">Back to catalog</Link>
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
