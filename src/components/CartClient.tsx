"use client";

import { useCart } from "@/components/CartContext";
import { useState, useTransition, useEffect, useId } from "react";
import useSWR from "swr";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { createRazorpayOrderAction, verifyPaymentAction } from "@/lib/actions/orders";
import { loadRazorpayScript } from "@/lib/payments/razorpay-loader";
import { validateReferralCodeAction } from "@/lib/actions/affiliates";
import { formatMoney } from "@/lib/price-utils";
import { X, Loader2, Lock, ArrowLeft, Check, CircleAlert } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CouponResponse {
  success: boolean;
  message?: string;
  coupon?: {
    code: string;
    discountType: "percentage" | "fixed" | string;
    discountValue: number;
  };
}

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureResponse {
  error?: { description?: string };
}

const fetcher = (url: string): Promise<CouponResponse> => fetch(url).then((res) => res.json());

// Mirrors the server pricing rules in createRazorpayOrderAction.
const BULK_THRESHOLD_PAISE = 6000;
const BULK_DISCOUNT_RATE = 0.2;
const REFERRAL_DISCOUNT_RATE = 0.05;
const GATEWAY_MINIMUM_PAISE = 100;

function CartSkeleton() {
  return (
    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12" aria-busy="true" aria-label="Loading cart">
      <div className="divide-y divide-border border-y border-border lg:col-span-7">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-5">
            <Skeleton className="aspect-[16/10] w-24 shrink-0 rounded-lg sm:w-32" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
      <div className="lg:col-span-5">
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export default function CartClient() {
  const router = useRouter();
  const fieldId = useId();
  const { cart, removeFromCart, clearCart, cartSubtotal, cartCount } = useCart();
  const [couponInput, setCouponInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [referralInput, setReferralInput] = useState("");
  const [appliedReferral, setAppliedReferral] = useState<string | null>(null);
  const [referralPending, setReferralPending] = useState(false);
  const [referralMessage, setReferralMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const match = document.cookie.match(/(?:^|; )scriptly_referred_by=([^;]*)/);
    if (match && match[1]) {
      const decodedVal = decodeURIComponent(match[1]);
      setAppliedReferral(decodedVal);
      setReferralInput(decodedVal);
      setReferralMessage({
        success: true,
        text: `Referral "${decodedVal}" active — 5% off applied.`,
      });
    }
  }, []);

  // Automatic bulk offer (same threshold as the server)
  const autoOfferDiscount =
    cartSubtotal >= BULK_THRESHOLD_PAISE ? Math.round(cartSubtotal * BULK_DISCOUNT_RATE) : 0;
  const amountAfterAuto = cartSubtotal - autoOfferDiscount;

  // Validate coupon (productIds are required for store-specific coupons)
  const productIdsParam = cart.map((i) => i.id).join(",");
  const swrKey = appliedCode
    ? `/api/coupons/validate?code=${encodeURIComponent(appliedCode)}&amount=${amountAfterAuto}&productIds=${encodeURIComponent(productIdsParam)}`
    : null;

  const { data: couponData, error: swrError, isLoading: couponLoading } = useSWR<CouponResponse>(swrKey, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  let couponDiscount = 0;
  let couponError: string | null = null;
  let couponSuccess: string | null = null;

  if (appliedCode && !couponLoading) {
    if (swrError || (couponData && !couponData.success)) {
      couponError = couponData?.message || "That coupon code isn't valid.";
    } else if (couponData?.success && couponData.coupon) {
      couponSuccess = `Coupon "${couponData.coupon.code}" applied.`;
      const val = couponData.coupon.discountValue;
      if (couponData.coupon.discountType === "percentage") {
        couponDiscount = Math.round(amountAfterAuto * (val / 100));
      } else {
        couponDiscount = Math.min(val, amountAfterAuto);
      }
    }
  }

  // Referral discount (5% on remaining balance)
  const referralDiscount = appliedReferral
    ? Math.round((amountAfterAuto - couponDiscount) * REFERRAL_DISCOUNT_RATE)
    : 0;

  const rawTotal = Math.max(amountAfterAuto - couponDiscount - referralDiscount, 0);
  // Server completes zero-value orders free; paid orders have a gateway minimum.
  const finalTotal = rawTotal === 0 ? 0 : Math.max(rawTotal, GATEWAY_MINIMUM_PAISE);
  const totalSavings = autoOfferDiscount + couponDiscount + referralDiscount;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);
    const code = couponInput.trim().toUpperCase();
    setAppliedCode(code || null);
  };

  const handleRemoveCoupon = () => {
    setAppliedCode(null);
    setCouponInput("");
  };

  const handleApplyReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referralInput.trim()) return;

    setReferralPending(true);
    setReferralMessage(null);
    setCheckoutError(null);

    try {
      const res = await validateReferralCodeAction(referralInput.trim());
      if (res.success && res.referrerSlug) {
        const code = res.referrerSlug;
        setAppliedReferral(code);
        setReferralMessage({ success: true, text: `Referral "${code}" applied — 5% off.` });
        document.cookie = `scriptly_referred_by=${encodeURIComponent(code)}; max-age=${30 * 24 * 60 * 60}; path=/; SameSite=Lax`;
        toast.success("Referral applied: 5% off this order.");
      } else {
        setReferralMessage({
          success: false,
          text: res.message || "That referral code isn't valid.",
        });
      }
    } catch {
      setReferralMessage({ success: false, text: "Couldn't check the referral code. Try again." });
    } finally {
      setReferralPending(false);
    }
  };

  const handleRemoveReferral = () => {
    setAppliedReferral(null);
    setReferralInput("");
    setReferralMessage(null);
    document.cookie = "scriptly_referred_by=; max-age=0; path=/;";
  };

  const handleClearCart = () => {
    if (window.confirm("Remove all items from your cart?")) {
      clearCart();
      toast.info("Cart cleared.");
    }
  };

  const handleCheckout = () => {
    setCheckoutError(null);
    startTransition(async () => {
      try {
        const productIds = cart.map((i) => i.id);
        const orderData = await createRazorpayOrderAction({
          productIds,
          couponCode: couponSuccess ? appliedCode || undefined : undefined,
          referredByCode: appliedReferral || undefined,
        });

        if (!orderData.success) {
          setCheckoutError("Checkout could not start. Please try again.");
          return;
        }

        // Zero-value orders are completed server-side; no gateway needed.
        if (orderData.isFreeCheckout && orderData.redirectUrl) {
          clearCart();
          router.push(orderData.redirectUrl);
          return;
        }

        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded || typeof window.Razorpay === "undefined") {
          setCheckoutError("The payment window failed to load. Check your connection and try again.");
          return;
        }

        const options = {
          key: orderData.key,
          amount: orderData.amount,
          currency: "INR",
          name: "ScriptlyStore",
          description: orderData.productName,
          order_id: orderData.razorpayOrderId,
          handler: async function (response: RazorpaySuccessResponse) {
            try {
              const verifyResult = await verifyPaymentAction({
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
              });

              if (verifyResult.success) {
                clearCart();
                router.push(`/purchase-success?orderId=${verifyResult.orderId}`);
              } else {
                setCheckoutError("We couldn't verify the payment. Contact support with your payment ID.");
              }
            } catch (err) {
              console.error("Payment verification err:", err);
              setCheckoutError("Payment verification failed. If you were charged, contact support with your payment ID.");
            }
          },
          prefill: {
            name: orderData.userName,
            email: orderData.userEmail,
          },
          theme: {
            color: "#C2410C",
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", function (response: RazorpayFailureResponse) {
          setCheckoutError(response.error?.description || "Payment was cancelled or declined. You have not been charged.");
        });
        rzp.open();
      } catch (err) {
        console.error("Cart checkout error:", err);
        setCheckoutError(err instanceof Error ? err.message : "Something went wrong starting checkout. Please try again.");
      }
    });
  };

  if (!mounted) {
    return <CartSkeleton />;
  }

  if (cartCount === 0) {
    return (
      <div className="max-w-xl border-t border-border pt-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Your cart is empty</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Discover verified SaaS boilerplates, AI prompt engines, browser extensions, and developer scripts ready to
          deploy.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link href="/featured">Explore featured</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/explore">Browse catalog</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/free">Free scripts</Link>
          </Button>
        </div>
      </div>
    );
  }

  const checkoutDisabled = isPending || couponLoading || referralPending;

  return (
    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
      {/* Line items */}
      <section aria-labelledby={`${fieldId}-items`} className="min-w-0 lg:col-span-7">
        <div className="flex items-center justify-between gap-4 pb-3">
          <h2 id={`${fieldId}-items`} className="text-sm text-muted-foreground">
            <span className="tabular font-medium text-foreground">{cartCount}</span>{" "}
            {cartCount === 1 ? "item" : "items"}
          </h2>
          <Button type="button" variant="ghost" size="sm" onClick={handleClearCart} className="hover:text-destructive">
            Clear cart
          </Button>
        </div>

        <ul className="divide-y divide-border border-y border-border">
          {cart.map((item) => {
            const hasMarkdown = !!item.originalPrice && item.originalPrice > item.price;
            return (
              <li key={item.id} className="flex items-start gap-3 py-5 sm:gap-4">
                <Link
                  href={`/products/${item.slug}`}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="relative aspect-[16/10] w-20 shrink-0 overflow-hidden rounded-lg bg-secondary sm:w-32"
                >
                  {item.thumbnail ? (
                    <Image src={item.thumbnail} alt="" fill sizes="128px" className="object-cover" />
                  ) : null}
                </Link>

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium leading-snug text-foreground sm:text-base">
                    <Link href={`/products/${item.slug}`} className="hover:text-primary transition-colors">
                      {item.title}
                    </Link>
                  </h3>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {item.category.replace(/-/g, " ")} · Commercial license
                  </p>
                  <div className="mt-2 flex items-baseline gap-2 sm:hidden">
                    <span className={cn("tabular text-sm font-medium", item.price <= 0 ? "text-success" : "text-foreground")}>
                      {item.price <= 0 ? "Free" : formatMoney(item.price)}
                    </span>
                    {hasMarkdown && (
                      <span className="tabular text-xs text-muted-foreground line-through">
                        {formatMoney(item.originalPrice!)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="hidden text-right sm:block">
                  <p className={cn("tabular text-base font-medium", item.price <= 0 ? "text-success" : "text-foreground")}>
                    {item.price <= 0 ? "Free" : formatMoney(item.price)}
                  </p>
                  {hasMarkdown && (
                    <p className="tabular text-xs text-muted-foreground line-through">
                      {formatMoney(item.originalPrice!)}
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    removeFromCart(item.id);
                    toast.info(`Removed "${item.title}".`);
                  }}
                  aria-label={`Remove ${item.title} from cart`}
                  className="-mr-1 shrink-0 hover:text-destructive"
                >
                  <X strokeWidth={1.75} />
                </Button>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden="true" />
            Continue browsing
          </Link>
          <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
            Need help or bulk licensing?
          </Link>
        </div>
      </section>

      {/* Order summary */}
      <aside aria-labelledby={`${fieldId}-summary`} className="lg:sticky lg:top-20 lg:col-span-5">
        <div className="rounded-2xl bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)] sm:p-6">
          <h2 id={`${fieldId}-summary`} className="text-base font-semibold text-foreground">
            Order summary
          </h2>

          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular text-foreground">{formatMoney(cartSubtotal)}</dd>
            </div>
            {autoOfferDiscount > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Bulk order savings (20%)</dt>
                <dd className="tabular text-success">−{formatMoney(autoOfferDiscount)}</dd>
              </div>
            )}
            {couponDiscount > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  Coupon <span className="font-mono text-xs">{appliedCode}</span>
                </dt>
                <dd className="tabular text-success">−{formatMoney(couponDiscount)}</dd>
              </div>
            )}
            {referralDiscount > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Referral savings (5%)</dt>
                <dd className="tabular text-success">−{formatMoney(referralDiscount)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
              <dt className="font-medium text-foreground">Total</dt>
              <dd className={cn("tabular text-2xl font-semibold tracking-tight", finalTotal === 0 ? "text-success" : "text-foreground")}>
                {finalTotal === 0 ? "Free" : formatMoney(finalTotal)}
              </dd>
            </div>
            {totalSavings > 0 && (
              <p className="text-right text-xs text-success">
                You save <span className="tabular">{formatMoney(totalSavings)}</span>
              </p>
            )}
          </dl>

          {/* Coupon */}
          <form onSubmit={handleApplyCoupon} className="mt-5 space-y-1.5 border-t border-border pt-5">
            <label htmlFor={`${fieldId}-coupon`} className="text-sm font-medium text-foreground">
              Coupon code
            </label>
            <div className="flex gap-2">
              <input
                id={`${fieldId}-coupon`}
                type="text"
                placeholder="SCRIPTLY20"
                autoComplete="off"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                disabled={!!appliedCode}
                aria-invalid={!!couponError}
                aria-describedby={`${fieldId}-coupon-msg`}
                className="h-10 min-w-0 flex-1 rounded-[10px] border border-input bg-background px-3 font-mono text-sm uppercase text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none aria-invalid:border-destructive disabled:opacity-60"
              />
              {appliedCode ? (
                <Button type="button" variant="outline" onClick={handleRemoveCoupon}>
                  Remove
                </Button>
              ) : (
                <Button type="submit" variant="secondary" disabled={!couponInput.trim()}>
                  Apply
                </Button>
              )}
            </div>
            <p id={`${fieldId}-coupon-msg`} aria-live="polite" className="min-h-0 text-xs">
              {couponLoading && appliedCode && <span className="text-muted-foreground">Checking code…</span>}
              {couponError && (
                <span className="inline-flex items-center gap-1 text-destructive">
                  <CircleAlert className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                  {couponError}
                </span>
              )}
              {couponSuccess && (
                <span className="inline-flex items-center gap-1 text-success">
                  <Check className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                  {couponSuccess}
                </span>
              )}
            </p>
          </form>

          {/* Referral */}
          <form onSubmit={handleApplyReferral} className="mt-4 space-y-1.5">
            <label htmlFor={`${fieldId}-referral`} className="text-sm font-medium text-foreground">
              Affiliate referral code <span className="font-normal text-muted-foreground">(5% off)</span>
            </label>
            <div className="flex gap-2">
              <input
                id={`${fieldId}-referral`}
                type="text"
                placeholder="Affiliate username"
                autoComplete="off"
                value={referralInput}
                onChange={(e) => setReferralInput(e.target.value)}
                disabled={!!appliedReferral || referralPending}
                aria-invalid={referralMessage ? !referralMessage.success : undefined}
                aria-describedby={`${fieldId}-referral-msg`}
                className="h-10 min-w-0 flex-1 rounded-[10px] border border-input bg-background px-3 font-mono text-sm text-foreground placeholder:font-sans placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none aria-invalid:border-destructive disabled:opacity-60"
              />
              {appliedReferral ? (
                <Button type="button" variant="outline" onClick={handleRemoveReferral}>
                  Remove
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={referralPending || !referralInput.trim()}
                  aria-busy={referralPending}
                >
                  {referralPending ? <Loader2 className="size-4 animate-spin" aria-label="Checking" /> : "Apply"}
                </Button>
              )}
            </div>
            <p id={`${fieldId}-referral-msg`} aria-live="polite" className="text-xs">
              {referralMessage && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    referralMessage.success ? "text-success" : "text-destructive"
                  )}
                >
                  {referralMessage.success ? (
                    <Check className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                  ) : (
                    <CircleAlert className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                  )}
                  {referralMessage.text}
                </span>
              )}
            </p>
          </form>

          {/* Checkout */}
          <div className="mt-5 space-y-3">
            <Button
              type="button"
              variant="accent"
              size="xl"
              onClick={handleCheckout}
              disabled={checkoutDisabled}
              aria-busy={isPending}
              className="w-full"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Opening checkout…
                </>
              ) : finalTotal === 0 ? (
                "Get items free"
              ) : (
                <>
                  <Lock className="size-4" strokeWidth={1.75} aria-hidden="true" />
                  Checkout · <span className="tabular">{formatMoney(finalTotal)}</span>
                </>
              )}
            </Button>

            {checkoutError && (
              <p role="alert" className="rounded-[10px] bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {checkoutError}
              </p>
            )}

            <p className="text-xs leading-relaxed text-muted-foreground">
              Secure payment via Razorpay: UPI, Google Pay, PhonePe, cards (Visa/Mastercard) and netbanking.
            </p>
          </div>

          <ul className="mt-5 space-y-2 border-t border-border pt-5 text-sm text-muted-foreground">
            {[
              "Instant ZIP archive download & license key receipt",
              "Direct developer support & free upcoming version updates",
              "Full commercial rights for unlimited client projects",
            ].map((line) => (
              <li key={line} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={1.75} aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
