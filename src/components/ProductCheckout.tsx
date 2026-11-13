"use client";

import { useState, useTransition, useEffect, useId } from "react";
import { createRazorpayOrderAction, verifyPaymentAction } from "@/lib/actions/orders";
import { loadRazorpayScript } from "@/lib/payments/razorpay-loader";
import { Check, ChevronDown, Download, Loader2, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/CartContext";
import { getProductEffectivePrice, formatMoney } from "@/lib/price-utils";
import { cn } from "@/lib/utils";

interface ProductCheckoutProps {
  product: {
    id: string;
    title: string;
    slug: string;
    price: number; // in paise
    category: string;
    thumbnail: string | null;
    isFree?: boolean;
    discountPercent?: number | null;
    promoStart?: Date | string | null;
    promoEnd?: Date | string | null;
  };
  hasPurchased: boolean;
  userLoggedIn: boolean;
  isFree?: boolean;
}

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureResponse {
  error?: { description?: string };
}

function readReferralCookie(): string | null {
  const match = document.cookie.match(/(?:^|; )scriptly_referred_by=([^;]*)/);
  return match && match[1] ? decodeURIComponent(match[1]) : null;
}

export default function ProductCheckout({
  product,
  hasPurchased,
  userLoggedIn,
  isFree = false,
}: ProductCheckoutProps) {
  const router = useRouter();
  const addonsId = useId();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addOnEditCopy, setAddOnEditCopy] = useState(false);
  const [addOnSetupDeploy, setAddOnSetupDeploy] = useState(false);
  const [isAddonsExpanded, setIsAddonsExpanded] = useState(false);
  const { addToCart, removeFromCart, isInCart } = useCart();

  const [appliedReferral, setAppliedReferral] = useState<string | null>(null);

  useEffect(() => {
    // Cookie is only readable after hydration.
    setAppliedReferral(readReferralCookie());
  }, []);

  const inCart = isInCart(product.id);

  const editCopyPrice = Math.round(product.price / 3);
  const setupDeployPrice = Math.round(product.price / 3);

  const promo = getProductEffectivePrice(product);
  const baseEffectivePrice = isFree ? 0 : promo.effectivePrice;

  const referralDiscount = appliedReferral && !isFree ? Math.round(baseEffectivePrice * 0.05) : 0;

  let totalDisplayPrice = baseEffectivePrice - referralDiscount;
  if (addOnEditCopy) totalDisplayPrice += editCopyPrice;
  if (addOnSetupDeploy) totalDisplayPrice += setupDeployPrice;

  if (hasPurchased) {
    return (
      <div className="space-y-2">
        <Button asChild size="xl" className="w-full">
          <a href={`/api/download/${product.id}`}>
            <Download className="size-4" strokeWidth={1.75} aria-hidden="true" />
            Download your files
          </a>
        </Button>
        <p className="text-center text-xs text-muted-foreground">You own this product. Updates stay in your library.</p>
      </div>
    );
  }

  const handleCheckout = () => {
    if (!userLoggedIn) {
      router.push(`/handler/sign-in?redirectTo=/products/${product.slug}`);
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const orderData = await createRazorpayOrderAction({
          productId: product.id,
          addOnEditCopy,
          addOnSetupDeploy,
          referredByCode: appliedReferral || undefined,
        });

        if (!orderData.success) {
          setError("Checkout could not start. Please try again.");
          return;
        }

        if (orderData.isFreeCheckout && orderData.redirectUrl) {
          router.push(orderData.redirectUrl);
          return;
        }

        // Lazy load Razorpay SDK only when the buyer commits.
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded || typeof window.Razorpay === "undefined") {
          setError("The payment window failed to load. Check your connection and try again.");
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
                router.push(`/purchase-success?orderId=${verifyResult.orderId}`);
              } else {
                setError("We couldn't verify the payment signature. Contact support with your payment ID.");
              }
            } catch (err) {
              console.error("Payment verification err:", err);
              setError("Payment verification failed. If you were charged, contact support with your payment ID.");
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
          setError(response.error?.description || "Payment was cancelled or failed. You have not been charged.");
        });
        rzp.open();
      } catch (err) {
        console.error("Checkout initialization error:", err);
        setError(err instanceof Error ? err.message : "Something went wrong starting checkout. Please try again.");
      }
    });
  };

  const handleCartToggle = () => {
    if (inCart) {
      removeFromCart(product.id);
    } else {
      addToCart({
        id: product.id,
        title: product.title,
        // Cart must carry the price the server will actually charge (promo-aware).
        price: baseEffectivePrice,
        originalPrice: product.price,
        slug: product.slug,
        thumbnail: product.thumbnail,
        category: product.category,
      });
    }
  };

  const addonsSelected = addOnEditCopy || addOnSetupDeploy;

  const addons = [
    {
      key: "copy",
      label: "Custom copy & branding",
      body: "Customize default text, colors, and components for your brand.",
      price: editCopyPrice,
      checked: addOnEditCopy,
      onChange: setAddOnEditCopy,
    },
    {
      key: "deploy",
      label: "Cloud deployment & setup",
      body: "Full production setup on Cloudflare, Vercel, or AWS.",
      price: setupDeployPrice,
      checked: addOnSetupDeploy,
      onChange: setAddOnSetupDeploy,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-stretch gap-2">
        <Button
          variant="accent"
          size="xl"
          onClick={handleCheckout}
          disabled={isPending}
          aria-busy={isPending}
          className="min-w-0 flex-1"
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Opening checkout…
            </>
          ) : totalDisplayPrice === 0 ? (
            "Get it free"
          ) : (
            <span className="truncate">
              Buy now · <span className="tabular">{formatMoney(totalDisplayPrice)}</span>
            </span>
          )}
        </Button>

        <Button
          type="button"
          variant={inCart ? "secondary" : "outline"}
          size="xl"
          onClick={handleCartToggle}
          aria-pressed={inCart}
          aria-label={inCart ? `Remove ${product.title} from cart` : `Add ${product.title} to cart`}
          className="shrink-0 px-4"
        >
          {inCart ? (
            <Check className="size-4" strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <ShoppingCart className="size-4" strokeWidth={1.75} aria-hidden="true" />
          )}
          <span className="hidden sm:inline">{inCart ? "In cart" : "Add to cart"}</span>
        </Button>
      </div>

      {appliedReferral && !isFree && (
        <p className="text-sm text-success">Referral applied: 5% off at checkout.</p>
      )}

      {error && (
        <p role="alert" className="rounded-[10px] bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Optional add-on services */}
      <div className="border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setIsAddonsExpanded((v) => !v)}
            aria-expanded={isAddonsExpanded}
            aria-controls={addonsId}
            className="flex w-full items-center justify-between gap-3 rounded-[10px] py-1.5 text-left text-sm text-foreground hover:text-primary transition-colors"
          >
            <span>
              <span className="font-medium">Add setup services</span>
              <span className="ml-2 text-muted-foreground">
                {addonsSelected ? "Selected" : "Optional"}
              </span>
            </span>
            <ChevronDown
              aria-hidden="true"
              strokeWidth={1.75}
              className={cn(
                "size-4 text-muted-foreground transition-transform duration-200",
                isAddonsExpanded && "rotate-180"
              )}
            />
          </button>

          {isAddonsExpanded && (
            <fieldset id={addonsId} className="mt-2 space-y-2">
              <legend className="sr-only">Optional add-on services</legend>
              {addons.map((addon) => (
                <label
                  key={addon.key}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-[10px] border p-3 transition-colors",
                    addon.checked ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={addon.checked}
                    onChange={(e) => addon.onChange(e.target.checked)}
                    className="mt-0.5 size-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{addon.label}</span>
                      <span className="tabular text-sm text-foreground">+{formatMoney(addon.price)}</span>
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{addon.body}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
      </div>
    </div>
  );
}
