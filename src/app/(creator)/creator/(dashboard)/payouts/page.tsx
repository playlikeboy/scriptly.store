export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOrCreateDbUser } from "@/lib/auth-utils";
import PayoutSettingsEditor from "@/components/PayoutSettingsEditor";
import { PageHeader, StatusPill } from "@/components/creator/console-ui";

export const metadata: Metadata = {
  title: "Bank & Payouts | Creator Console",
  description: "Configure bank split details via Razorpay Route nodes.",
};

export default async function CreatorPayoutsPage() {
  const user = await getOrCreateDbUser();
  if (!user) {
    redirect("/handler/sign-in?redirectTo=/creator/payouts");
  }

  const hasBankDetails = Boolean(user.bankAccountNumber && user.bankIfsc);
  const isRouteActive = Boolean(user.razorpayAccountId?.startsWith("acc_"));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Bank & payouts"
        description="Link your bank account to automate checkout splits: 95% to you, 5% to the platform."
      />

      <div className="max-w-xl space-y-6">
        <dl className="divide-y divide-border rounded-2xl border border-border bg-card text-sm">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              {isRouteActive ? (
                <StatusPill tone="success">Automated splits active</StatusPill>
              ) : hasBankDetails ? (
                <StatusPill>Route setup in progress</StatusPill>
              ) : (
                <StatusPill tone="destructive">Bank details needed</StatusPill>
              )}
            </dd>
          </div>
          {isRouteActive ? (
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
              <dt className="text-muted-foreground">Razorpay account</dt>
              <dd className="min-w-0 truncate font-mono text-xs text-foreground">{user.razorpayAccountId}</dd>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
            <dt className="text-muted-foreground">Your share</dt>
            <dd className="tabular text-right text-foreground">95% direct · 95% minus commission on affiliate sales</dd>
          </div>
        </dl>

        <PayoutSettingsEditor
          initialBankName={user.bankName}
          initialBankAccountName={user.bankAccountName}
          initialBankAccountNumber={user.bankAccountNumber}
          initialBankIfsc={user.bankIfsc}
        />
      </div>
    </div>
  );
}
