"use client";

import { useId, useState, useTransition } from "react";
import { Coins, History, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { recordPayoutAction } from "@/lib/actions/payouts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminEmptyState, AdminPager, formatAdminDate } from "@/app/admin/_components/admin-ui";
import { formatMoney } from "@/lib/price-utils";
import { cn } from "@/lib/utils";

type Creator = {
  id: string;
  email: string;
  name: string | null;
  storeName: string | null;
  payoutMethod: string | null;
  paypalEmail: string | null;
  payoutDetails: string | null;
  grossSales: number;
  netEarning: number;
  totalPaid: number;
  unpaidBalance: number;
  productsCount: number;
};

type LedgerEntry = {
  id: string;
  userId: string;
  userEmail: string;
  userStoreName: string | null;
  amount: number;
  payoutMethod: string | null;
  paypalEmail: string | null;
  payoutDetails: string | null;
  createdAt: string;
};

type PagerInfo = {
  params: Record<string, string | undefined>;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
};

interface PayoutsClientProps {
  creators: Creator[];
  payoutsHistory: LedgerEntry[];
  creatorPager?: PagerInfo;
  ledgerPager?: PagerInfo;
  creatorFilters?: React.ReactNode;
  ledgerFilters?: React.ReactNode;
}

const th = "h-10 px-4 text-left text-xs font-medium whitespace-nowrap text-muted-foreground first:sm:pl-5 last:sm:pr-5";
const td = "px-4 py-3 align-top first:sm:pl-5 last:sm:pr-5";

export default function PayoutsClient({
  creators,
  payoutsHistory,
  creatorPager,
  ledgerPager,
  creatorFilters,
  ledgerFilters,
}: PayoutsClientProps) {
  const ids = useId();
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const openDialog = (creator: Creator) => {
    setSelectedCreator(creator);
    setPayoutAmount((creator.unpaidBalance / 100).toFixed(2));
    setAmountError(null);
  };

  const closeDialog = () => {
    if (isPending) return;
    setSelectedCreator(null);
    setPayoutAmount("");
    setAmountError(null);
  };

  const handleRecordPayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCreator) return;

    const parsedAmount = parseFloat(payoutAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setAmountError("Enter an amount greater than $0.");
      return;
    }

    // Amount is entered in dollars and stored in cents.
    const amountPaise = Math.round(parsedAmount * 100);
    if (amountPaise > selectedCreator.unpaidBalance) {
      setAmountError(`This exceeds the unpaid balance of ${formatMoney(selectedCreator.unpaidBalance)}.`);
      return;
    }
    setAmountError(null);

    const creator = selectedCreator;
    startTransition(async () => {
      try {
        const res = await recordPayoutAction({ userId: creator.id, amountCents: amountPaise });
        if (res.success) {
          toast.success(`Recorded ${formatMoney(amountPaise)} paid to ${creator.storeName || creator.email}`);
          setSelectedCreator(null);
          setPayoutAmount("");
        } else {
          toast.error("Could not record the payout.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      {/* Creator balances */}
      <section aria-labelledby={`${ids}-balances`} className="min-w-0 space-y-3">
        {creatorFilters}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <h2 id={`${ids}-balances`} className="text-sm font-semibold text-foreground">
              Creator balances
            </h2>
          </div>

          {creators.length === 0 ? (
            <AdminEmptyState icon={Users} title="No creators in this view" description="Try another search or balance filter." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th scope="col" className={th}>Creator</th>
                      <th scope="col" className={cn(th, "hidden text-right md:table-cell")}>Gross</th>
                      <th scope="col" className={cn(th, "hidden text-right lg:table-cell")}>Net (95%)</th>
                      <th scope="col" className={cn(th, "hidden text-right lg:table-cell")}>Paid</th>
                      <th scope="col" className={cn(th, "text-right")}>Unpaid</th>
                      <th scope="col" className={cn(th, "text-right")}>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {creators.map((c) => (
                      <tr key={c.id} className="transition-colors hover:bg-secondary/40">
                        <td className={cn(td, "max-w-0 w-full")}>
                          <p className={cn("truncate font-medium", c.storeName ? "text-foreground" : "text-muted-foreground")}>
                            {c.storeName || "Unnamed store"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            <span className="capitalize">{c.payoutMethod || "No payout method"}</span>
                            {c.paypalEmail ? <> · {c.paypalEmail}</> : null}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground tabular-nums lg:hidden">
                            <span className="md:hidden">Gross {formatMoney(c.grossSales)} · </span>
                            Net {formatMoney(c.netEarning)} · Paid {formatMoney(c.totalPaid)}
                          </p>
                        </td>
                        <td className={cn(td, "hidden text-right whitespace-nowrap tabular-nums md:table-cell")}>
                          {formatMoney(c.grossSales)}
                        </td>
                        <td className={cn(td, "hidden text-right whitespace-nowrap tabular-nums lg:table-cell")}>
                          {formatMoney(c.netEarning)}
                        </td>
                        <td className={cn(td, "hidden text-right whitespace-nowrap text-muted-foreground tabular-nums lg:table-cell")}>
                          {formatMoney(c.totalPaid)}
                        </td>
                        <td
                          className={cn(
                            td,
                            "text-right font-medium whitespace-nowrap tabular-nums",
                            c.unpaidBalance > 0 ? "text-primary" : "text-muted-foreground"
                          )}
                        >
                          {formatMoney(c.unpaidBalance)}
                        </td>
                        <td className={cn(td, "text-right")}>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={c.unpaidBalance <= 0}
                            onClick={() => openDialog(c)}
                            aria-label={`Record payout for ${c.storeName || c.email}`}
                          >
                            <Coins aria-hidden="true" />
                            <span className="hidden sm:inline">Record</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {creatorPager ? (
                <AdminPager basePath="/admin/payouts" noun="creators" {...creatorPager} />
              ) : null}
            </>
          )}
        </div>
      </section>

      {/* Ledger */}
      <section aria-labelledby={`${ids}-ledger`} className="min-w-0 space-y-3">
        {ledgerFilters}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <h2 id={`${ids}-ledger`} className="text-sm font-semibold text-foreground">
              Payout ledger
            </h2>
          </div>
          {payoutsHistory.length === 0 ? (
            <AdminEmptyState icon={History} title="No payouts recorded" description="Settlements you log appear here." />
          ) : (
            <>
              <ul className="divide-y divide-border">
                {payoutsHistory.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{p.userStoreName || p.userEmail}</p>
                      {p.userStoreName ? <p className="truncate text-xs text-muted-foreground">{p.userEmail}</p> : null}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <span className="capitalize">{p.payoutMethod || "Manual"}</span> · {formatAdminDate(p.createdAt)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-foreground tabular-nums">{formatMoney(p.amount)}</span>
                  </li>
                ))}
              </ul>
              {ledgerPager ? (
                <AdminPager basePath="/admin/payouts" pageKey="lpage" noun="payouts" {...ledgerPager} />
              ) : null}
            </>
          )}
        </div>
      </section>

      <Dialog open={selectedCreator !== null} onOpenChange={(open) => (!open ? closeDialog() : undefined)}>
        <DialogContent className="sm:max-w-md">
          {selectedCreator ? (
            <form onSubmit={handleRecordPayout} className="grid gap-4" noValidate>
              <DialogHeader>
                <DialogTitle className="text-base font-semibold">Record manual payout</DialogTitle>
                <DialogDescription>
                  Transfer the funds through the creator’s preferred method first. Logging the payout reduces their unpaid
                  balance.
                </DialogDescription>
              </DialogHeader>

              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 border-y border-border py-3 text-sm">
                <dt className="text-muted-foreground">Store</dt>
                <dd className="truncate text-foreground">{selectedCreator.storeName || "Unnamed"}</dd>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="truncate text-foreground">{selectedCreator.email}</dd>
                <dt className="text-muted-foreground">Method</dt>
                <dd className="text-foreground capitalize">{selectedCreator.payoutMethod || "Unspecified"}</dd>
                {selectedCreator.paypalEmail ? (
                  <>
                    <dt className="text-muted-foreground">PayPal</dt>
                    <dd className="truncate font-mono text-xs leading-5 text-foreground">{selectedCreator.paypalEmail}</dd>
                  </>
                ) : null}
                {selectedCreator.payoutDetails ? (
                  <>
                    <dt className="text-muted-foreground">Details</dt>
                    <dd className="font-mono text-xs leading-5 break-all whitespace-pre-wrap text-foreground">
                      {selectedCreator.payoutDetails}
                    </dd>
                  </>
                ) : null}
                <dt className="text-muted-foreground">Unpaid</dt>
                <dd className="font-medium text-primary tabular-nums">{formatMoney(selectedCreator.unpaidBalance)}</dd>
              </dl>

              <div className="space-y-1.5">
                <label htmlFor={`${ids}-amount`} className="text-sm font-medium text-foreground">
                  Amount paid ($)
                </label>
                <div className="relative">
                  <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <input
                    id={`${ids}-amount`}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    max={(selectedCreator.unpaidBalance / 100).toFixed(2)}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    aria-invalid={amountError ? true : undefined}
                    aria-describedby={amountError ? `${ids}-amount-error` : undefined}
                    required
                    className="h-10 w-full rounded-[10px] border border-input bg-card pr-3 pl-7 text-sm text-foreground tabular-nums outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive"
                  />
                </div>
                {amountError ? (
                  <p id={`${ids}-amount-error`} className="text-sm text-destructive">
                    {amountError}
                  </p>
                ) : null}
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
                <Button type="button" variant="outline" onClick={closeDialog} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                  {isPending ? "Recording…" : "Mark as paid"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
