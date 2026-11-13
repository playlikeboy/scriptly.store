import { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getPublicPaymentLinkAction } from "@/lib/actions/payment-links";
import PaymentCard from "@/components/pay/PaymentCard";
import PayShell from "@/app/pay/PayShell";
import Link from "next/link";
import { PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Shared between generateMetadata and the page so the link is fetched once per request.
const getLink = cache((slug: string) => getPublicPaymentLinkAction(slug));

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const link = await getLink(slug);

  if (!link) {
    return {
      title: "Payment Link Not Found | ScriptlyStore",
    };
  }

  return {
    title: `Pay for ${link.title} | ScriptlyStore Secure Checkout`,
    description: link.description || `Complete secure payment for ${link.title} powered by ScriptlyStore.`,
  };
}

export default async function StoredPaymentLinkPage({ params }: PageProps) {
  const { slug } = await params;
  const link = await getLink(slug);

  if (!link) {
    notFound();
  }

  if (!link.active) {
    return (
      <PayShell>
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8">
          <PauseCircle className="size-6 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
          <h1 className="mt-4 font-display text-2xl text-foreground">This payment link is paused</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            This payment link is currently paused or inactive. Please contact the seller for an updated link.
          </p>
          <Button asChild variant="outline" className="mt-6 w-full">
            <Link href="/">Return to marketplace</Link>
          </Button>
        </div>
      </PayShell>
    );
  }

  const priceInINR = link.price / 100;

  return (
    <PayShell>
      <PaymentCard
        title={link.title}
        price={priceInINR}
        priceInPaise={link.price}
        currency={link.currency}
        description={link.description}
        redirectUrl={link.redirectUrl}
        linkId={link.id}
        slug={link.slug}
      />
    </PayShell>
  );
}
