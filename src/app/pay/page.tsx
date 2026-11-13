import { Metadata } from "next";
import PaymentCard from "@/components/pay/PaymentCard";
import KeyUnlockCard from "@/components/pay/KeyUnlockCard";
import PayShell from "@/app/pay/PayShell";
import Link from "next/link";
import { ArrowRight, CircleAlert, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { decodePaymentLinkPayload } from "@/lib/payments/link-encoder";
import { logLinkActivityAction } from "@/lib/actions/payment-links";

export const metadata: Metadata = {
  title: "Complete Payment | ScriptlyStore Secure Checkout",
  description: "Secure, verified checkout powered by Razorpay and ScriptlyStore.",
};

interface SearchParamsProps {
  searchParams: Promise<{
    data?: string;
    d?: string;
    token?: string;
    title?: string;
    name?: string;
    price?: string;
    prize?: string;
    redirect?: string;
    redirectUrl?: string;
    desc?: string;
    description?: string;
    currency?: string;
    key?: string;
    k?: string;
    secret?: string;
    pass?: string;
    password?: string;
  }>;
}

export default async function DynamicPaymentPage({ searchParams }: SearchParamsProps) {
  const resolvedParams = await searchParams;
  const encodedToken = resolvedParams.data || resolvedParams.d || resolvedParams.token;
  const userKey = resolvedParams.key || resolvedParams.k || resolvedParams.secret || resolvedParams.pass || resolvedParams.password;

  let title: string | undefined = resolvedParams.title || resolvedParams.name;
  let rawPrice: string | undefined = resolvedParams.price || resolvedParams.prize;
  let redirectUrl: string | undefined = resolvedParams.redirectUrl || resolvedParams.redirect;
  let description: string | null = resolvedParams.description || resolvedParams.desc || null;
  let currency = resolvedParams.currency || "INR";
  let tamperError: string | null = null;
  let isVerifiedSigned = false;
  let requiresKey = false;

  // Process Encoded Base64 / AES Key Payload
  if (encodedToken) {
    const decoded = decodePaymentLinkPayload(encodedToken, userKey);
    if (!decoded.success || !decoded.data) {
      if (decoded.requiresKey) {
        requiresKey = true;
        tamperError = decoded.error || "A decryption key is required to view this payment.";
      } else {
        tamperError = decoded.error || "The payment link signature is invalid or has been modified.";
      }
    } else {
      title = decoded.data.title;
      rawPrice = String(decoded.data.price);
      redirectUrl = decoded.data.redirectUrl;
      description = decoded.data.description || null;
      currency = decoded.data.currency || "INR";
      isVerifiedSigned = Boolean(decoded.data.sig || decoded.isEncrypted);
    }
  }

  const numPrice = rawPrice ? parseFloat(rawPrice) : 0;
  const priceInPaise = Math.round(numPrice * 100);

  const isValid = Boolean(!tamperError && title && numPrice > 0 && redirectUrl);

  // Log View Activity for Dynamic /pay checkout
  if (isValid && title) {
    logLinkActivityAction({
      linkId: null, // dynamic on-the-fly checkout
      type: "view",
      amount: priceInPaise,
      metadata: JSON.stringify({ title, redirectUrl, signed: isVerifiedSigned }),
    }).catch(() => {});
  }

  return (
    <PayShell verified={isVerifiedSigned && isValid}>
      {requiresKey && encodedToken ? (
        // Keyed on the attempted key so a wrong key remounts with a fresh error/loading state.
        <KeyUnlockCard key={userKey ?? "no-key"} token={encodedToken} initialError={userKey ? tamperError : null} />
      ) : tamperError ? (
        <div role="alert" className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8">
          <ShieldAlert className="size-6 text-destructive" strokeWidth={1.75} aria-hidden="true" />
          <h1 className="mt-4 font-display text-2xl text-foreground">This link can&apos;t be used</h1>
          <p className="mt-2 text-sm font-medium text-destructive">{tamperError}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            For security reasons, payments cannot be processed through modified or corrupted links. Please contact the
            seller for a valid link.
          </p>
          <Button asChild variant="outline" className="mt-6 w-full">
            <Link href="/">Return to marketplace</Link>
          </Button>
        </div>
      ) : isValid ? (
        <PaymentCard
          title={title!}
          price={numPrice}
          priceInPaise={priceInPaise}
          currency={currency}
          description={description}
          redirectUrl={redirectUrl!}
        />
      ) : (
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8">
          <CircleAlert className="size-6 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
          <h1 className="mt-4 font-display text-2xl text-foreground">Incomplete payment link</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            To create an instant secure payment link, provide an encoded{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-foreground">data</code> token in
            the URL.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-[10px] bg-secondary p-3 font-mono text-xs text-muted-foreground">
            /pay?data=eyJ0aXRsZSI6IlNlcnZpY2UiLCJwcmljZSI6NDk5...
          </pre>
          <div className="mt-6 flex flex-col gap-2">
            <Button asChild>
              <Link href="/docs/api/payment-links">
                Read the payment link docs
                <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/">Return to marketplace</Link>
            </Button>
          </div>
        </div>
      )}
    </PayShell>
  );
}
