"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateCreatorPayoutSettingsAction } from "@/lib/actions/creator";
import { Button } from "@/components/ui/button";
import { Panel, errorTextClass, fieldClass, hintClass, labelClass } from "@/components/creator/console-ui";
import { cn } from "@/lib/utils";

interface PayoutSettingsEditorProps {
  initialBankName: string | null;
  initialBankAccountName: string | null;
  initialBankAccountNumber: string | null;
  initialBankIfsc: string | null;
}

type Field = "bankName" | "bankAccountName" | "bankAccountNumber" | "bankIfsc";
type Errors = Partial<Record<Field | "form", string>>;

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export default function PayoutSettingsEditor({
  initialBankName,
  initialBankAccountName,
  initialBankAccountNumber,
  initialBankIfsc,
}: PayoutSettingsEditorProps) {
  const router = useRouter();
  const [values, setValues] = useState<Record<Field, string>>({
    bankName: initialBankName || "",
    bankAccountName: initialBankAccountName || "",
    bankAccountNumber: initialBankAccountNumber || "",
    bankIfsc: initialBankIfsc || "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [isPending, startTransition] = useTransition();

  const set = (field: Field, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!values.bankName.trim()) e.bankName = "Enter your bank’s name.";
    if (!values.bankAccountName.trim()) e.bankAccountName = "Enter the name on the account.";
    const acct = values.bankAccountNumber.trim();
    if (!acct) e.bankAccountNumber = "Enter your account number.";
    else if (!/^\d{9,18}$/.test(acct)) e.bankAccountNumber = "Account numbers are 9–18 digits.";
    const ifsc = values.bankIfsc.trim();
    if (!ifsc) e.bankIfsc = "Enter your branch IFSC.";
    else if (!IFSC_RE.test(ifsc)) e.bankIfsc = "IFSC is 11 characters, like HDFC0000240.";
    return e;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    startTransition(async () => {
      try {
        const res = await updateCreatorPayoutSettingsAction(
          "bank",
          "",
          "",
          values.bankName.trim(),
          values.bankAccountName.trim(),
          values.bankAccountNumber.trim(),
          values.bankIfsc.trim()
        );
        if (res?.success) {
          toast.success("Bank details saved.");
          router.refresh();
        } else {
          setErrors({ form: "Could not save your bank details. Try again." });
        }
      } catch (err) {
        setErrors({
          form: err instanceof Error ? err.message : "Could not save your bank details. Try again.",
        });
      }
    });
  };

  const fieldProps = (field: Field) => ({
    id: `payout-${field}`,
    value: values[field],
    "aria-invalid": Boolean(errors[field]),
    "aria-describedby": errors[field] ? `payout-${field}-error` : undefined,
  });

  const errorFor = (field: Field) =>
    errors[field] ? (
      <p id={`payout-${field}-error`} className={errorTextClass}>
        {errors[field]}
      </p>
    ) : null;

  return (
    <Panel
      title="Bank account"
      description="Used by Razorpay Route to settle your 95% share of each sale."
    >
      <form onSubmit={handleSave} noValidate className="space-y-4 p-4 sm:p-5">
        <div className="space-y-1.5">
          <label htmlFor="payout-bankName" className={labelClass}>
            Bank name
          </label>
          <input
            {...fieldProps("bankName")}
            type="text"
            onChange={(e) => set("bankName", e.target.value)}
            placeholder="e.g. HDFC Bank"
            className={fieldClass}
          />
          {errorFor("bankName")}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="payout-bankAccountName" className={labelClass}>
            Account holder name
          </label>
          <input
            {...fieldProps("bankAccountName")}
            type="text"
            autoComplete="name"
            onChange={(e) => set("bankAccountName", e.target.value)}
            placeholder="Exactly as on your bank records"
            className={fieldClass}
          />
          {errorFor("bankAccountName")}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="payout-bankAccountNumber" className={labelClass}>
              Account number
            </label>
            <input
              {...fieldProps("bankAccountNumber")}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              onChange={(e) => set("bankAccountNumber", e.target.value.replace(/\s/g, ""))}
              placeholder="000123456789"
              className={cn(fieldClass, "font-mono tabular")}
            />
            {errorFor("bankAccountNumber")}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="payout-bankIfsc" className={labelClass}>
              IFSC code
            </label>
            <input
              {...fieldProps("bankIfsc")}
              type="text"
              autoComplete="off"
              maxLength={11}
              onChange={(e) => set("bankIfsc", e.target.value.toUpperCase().replace(/\s/g, ""))}
              placeholder="HDFC0000240"
              className={cn(fieldClass, "font-mono uppercase")}
            />
            {errorFor("bankIfsc")}
          </div>
        </div>

        <p className={hintClass}>
          Checkouts split automatically: 95% to this account, 5% platform fee. No invoices to file.
        </p>

        {errors.form ? (
          <p role="alert" className="rounded-[10px] bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errors.form}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : null}
            {isPending ? "Saving…" : "Save bank details"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
