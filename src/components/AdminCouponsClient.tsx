"use client";

import useSWR from "swr";
import { useId, useState } from "react";
import { AlertCircle, CheckCircle2, Gift, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/price-utils";
import { cn } from "@/lib/utils";

interface Coupon {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  minPurchaseAmount: number;
  active: boolean;
  createdAt: string | Date;
}

type CouponsResponse = { success?: boolean; coupons?: Coupon[]; error?: string };

const fetcher = async (url: string): Promise<CouponsResponse> => {
  const res = await fetch(url);
  const body = (await res.json()) as CouponsResponse;
  if (!res.ok) throw new Error(body.error || "Failed to load coupons.");
  return body;
};

const fieldClass =
  "h-10 w-full rounded-[10px] border border-input bg-card px-3 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive";
const labelClass = "text-sm font-medium text-foreground";

export default function AdminCouponsClient({ initialCoupons }: { initialCoupons?: Coupon[] }) {
  const { data, error, mutate, isLoading } = useSWR<CouponsResponse>("/api/admin/coupons", fetcher, {
    fallbackData: initialCoupons ? { success: true, coupons: initialCoupons } : undefined,
    revalidateOnMount: !initialCoupons,
    revalidateOnFocus: false,
  });
  const ids = useId();
  const [codeInput, setCodeInput] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [valueInput, setValueInput] = useState("");
  const [minPurchaseInput, setMinPurchaseInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [rowPending, setRowPending] = useState<string | null>(null);

  const couponList = data?.coupons ?? [];

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!codeInput.trim() || !valueInput.trim()) {
      setFormError("Coupon code and discount value are required.");
      return;
    }

    const valNum = parseFloat(valueInput);
    if (isNaN(valNum) || valNum <= 0) {
      setFormError("Discount value must be a positive number.");
      return;
    }
    if (discountType === "percentage" && valNum > 100) {
      setFormError("A percentage discount cannot exceed 100%.");
      return;
    }

    const minNum = minPurchaseInput ? parseFloat(minPurchaseInput) : 0;
    if (isNaN(minNum) || minNum < 0) {
      setFormError("Minimum order must be zero or a positive amount.");
      return;
    }

    setActionPending(true);

    try {
      // Fixed amounts and minimum order are entered in dollars and stored in cents.
      const finalVal = discountType === "percentage" ? Math.round(valNum) : Math.round(valNum * 100);
      const minAmount = Math.round(minNum * 100);
      const code = codeInput.trim().toUpperCase();

      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          discountType,
          discountValue: finalVal,
          minPurchaseAmount: minAmount,
        }),
      });

      const result = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !result.success) {
        setFormError(result.error || "Could not create the coupon.");
      } else {
        setFormSuccess(`Coupon ${code} created.`);
        setCodeInput("");
        setValueInput("");
        setMinPurchaseInput("");
        mutate();
      }
    } catch (err) {
      console.error("Failed to create coupon:", err);
      setFormError("Network error. Check your connection and try again.");
    } finally {
      setActionPending(false);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    setRowPending(coupon.id);
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !coupon.active }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${coupon.code} ${coupon.active ? "deactivated" : "activated"}`);
      await mutate();
    } catch {
      toast.error(`Could not update ${coupon.code}.`);
    } finally {
      setRowPending(null);
    }
  };

  const handleDeleteCoupon = async (coupon: Coupon) => {
    if (!window.confirm(`Delete coupon ${coupon.code}? Customers will no longer be able to use it.`)) return;
    setRowPending(coupon.id);
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(`${coupon.code} deleted`);
      await mutate();
    } catch {
      toast.error(`Could not delete ${coupon.code}.`);
    } finally {
      setRowPending(null);
    }
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <section aria-labelledby={`${ids}-new`} className="rounded-2xl border border-border bg-card p-4 sm:p-5 lg:sticky lg:top-20">
        <h2 id={`${ids}-new`} className="text-sm font-semibold text-foreground">
          New coupon
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Issue a promotional discount code.</p>

        <form onSubmit={handleCreateCoupon} className="mt-5 space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor={`${ids}-code`} className={labelClass}>
              Code
            </label>
            <input
              id={`${ids}-code`}
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="GROW20"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              aria-describedby={`${ids}-code-hint`}
              maxLength={32}
              className={cn(fieldClass, "font-mono uppercase")}
            />
            <p id={`${ids}-code-hint`} className="text-xs text-muted-foreground">
              3–32 letters, numbers, hyphens or underscores.
            </p>
          </div>

          <fieldset className="space-y-1.5">
            <legend className={labelClass}>Discount type</legend>
            <div className="grid grid-cols-2 gap-1 rounded-[10px] bg-secondary p-1">
              {(["percentage", "fixed"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={discountType === type}
                  onClick={() => setDiscountType(type)}
                  className={cn(
                    "h-8 rounded-lg text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    discountType === type
                      ? "bg-card font-medium text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {type === "percentage" ? "Percentage" : "Fixed amount"}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <label htmlFor={`${ids}-value`} className={labelClass}>
              {discountType === "percentage" ? "Discount (%)" : "Discount ($)"}
            </label>
            <input
              id={`${ids}-value`}
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              placeholder={discountType === "percentage" ? "20" : "500"}
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              className={cn(fieldClass, "tabular-nums")}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${ids}-min`} className={labelClass}>
              Minimum order ($)
            </label>
            <input
              id={`${ids}-min`}
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              placeholder="Optional"
              value={minPurchaseInput}
              onChange={(e) => setMinPurchaseInput(e.target.value)}
              aria-describedby={`${ids}-min-hint`}
              className={cn(fieldClass, "tabular-nums")}
            />
            <p id={`${ids}-min-hint`} className="text-xs text-muted-foreground">
              Leave empty to allow the coupon on any order.
            </p>
          </div>

          <div aria-live="polite">
            {formError ? (
              <p className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {formError}
              </p>
            ) : null}
            {formSuccess ? (
              <p className="flex items-start gap-2 text-sm text-success">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {formSuccess}
              </p>
            ) : null}
          </div>

          <Button type="submit" disabled={actionPending} className="w-full">
            {actionPending ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Plus aria-hidden="true" />}
            {actionPending ? "Creating…" : "Create coupon"}
          </Button>
        </form>
      </section>

      <section aria-labelledby={`${ids}-list`} className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <h2 id={`${ids}-list`} className="text-sm font-semibold text-foreground">
            All coupons
          </h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {isLoading ? "Loading…" : `${couponList.length} ${couponList.length === 1 ? "coupon" : "coupons"}`}
          </span>
        </div>

        {isLoading && couponList.length === 0 ? (
          <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-muted-foreground">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Loading coupons
          </div>
        ) : error && couponList.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <AlertCircle aria-hidden="true" strokeWidth={1.75} className="mb-3 size-5 text-destructive" />
            <p className="text-sm font-medium text-foreground">Couldn’t load coupons</p>
            <p className="mt-1 text-sm text-muted-foreground">{error instanceof Error ? error.message : "Try again."}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => mutate()}>
              Retry
            </Button>
          </div>
        ) : couponList.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <Gift aria-hidden="true" strokeWidth={1.75} className="mb-3 size-5 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No coupons yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Create your first code with the form.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th scope="col" className="h-10 px-4 text-left text-xs font-medium text-muted-foreground sm:pl-5">Code</th>
                  <th scope="col" className="h-10 px-4 text-left text-xs font-medium text-muted-foreground">Discount</th>
                  <th scope="col" className="hidden h-10 px-4 text-left text-xs font-medium text-muted-foreground sm:table-cell">Min. order</th>
                  <th scope="col" className="h-10 px-4 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th scope="col" className="h-10 px-4 text-right sm:pr-5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {couponList.map((coupon) => {
                  const busy = rowPending === coupon.id;
                  return (
                    <tr key={coupon.id} className="transition-colors hover:bg-secondary/40">
                      <td className="px-4 py-3 font-mono text-[13px] font-medium text-foreground sm:pl-5">{coupon.code}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-foreground tabular-nums">
                        {coupon.discountType === "percentage"
                          ? `${coupon.discountValue}% off`
                          : `${formatMoney(coupon.discountValue)} off`}
                      </td>
                      <td className="hidden px-4 py-3 whitespace-nowrap text-muted-foreground tabular-nums sm:table-cell">
                        {coupon.minPurchaseAmount > 0 ? formatMoney(coupon.minPurchaseAmount) : "None"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={coupon.active}
                          aria-label={`${coupon.code} active`}
                          disabled={busy}
                          onClick={() => handleToggleActive(coupon)}
                          className={cn(
                            "-ml-2 inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium whitespace-nowrap transition-colors outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                            coupon.active ? "text-success" : "text-muted-foreground"
                          )}
                        >
                          <span aria-hidden="true" className={cn("size-1.5 rounded-full", coupon.active ? "bg-success" : "bg-muted-foreground/60")} />
                          {coupon.active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right sm:pr-5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={busy}
                          onClick={() => handleDeleteCoupon(coupon)}
                          aria-label={`Delete coupon ${coupon.code}`}
                          title="Delete coupon"
                          className="hover:bg-destructive/10 hover:text-destructive"
                        >
                          {busy ? <Loader2 className="animate-spin" /> : <Trash2 />}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
