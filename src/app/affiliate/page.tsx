export const dynamic = "force-dynamic";

import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { affiliateProfiles } from "@/db/schema";
import { getOrCreateDbUser } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/creator/console-ui";
import AffiliateOnboardingClient from "./AffiliateOnboardingClient";
import AffiliateEarningsEstimator from "./AffiliateEarningsEstimator";

export const metadata: Metadata = {
  title: "Affiliate Partner Program | ScriptlyStore",
  description:
    "Join our affiliate program and earn high recurring commission splits by promoting ready-to-use developer scripts, templates, and tech ebooks.",
};

const BENEFITS = [
  {
    title: "Commission set per product",
    body: "Creators choose a rate between 5% and 50% for each product, so you always know what a referral pays before you share it.",
  },
  {
    title: "Products developers want",
    body: "Promote scripts, SaaS starters, templates and technical ebooks to an audience that already builds software.",
  },
  {
    title: "Live tracking",
    body: "See referral clicks, conversion rate and accrued commission in your affiliate dashboard.",
  },
  {
    title: "Automated bank settlement",
    body: "With a linked Razorpay account, commission splits are routed to your bank automatically.",
  },
];

const STEPS = [
  "Apply with a referral handle and the channels where you’ll share.",
  "Once approved, copy links for any product from your dashboard.",
  "When someone buys through your link, the commission is credited to you.",
];

function StatusShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 md:py-24">
      <div className="rounded-2xl border border-border bg-card">{children}</div>
    </div>
  );
}

export default async function AffiliatePortalPage() {
  const user = await getOrCreateDbUser();

  const profile = user
    ? await db.query.affiliateProfiles.findFirst({
        columns: { status: true },
        where: eq(affiliateProfiles.id, user.id),
      })
    : null;

  if (profile?.status === "approved") {
    redirect("/affiliate/dashboard");
  }

  if (profile?.status === "pending") {
    return (
      <StatusShell>
        <div className="space-y-4 p-6 sm:p-8">
          <StatusPill>Under review</StatusPill>
          <h1 className="font-display text-3xl leading-tight tracking-[-0.02em] text-foreground">
            We’re reviewing your application
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Our team is looking at your promotional channels. You’ll get an email as soon as your profile is approved.
          </p>
          <Button asChild variant="outline">
            <Link href="/explore">Back to the catalogue</Link>
          </Button>
        </div>
      </StatusShell>
    );
  }

  if (profile?.status === "rejected") {
    return (
      <StatusShell>
        <div className="space-y-3 border-b border-border p-6 sm:p-8">
          <StatusPill tone="destructive">Not approved</StatusPill>
          <h1 className="font-display text-3xl leading-tight tracking-[-0.02em] text-foreground">
            Your application wasn’t approved
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This usually happens when channels don’t focus on developer content. Update your details below to apply
            again.
          </p>
        </div>
        <AffiliateOnboardingClient initialSlug={user?.affiliateSlug || ""} isLoggedIn mode="reapply" />
      </StatusShell>
    );
  }

  return (
    <div className="bg-background text-foreground">
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-12 lg:gap-16 lg:px-8">
          <div className="lg:col-span-6">
            <h1 className="font-display text-5xl leading-[1.04] tracking-[-0.03em] text-balance text-foreground sm:text-6xl">
              Partner with Scriptly. Earn on every referral.
            </h1>
            <p className="mt-6 max-w-[52ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
              Promote developer scripts, SaaS templates and creator ebooks. Pick your own handle, track clicks as they
              happen, and earn commission on every sale you send.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="xl" className="w-full sm:w-auto">
                <a href="#apply">Apply now</a>
              </Button>
              <Button asChild variant="outline" size="xl" className="w-full sm:w-auto">
                <Link href="/explore">See what you’d promote</Link>
              </Button>
            </div>

            <ol className="mt-12 space-y-4 border-t border-border pt-6">
              {STEPS.map((step, i) => (
                <li key={step} className="grid grid-cols-[2rem_1fr] gap-3 text-sm leading-relaxed">
                  <span aria-hidden className="tabular font-display text-xl leading-none text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="lg:col-span-6">
            <h2 className="mb-4 text-sm font-medium text-foreground">Estimate your earnings</h2>
            <AffiliateEarningsEstimator />
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <h2 className="max-w-[40rem] font-display text-3xl leading-tight tracking-[-0.02em] text-balance text-foreground md:text-4xl">
            Why developers partner with us
          </h2>
          <ul className="mt-10 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <li key={b.title} className="border-t border-foreground pt-5">
                <h3 className="text-base font-medium text-foreground">{b.title}</h3>
                <p className="mt-2 max-w-[56ch] text-sm leading-relaxed text-muted-foreground">{b.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-12 max-w-[68ch] text-sm leading-relaxed text-muted-foreground">
            Every Scriptly account can apply. Share products in your newsletter, on X or on your developer blog; approved
            partners’ bank settlements run automatically.
          </p>
        </div>
      </section>

      <section id="apply" className="scroll-mt-20">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 md:py-24">
          <h2 className="font-display text-3xl leading-tight tracking-[-0.02em] text-foreground md:text-4xl">
            Apply for affiliate access
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Choose the handle that appears in your referral links. We review every application.
          </p>
          <div className="mt-8 rounded-2xl border border-border bg-card">
            <AffiliateOnboardingClient initialSlug={user?.affiliateSlug || ""} isLoggedIn={Boolean(user)} />
          </div>
        </div>
      </section>
    </div>
  );
}
