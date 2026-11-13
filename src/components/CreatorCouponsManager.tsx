"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createCreatorCouponAction, deleteCreatorCouponAction } from "@/lib/actions/creator";
import { formatMoney } from "@/lib/price-utils";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  Panel,
  StatusPill,
  errorTextClass,
  fieldClass,
  hintClass,
  labelClass,
  selectClass,
  tableCellClass,
  tableHeadClass,
} from "@/components/creator/console-ui";
import { cn } from "@/lib/utils";

interface CreatorCoupon {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  minPurchaseAmount: number;
  active: boolean;
}

type Errors = Partial<Record<"code" | "discountValue" | "minPurchaseAmount" | "form", string>>;

function validate(code: string, type: string, value: string, min: string): Errors {
  const errors: Errors = {};
  if (!/^[A-Z0-9]{3,15}$/.test(code)) {
    errors.code = "Use 3–15 letters or numbers, no spaces.";
  }
  const v = Number(value);
  if (!value || !Number.isInteger(v) || v <= 0) {
    errors.discountValue = "Enter a whole number above 0.";
  } else if (type === "percentage" && v > 100) {
    errors.discountValue = "A percentage can’t be more than 100.";
  }
  if (min && (Number.isNaN(Number(min)) || Number(min) < 0)) {
    errors.minPurchaseAmount = "Enter an amount in dollars, or leave empty.";
  }
  return errors;
}

export default function CreatorCouponsManager({ initialCoupons }: { initialCoupons: CreatorCoupon[] }) {
  const router = useRouter();
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  const [isCreating, startCreate] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minPurchaseAmount, setMinPurchaseAmount] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  const couponsList = initialCoupons.filter((c) => !removed.has(c.id));

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextErrors = validate(code, discountType, discountValue, minPurchaseAmount);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const formData = new FormData();
    formData.set("code", code);
    formData.set("discountType", discountType);
    // Fixed discounts are applied in cents at checkout, so convert dollars → cents.
    formData.set(
      "discountValue",
      discountType === "fixed" ? String(Math.round(Number(discountValue) * 100)) : discountValue
    );
    // The action converts this dollar amount to cents itself.
    formData.set("minPurchaseAmount", minPurchaseAmount || "0");

    startCreate(async () => {
      try {
        const res = await createCreatorCouponAction(formData);
        if (res?.success) {
          toast.success(`Coupon ${code} created.`);
          setCode("");
          setDiscountValue("");
          setMinPurchaseAmount("");
          router.refresh();
        } else {
          setErrors({ form: "Could not create the coupon. Try again." });
        }
      } catch (err) {
        setErrors({
          form:
            err instanceof Error && err.message
              ? err.message
              : "Could not create the coupon. The code may already be taken.",
        });
      }
    });
  };

  const handleDelete = async (coupon: CreatorCoupon) => {
    if (!window.confirm(`Delete coupon ${coupon.code}? Customers will no longer be able to use it.`)) return;
    setDeletingId(coupon.id);
    try {
      const res = await deleteCreatorCouponAction(coupon.id);
      if (res?.success) {
        setRemoved((prev) => new Set(prev).add(coupon.id));
        toast.success(`Coupon ${coupon.code} deleted.`);
        router.refresh();
      } else {
        toast.error("Could not delete the coupon. Try again.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the coupon. Try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <Panel className="lg:col-span-5" title="New coupon" description="Valid on every product in your store.">
        <form onSubmit={handleCreate} noValidate className="space-y-4 p-4 sm:p-5">
          <div className="space-y-1.5">
            <label htmlFor="coupon-code" className={labelClass}>
              Code
            </label>
            <input
              id="coupon-code"
              name="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
              placeholder="LAUNCH20"
              maxLength={15}
              autoComplete="off"
              aria-invalid={Boolean(errors.code)}
              aria-describedby={errors.code ? "coupon-code-error" : "coupon-code-hint"}
              className={cn(fieldClass, "font-mono tracking-wide uppercase")}
            />
            {errors.code ? (
              <p id="coupon-code-error" className={errorTextClass}>{errors.code}</p>
            ) : (
              <p id="coupon-code-hint" className={hintClass}>3–15 letters or numbers.</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="coupon-type" className={labelClass}>
                Discount type
              </label>
              <select
                id="coupon-type"
                value={discountType}
                onChange={(e) => {
                  setDiscountType(e.target.value);
                  setDiscountValue("");
                  setErrors((prev) => ({ ...prev, discountValue: undefined }));
                }}
                className={selectClass}
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount ($)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="coupon-value" className={labelClass}>
                {discountType === "percentage" ? "Discount (%)" : "Discount ($)"}
              </label>
              <input
                id="coupon-value"
                type="number"
                inputMode="numeric"
                min={1}
                max={discountType === "percentage" ? 100 : undefined}
                step={1}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "percentage" ? "20" : "200"}
                aria-invalid={Boolean(errors.discountValue)}
                aria-describedby={errors.discountValue ? "coupon-value-error" : undefined}
                className={cn(fieldClass, "tabular")}
              />
              {errors.discountValue ? (
                <p id="coupon-value-error" className={errorTextClass}>{errors.discountValue}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="coupon-min" className={labelClass}>
              Minimum order ($) <span className="font-normal text-muted-foreground">optional</span>
            </label>
            <input
              id="coupon-min"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={minPurchaseAmount}
              onChange={(e) => setMinPurchaseAmount(e.target.value)}
              placeholder="500"
              aria-invalid={Boolean(errors.minPurchaseAmount)}
              aria-describedby={errors.minPurchaseAmount ? "coupon-min-error" : undefined}
              className={cn(fieldClass, "tabular")}
            />
            {errors.minPurchaseAmount ? (
              <p id="coupon-min-error" className={errorTextClass}>{errors.minPurchaseAmount}</p>
            ) : null}
          </div>

          {errors.form ? (
            <p role="alert" className="rounded-[10px] bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errors.form}
            </p>
          ) : null}

          <Button type="submit" disabled={isCreating} className="w-full">
            {isCreating ? <Loader2 className="animate-spin" /> : <Plus strokeWidth={1.75} />}
            {isCreating ? "Creating…" : "Create coupon"}
          </Button>
        </form>
      </Panel>

      <Panel
        className="overflow-hidden lg:col-span-7"
        title="Your coupons"
        description={`${couponsList.length} ${couponsList.length === 1 ? "code" : "codes"}`}
      >
        {couponsList.length === 0 ? (
          <EmptyState
            title="No coupons yet"
            description="Create a code to offer a store-wide discount on launch day or to your newsletter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] border-collapse text-sm">
              <thead className="border-b border-border bg-secondary/40">
                <tr>
                  <th scope="col" className={tableHeadClass}>Code</th>
                  <th scope="col" className={tableHeadClass}>Discount</th>
                  <th scope="col" className={tableHeadClass}>Min. order</th>
                  <th scope="col" className={tableHeadClass}>Status</th>
                  <th scope="col" className={`${tableHeadClass} text-right`}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {couponsList.map((coupon) => (
                  <tr key={coupon.id} className="transition-colors hover:bg-secondary/40">
                    <td className={`${tableCellClass} font-mono font-medium text-foreground`}>{coupon.code}</td>
                    <td className={`${tableCellClass} tabular whitespace-nowrap text-foreground`}>
                      {coupon.discountType === "percentage"
                        ? `${coupon.discountValue}% off`
                        : `${formatMoney(coupon.discountValue)} off`}
                    </td>
                    <td className={`${tableCellClass} tabular whitespace-nowrap text-muted-foreground`}>
                      {coupon.minPurchaseAmount > 0 ? formatMoney(coupon.minPurchaseAmount) : "None"}
                    </td>
                    <td className={tableCellClass}>
                      {coupon.active ? <StatusPill tone="success">Active</StatusPill> : <StatusPill>Inactive</StatusPill>}
                    </td>
                    <td className={`${tableCellClass} text-right`}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={deletingId === coupon.id}
                        onClick={() => handleDelete(coupon)}
                        aria-label={`Delete coupon ${coupon.code}`}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        {deletingId === coupon.id ? <Loader2 className="animate-spin" /> : <Trash2 strokeWidth={1.75} />}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
