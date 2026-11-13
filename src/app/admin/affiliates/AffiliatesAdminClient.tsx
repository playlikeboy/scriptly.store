"use client";

import { useState, useTransition } from "react";
import { Check, CheckCircle2, Loader2, UserPlus, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { updateAffiliateStatusAction, payoutAffiliateCommissionAction } from "@/lib/actions/affiliates";
import { Button } from "@/components/ui/button";
import { AdminEmptyState } from "@/app/admin/_components/admin-ui";
import { formatMoney } from "@/lib/price-utils";

interface AffiliateProfile {
  id: string;
  status: string;
  channels: string | null;
  createdAt: string;
  userName: string | null;
  userEmail: string;
  affiliateSlug: string | null;
}

interface PendingCommission {
  id: string;
  amount: number;
  percent: number;
  createdAt: string;
  affiliateName: string | null;
  affiliateEmail: string;
  orderId: string;
  productTitle: string;
}

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export default function AffiliatesAdminClient({
  pendingProfiles,
  pendingCommissions,
}: {
  pendingProfiles: AffiliateProfile[];
  pendingCommissions: PendingCommission[];
}) {
  const [, startTransition] = useTransition();
  const [processing, setProcessing] = useState<{ id: string; action: "approved" | "rejected" | "payout" } | null>(null);

  const handleStatusUpdate = (profile: AffiliateProfile, status: "approved" | "rejected") => {
    if (status === "rejected" && !window.confirm(`Reject the affiliate application from ${profile.userName || profile.userEmail}?`)) return;
    setProcessing({ id: profile.id, action: status });
    startTransition(async () => {
      try {
        const res = await updateAffiliateStatusAction({ userId: profile.id, status });
        if (res.success) toast.success(status === "approved" ? "Application approved" : "Application rejected");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update the application.");
      } finally {
        setProcessing(null);
      }
    });
  };

  const handlePayout = (commission: PendingCommission) => {
    if (!window.confirm(`Mark ${formatMoney(commission.amount)} as paid to ${commission.affiliateName || commission.affiliateEmail}?`)) return;
    setProcessing({ id: commission.id, action: "payout" });
    startTransition(async () => {
      try {
        const res = await payoutAffiliateCommissionAction(commission.id);
        if (res.success) toast.success("Commission marked as paid");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not process the payout.");
      } finally {
        setProcessing(null);
      }
    });
  };

  const locked = processing !== null;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <section aria-labelledby="affiliate-applications" className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <h2 id="affiliate-applications" className="text-sm font-semibold text-foreground">
            Pending applications
          </h2>
          <span className="text-xs text-muted-foreground tabular-nums">{pendingProfiles.length}</span>
        </div>

        {pendingProfiles.length === 0 ? (
          <AdminEmptyState icon={UserPlus} title="No pending applications" description="New affiliate applications will appear here." />
        ) : (
          <ul className="divide-y divide-border">
            {pendingProfiles.map((prof) => {
              const busy = processing?.id === prof.id;
              return (
                <li key={prof.id} className="space-y-3 px-4 py-4 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{prof.userName || "Unnamed user"}</p>
                      <p className="truncate text-xs text-muted-foreground">{prof.userEmail}</p>
                      {prof.affiliateSlug ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Handle <span className="font-mono text-[11px] text-foreground">{prof.affiliateSlug}</span>
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{dateFormat.format(new Date(prof.createdAt))}</span>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Promotional channels</p>
                    <p className="mt-0.5 text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground">
                      {prof.channels || "No details provided."}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" disabled={locked} onClick={() => handleStatusUpdate(prof, "approved")}>
                      {busy && processing?.action === "approved" ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Check aria-hidden="true" />}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={locked}
                      onClick={() => handleStatusUpdate(prof, "rejected")}
                      className="hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                    >
                      {busy && processing?.action === "rejected" ? <Loader2 aria-hidden="true" className="animate-spin" /> : <X aria-hidden="true" />}
                      Reject
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="affiliate-settlements" className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <h2 id="affiliate-settlements" className="text-sm font-semibold text-foreground">
            Pending settlements
          </h2>
          <span className="text-xs text-muted-foreground tabular-nums">{pendingCommissions.length}</span>
        </div>

        {pendingCommissions.length === 0 ? (
          <AdminEmptyState icon={Wallet} title="Nothing to settle" description="Pending affiliate commissions will appear here." />
        ) : (
          <ul className="divide-y divide-border">
            {pendingCommissions.map((comm) => {
              const busy = processing?.id === comm.id;
              return (
                <li key={comm.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{comm.productTitle}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {comm.affiliateName || "Partner"} · {comm.affiliateEmail}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="font-mono text-[11px]">{comm.orderId.slice(0, 8)}</span> · {comm.percent}% commission ·{" "}
                      {dateFormat.format(new Date(comm.createdAt))}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="text-sm font-medium text-foreground tabular-nums">{formatMoney(comm.amount)}</span>
                    <Button size="sm" variant="outline" disabled={locked} onClick={() => handlePayout(comm)}>
                      {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : <CheckCircle2 aria-hidden="true" />}
                      Mark paid
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
