"use client";

import { useState, useEffect, useId } from "react";
import { loadRazorpayScript } from "@/lib/payments/razorpay-loader";
import { createLinkRazorpayOrderAction, verifyLinkPaymentAction } from "@/lib/actions/payment-links";
import { CircleCheck, ExternalLink, ArrowRight, Loader2, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PaymentCardProps {
  title: string;
  price: number; // in INR or raw units
  priceInPaise: number;
  currency?: string;
  description?: string | null;
  redirectUrl: string;
  linkId?: string;
  slug?: string;
}

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureResponse {
  error?: { description?: string };
}

/** Only http(s) destinations are followed; anything else (e.g. `javascript:`) falls back home. */
function safeRedirect(url: string | undefined | null) {
  return url && /^(https?:\/\/|\/(?!\/))/i.test(url.trim()) ? url.trim() : "/";
}

function hostnameOf(url: string) {
  try {
    return new URL(url).hostname || url;
  } catch {
    return url;
  }
}

export default function PaymentCard({
  title,
  price,
  priceInPaise,
  currency = "INR",
  description,
  redirectUrl,
  linkId,
}: PaymentCardProps) {
  const fieldId = useId();
  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [redirectDestination, setRedirectDestination] = useState(() => safeRedirect(redirectUrl));

  const formattedPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(price);

  useEffect(() => {
    if (!isSuccess) return;
    if (countdown === 0) {
      window.location.href = redirectDestination;
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [isSuccess, countdown, redirectDestination]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payerEmail || !payerEmail.includes("@")) {
      setEmailError("Enter a valid email so we can send your receipt.");
      return;
    }
    setEmailError(null);

    setIsLoading(true);
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        throw new Error("The payment window failed to load. Check your connection and try again.");
      }

      // Create Razorpay order on server
      const order = await createLinkRazorpayOrderAction({
        linkId,
        title,
        priceInPaise,
        currency,
        payerEmail,
        payerName,
        payerPhone,
      });

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "ScriptlyStore",
        description: title.slice(0, 60),
        order_id: order.orderId,
        prefill: {
          name: payerName,
          email: payerEmail,
          contact: payerPhone,
        },
        theme: {
          color: "#C2410C",
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
            toast.info("Payment window closed. You have not been charged.");
          },
        },
        handler: async (response: RazorpaySuccessResponse) => {
          try {
            toast.loading("Verifying payment…", { id: "verify" });
            const verifyRes = await verifyLinkPaymentAction({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              linkId,
              redirectUrl,
              amount: order.amount,
              payerEmail,
              payerName,
              payerPhone,
            });

            toast.dismiss("verify");

            if (verifyRes.success) {
              setRedirectDestination(safeRedirect(verifyRes.redirectUrl));
              setIsSuccess(true);
            } else {
              toast.error("We couldn't verify the payment signature. Contact the seller with your payment ID.");
              setIsLoading(false);
            }
          } catch (err) {
            toast.dismiss("verify");
            toast.error(err instanceof Error ? err.message : "Payment verification failed.");
            setIsLoading(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (errResponse: RazorpayFailureResponse) => {
        setIsLoading(false);
        toast.error(errResponse.error?.description || "Payment failed. Please try again.");
      });
      rzp.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start the payment.");
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div role="status" className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8">
        <CircleCheck className="size-7 text-success" strokeWidth={1.75} aria-hidden="true" />
        <h1 className="mt-4 font-display text-3xl text-foreground">Payment received</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Your payment of <span className="tabular font-medium text-foreground">{formattedPrice}</span> for{" "}
          <span className="font-medium text-foreground">{title}</span> was received.
        </p>
        <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
          Redirecting to {hostnameOf(redirectDestination)} in{" "}
          <span className="tabular font-medium text-foreground">{countdown}s</span>
        </p>
        <Button asChild size="lg" className="mt-4 w-full">
          <a href={redirectDestination}>
            Continue now
            <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)]">
      <div className="border-b border-border p-6">
        <p className="text-sm text-muted-foreground">Payment for</p>
        <h1 className="mt-1 line-clamp-2 font-display text-2xl leading-tight text-foreground md:text-3xl">{title}</h1>
        {description && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
        <div className="mt-5 flex items-baseline justify-between gap-4">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="tabular text-3xl font-semibold tracking-tight text-foreground">{formattedPrice}</span>
        </div>
      </div>

      <form onSubmit={handlePay} className="space-y-4 p-6" noValidate>
        <div className="space-y-1.5">
          <label htmlFor={`${fieldId}-email`} className="text-sm font-medium text-foreground">
            Email <span className="text-destructive" aria-hidden="true">*</span>
          </label>
          <Input
            id={`${fieldId}-email`}
            type="email"
            required
            autoComplete="email"
            value={payerEmail}
            onChange={(e) => {
              setPayerEmail(e.target.value);
              if (emailError) setEmailError(null);
            }}
            placeholder="you@example.com"
            aria-invalid={!!emailError}
            aria-describedby={`${fieldId}-email-hint`}
            className="h-11"
          />
          <p id={`${fieldId}-email-hint`} className={emailError ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
            {emailError || "Payment receipt & confirmation will be sent here."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor={`${fieldId}-name`} className="text-sm font-medium text-foreground">
              Name <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              id={`${fieldId}-name`}
              type="text"
              autoComplete="name"
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${fieldId}-phone`} className="text-sm font-medium text-foreground">
              Phone <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              id={`${fieldId}-phone`}
              type="tel"
              autoComplete="tel"
              value={payerPhone}
              onChange={(e) => setPayerPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="h-11"
            />
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ExternalLink className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          <span className="truncate">
            After payment you&apos;ll return to <span className="font-medium text-foreground">{hostnameOf(redirectUrl)}</span>
          </span>
        </p>

        <Button type="submit" variant="accent" size="xl" disabled={isLoading} aria-busy={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Processing…
            </>
          ) : (
            <>
              <Lock className="size-4" strokeWidth={1.75} aria-hidden="true" />
              Pay <span className="tabular">{formattedPrice}</span>
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">Razorpay verified · Instant redirection</p>
      </form>
    </div>
  );
}
