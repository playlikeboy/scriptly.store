"use client";

import { useCart } from "@/components/CartContext";
import { useState, useTransition, useEffect } from "react";
import useSWR from "swr";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createRazorpayOrderAction, verifyPaymentAction } from "@/lib/actions/orders";
import { loadRazorpayScript } from "@/lib/payments/razorpay-loader";
import { validateReferralCodeAction } from "@/lib/actions/affiliates";
import { formatUSD } from "@/lib/price-utils";
import {
  Trash2,
  CreditCard,
  ShoppingBag,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Percent,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Lock,
  Tag,
  Gift,
} from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CartClient() {
  const router = useRouter();
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
        text: `Referral "${decodedVal}" active — 5% extra discount applied.`,
      });
    }
  }, []);

  // Compute Automatic Bulk Offer: 20% off for carts >= $60.00 (6000 cents)
  const autoOfferDiscount = cartSubtotal >= 6000 ? Math.round(cartSubtotal * 0.2) : 0;
  const amountAfterAuto = cartSubtotal - autoOfferDiscount;

  // Validate coupon using SWR
  const swrKey = appliedCode
    ? `/api/coupons/validate?code=${encodeURIComponent(appliedCode)}&amount=${amountAfterAuto}`
    : null;

  const { data: couponData, error: swrError, isLoading: couponLoading } = useSWR<any>(
    swrKey,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  let couponDiscount = 0;
  let couponError: string | null = null;
  let couponSuccess: string | null = null;

  if (appliedCode) {
    if (couponLoading) {
      // Validating...
    } else if (swrError || (couponData && !couponData.success)) {
      couponError = couponData?.message || "Invalid coupon code.";
    } else if (couponData && couponData.success) {
      couponSuccess = `Coupon "${couponData.coupon.code}" applied!`;
      const val = couponData.coupon.discountValue;
      if (couponData.coupon.discountType === "percentage") {
        couponDiscount = Math.round(amountAfterAuto * (val / 100));
      } else {
        couponDiscount = Math.min(val, amountAfterAuto);
      }
    }
  }

  // Calculate Referral Discount (5% on remaining balance)
  const referralDiscount = appliedReferral
    ? Math.round((amountAfterAuto - couponDiscount) * 0.05)
    : 0;

  const finalTotal = Math.max(amountAfterAuto - couponDiscount - referralDiscount, 100); // minimum $1.00 for payment processor
  const totalSavings = autoOfferDiscount + couponDiscount + referralDiscount;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);
    if (couponInput.trim()) {
      setAppliedCode(couponInput.trim().toUpperCase());
      toast.info(`Validating coupon "${couponInput.trim().toUpperCase()}"...`);
    } else {
      setAppliedCode(null);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCode(null);
    setCouponInput("");
    toast.info("Coupon removed.");
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
        setReferralMessage({
          success: true,
          text: `Referral code "${code}" applied — 5% savings added!`,
        });
        document.cookie = `scriptly_referred_by=${encodeURIComponent(code)}; max-age=${30 * 24 * 60 * 60}; path=/; SameSite=Lax`;
        toast.success(`Referral applied: 5% discount on this order.`);
      } else {
        setReferralMessage({
          success: false,
          text: res.message || "Invalid affiliate referral code.",
        });
        toast.error("Invalid affiliate referral code.");
      }
    } catch {
      setReferralMessage({
        success: false,
        text: "Failed to validate referral code.",
      });
    } finally {
      setReferralPending(false);
    }
  };

  const handleRemoveReferral = () => {
    setAppliedReferral(null);
    setReferralInput("");
    setReferralMessage(null);
    document.cookie = "scriptly_referred_by=; max-age=0; path=/;";
    toast.info("Referral code removed.");
  };

  const handleClearCart = () => {
    if (window.confirm("Are you sure you want to empty your shopping cart?")) {
      clearCart();
      toast.info("Cart cleared.");
    }
  };

  const handleCheckout = async () => {
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
          setCheckoutError("Failed to initialize order. Please try again.");
          return;
        }

        // Dynamically load Razorpay SDK
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded || typeof window.Razorpay === "undefined") {
          setCheckoutError("Payment gateway SDK failed to load. Please check your network connection.");
          return;
        }

        const options = {
          key: orderData.key,
          amount: orderData.amount,
          currency: "INR",
          name: "ScriptlyStore",
          description: orderData.productName,
          order_id: orderData.razorpayOrderId,
          handler: async function (response: any) {
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
                setCheckoutError("Payment verification failed. Please contact support.");
              }
            } catch (err: any) {
              console.error("Payment verification err:", err);
              setCheckoutError("Payment verification failed. Please try again.");
            }
          },
          prefill: {
            name: orderData.userName,
            email: orderData.userEmail,
          },
          theme: {
            color: "#0F172A",
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", function (response: any) {
          setCheckoutError(response.error.description || "Payment was cancelled or declined.");
        });
        rzp.open();
      } catch (err: any) {
        console.error("Cart checkout error:", err);
        setCheckoutError(err.message || "An unexpected error occurred during checkout.");
      }
    });
  };

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-mono">Loading cart items...</p>
      </div>
    );
  }

  // Empty Cart View
  if (cartCount === 0) {
    return (
      <div className="text-center py-16 sm:py-24 space-y-8 max-w-xl mx-auto rounded-3xl border border-dashed border-border/60 bg-card/25 p-8 sm:p-12 animate-in fade-in duration-300">
        <div className="relative w-20 h-20 mx-auto">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center border border-primary/20 shadow-lg">
            <ShoppingBag className="w-9 h-9" />
          </div>
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black shadow">
            0
          </span>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Your cart is empty
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Discover verified SaaS boilerplates, AI prompt engines, browser extensions, and developer scripts ready to deploy.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            asChild
            size="default"
            className="rounded-2xl font-black text-xs uppercase tracking-wider bg-[#58CC02] hover:bg-[#58CC02]/90 text-white shadow-[0_3px_0_#46A302] active:translate-y-px active:shadow-none transition-all px-6 h-11"
          >
            <Link href="/featured">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              <span>Explore Featured</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="default"
            className="rounded-2xl font-bold text-xs border-border/60 hover:bg-muted/40 h-11 px-5"
          >
            <Link href="/explore">
              <span>Browse Catalog</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="ghost"
            size="default"
            className="rounded-2xl font-bold text-xs text-muted-foreground hover:text-foreground h-11 px-4"
          >
            <Link href="/free">
              <Gift className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
              <span>Free Scripts</span>
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
      {/* Left Column: Cart Items List */}
      <div className="lg:col-span-7 space-y-6">
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
              Review Items
            </h2>
            <Badge variant="secondary" className="rounded-full text-xs font-mono font-bold px-2.5 py-0.5">
              {cartCount} {cartCount === 1 ? "item" : "items"}
            </Badge>
          </div>

          <button
            type="button"
            onClick={handleClearCart}
            className="text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Cart</span>
          </button>
        </div>

        {/* Product Cards List */}
        <div className="space-y-4">
          {cart.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-md p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:border-primary/40 transition-all duration-200 shadow-sm"
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                {/* Product Thumbnail */}
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-muted border border-border/40 shrink-0 relative">
                  {item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt={item.title}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-mono text-muted-foreground uppercase">
                      {item.category}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0 space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-wider">
                      {item.category.replace(/-/g, " ")}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm sm:text-base text-foreground truncate">
                    <Link
                      href={`/products/${item.slug}`}
                      className="hover:text-primary transition-colors"
                    >
                      {item.title}
                    </Link>
                  </h3>

                  <div className="flex items-center gap-3 pt-0.5">
                    <div className="flex items-baseline gap-1.5 font-mono">
                      <span className="text-base font-black text-foreground">
                        {formatUSD(item.price)}
                      </span>
                      {item.originalPrice && item.originalPrice > item.price && (
                        <span className="text-xs text-muted-foreground line-through">
                          {formatUSD(item.originalPrice)}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-emerald-500 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Commercial License
                    </span>
                  </div>
                </div>
              </div>

              {/* Remove Action */}
              <button
                type="button"
                onClick={() => {
                  removeFromCart(item.id);
                  toast.info(`Removed "${item.title}" from cart.`);
                }}
                className="self-end sm:self-center p-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
                title="Remove item"
                aria-label={`Remove ${item.title}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Back Link */}
        <div className="pt-2 flex items-center justify-between">
          <Button
            asChild
            variant="link"
            className="text-muted-foreground hover:text-foreground text-xs p-0 font-medium"
          >
            <Link href="/explore">
              ← Continue browsing marketplace
            </Link>
          </Button>

          <Link
            href="/contact"
            className="text-[11px] text-muted-foreground hover:underline"
          >
            Need help or bulk enterprise licensing?
          </Link>
        </div>
      </div>

      {/* Right Column: Sticky Order Summary */}
      <div className="lg:col-span-5">
        <div className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 sm:p-7 space-y-6 shadow-xl sticky top-20 relative overflow-hidden">
          {/* Accent top gradient line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-emerald-500 to-sky-500 opacity-90" />

          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <h3 className="text-base font-black tracking-tight text-foreground">
              Order Summary
            </h3>
            <span className="text-xs font-mono text-muted-foreground font-semibold">
              {cartCount} {cartCount === 1 ? "Item" : "Items"}
            </span>
          </div>

          {/* Pricing Ledger */}
          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex justify-between items-center text-muted-foreground font-medium">
              <span>Items Subtotal</span>
              <span className="text-foreground font-mono font-bold">
                {formatUSD(cartSubtotal)}
              </span>
            </div>

            {/* Auto Bulk 20% discount */}
            {autoOfferDiscount > 0 && (
              <div className="flex justify-between items-center text-emerald-500 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Bulk Order Savings (20% Off)</span>
                </span>
                <span className="font-mono font-bold">
                  -{formatUSD(autoOfferDiscount)}
                </span>
              </div>
            )}

            {/* Coupon discount */}
            {couponDiscount > 0 && (
              <div className="flex justify-between items-center text-emerald-500 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Coupon ({appliedCode})</span>
                </span>
                <span className="font-mono font-bold">
                  -{formatUSD(couponDiscount)}
                </span>
              </div>
            )}

            {/* Referral discount */}
            {referralDiscount > 0 && (
              <div className="flex justify-between items-center text-emerald-500 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5" />
                  <span>Referral Savings (5%)</span>
                </span>
                <span className="font-mono font-bold">
                  -{formatUSD(referralDiscount)}
                </span>
              </div>
            )}

            {/* Total Savings Highlight Pill */}
            {totalSavings > 0 && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-between">
                <span>Total Savings Applied:</span>
                <span className="font-mono font-black">{formatUSD(totalSavings)} 🎉</span>
              </div>
            )}

            {/* Final Total Row */}
            <div className="border-t border-border/40 pt-4 flex justify-between items-baseline">
              <span className="text-base font-black text-foreground">
                Total Due
              </span>
              <div className="text-right">
                <span className="text-3xl font-black text-foreground font-mono">
                  {formatUSD(finalTotal)}
                </span>
                <span className="text-[10px] text-muted-foreground block font-mono font-semibold uppercase mt-0.5">
                  USD · One-Time
                </span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
              🔒 Billed securely via Razorpay at live bank exchange rate with instantaneous code delivery.
            </p>
          </div>

          {/* Coupon Code Accordion / Input Form */}
          <form
            onSubmit={handleApplyCoupon}
            className="space-y-2 pt-4 border-t border-border/40 text-xs"
          >
            <div className="flex items-center justify-between">
              <label className="font-bold text-foreground flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-primary" />
                <span>Have a Coupon Code?</span>
              </label>
              {appliedCode && (
                <span className="text-[10px] font-mono text-emerald-500 font-bold uppercase">
                  Applied
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. SCRIPTLY20"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                disabled={!!appliedCode}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-xs uppercase font-mono tracking-wider focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              {appliedCode ? (
                <Button
                  type="button"
                  onClick={handleRemoveCoupon}
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-bold h-10 border-border/60 hover:text-destructive"
                >
                  Remove
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="sm"
                  className="rounded-xl text-xs font-bold h-10 px-4 bg-secondary text-foreground hover:bg-secondary/80 border border-border/60 shadow-[0_2px_0_rgba(0,0,0,0.1)] active:translate-y-px active:shadow-none"
                >
                  Apply
                </Button>
              )}
            </div>

            {couponError && (
              <p className="text-[11px] text-destructive flex items-center gap-1 font-medium pt-0.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{couponError}</span>
              </p>
            )}
            {couponSuccess && (
              <p className="text-[11px] text-emerald-500 flex items-center gap-1 font-bold pt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{couponSuccess}</span>
              </p>
            )}
          </form>

          {/* Referral Code Accordion / Input Form */}
          <form
            onSubmit={handleApplyReferral}
            className="space-y-2 pt-3 border-t border-border/40 text-xs"
          >
            <div className="flex items-center justify-between">
              <label className="font-bold text-foreground flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-primary" />
                <span>Affiliate Referral Code (5% Off)</span>
              </label>
              {appliedReferral && (
                <span className="text-[10px] font-mono text-emerald-500 font-bold uppercase">
                  Active
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="AFFILIATE USERNAME"
                value={referralInput}
                onChange={(e) => setReferralInput(e.target.value)}
                disabled={!!appliedReferral || referralPending}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-xs uppercase font-mono tracking-wider focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              {appliedReferral ? (
                <Button
                  type="button"
                  onClick={handleRemoveReferral}
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-bold h-10 border-border/60 hover:text-destructive"
                >
                  Remove
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="sm"
                  disabled={referralPending}
                  className="rounded-xl text-xs font-bold h-10 px-4 bg-secondary text-foreground hover:bg-secondary/80 border border-border/60 shadow-[0_2px_0_rgba(0,0,0,0.1)] active:translate-y-px active:shadow-none"
                >
                  {referralPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Apply"
                  )}
                </Button>
              )}
            </div>

            {referralMessage && (
              <p
                className={`text-[11px] font-medium flex items-center gap-1 pt-0.5 ${
                  referralMessage.success ? "text-emerald-500" : "text-destructive"
                }`}
              >
                {referralMessage.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
                <span>{referralMessage.text}</span>
              </p>
            )}
          </form>

          {/* Primary Checkout CTA Button */}
          <div className="pt-2 space-y-4">
            <Button
              onClick={handleCheckout}
              disabled={isPending}
              className="w-full h-13 text-xs sm:text-sm font-black uppercase tracking-wider bg-[#58CC02] hover:bg-[#58CC02]/90 text-white rounded-2xl shadow-[0_4px_0_#46A302] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Preparing Secure Checkout...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Checkout {formatUSD(finalTotal)} — Instant Access</span>
                </>
              )}
            </Button>

            {checkoutError && (
              <div className="p-3 rounded-2xl text-xs text-destructive bg-destructive/10 border border-destructive/20 text-center flex items-center justify-center gap-1.5 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Payment Method Badges & Guarantees */}
            <div className="pt-2 text-center space-y-3">
              <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-bold text-muted-foreground font-mono">
                <span className="px-2 py-0.5 rounded-md border border-border/40 bg-muted/20">UPI</span>
                <span className="px-2 py-0.5 rounded-md border border-border/40 bg-muted/20">Google Pay</span>
                <span className="px-2 py-0.5 rounded-md border border-border/40 bg-muted/20">PhonePe</span>
                <span className="px-2 py-0.5 rounded-md border border-border/40 bg-muted/20">Cards (Visa/MC)</span>
                <span className="px-2 py-0.5 rounded-md border border-border/40 bg-muted/20">NetBanking</span>
              </div>

              <div className="space-y-1 text-[11px] text-muted-foreground text-left pt-2 border-t border-border/30">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Instant ZIP archive download & license key receipt</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Direct developer support & free upcoming version updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Full commercial rights for unlimited client projects</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
