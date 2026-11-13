"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Loader2, Save, Store, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { updateCreatorRazorpayAccountIdAction, registerRazorpayRouteAccountAction } from "@/lib/actions/route";
import { Button } from "@/components/ui/button";
import { AdminEmptyState, AdminPager, StatusText } from "@/app/admin/_components/admin-ui";
import { cn } from "@/lib/utils";

interface CreatorType {
  id: string;
  email: string;
  name: string | null;
  storeName: string | null;
  role: string;
  razorpayAccountId: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  productsList: string;
  createdAt: string;
}

interface PagerInfo {
  params: Record<string, string | undefined>;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}

function Step({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <li className={cn("flex items-center gap-1.5 text-xs", done ? "text-foreground" : "text-muted-foreground")}>
      {done ? (
        <Check aria-hidden="true" className="size-3.5 shrink-0 text-success" />
      ) : (
        <X aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground/70" />
      )}
      <span>
        {children}
        <span className="sr-only">{done ? " (done)" : " (not done)"}</span>
      </span>
    </li>
  );
}

function maskAccount(value: string) {
  return value.length > 4 ? `•••• ${value.slice(-4)}` : value;
}

export default function StoresClient({
  initialCreators,
  currentSearch = "",
  pager,
}: {
  initialCreators: CreatorType[];
  currentSearch?: string;
  pager?: PagerInfo;
}) {
  const [creators, setCreators] = useState(initialCreators);
  const [accountInputs, setAccountInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialCreators.map((c) => [c.id, c.razorpayAccountId || ""]))
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [onboardingId, setOnboardingId] = useState<string | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);

  const handleManualSave = async (userId: string) => {
    const accId = (accountInputs[userId] || "").trim();
    setSavingId(userId);
    try {
      const res = await updateCreatorRazorpayAccountIdAction(userId, accId);
      if (res.success) {
        toast.success(accId ? "Route account ID saved" : "Route account ID cleared");
        setCreators((prev) => prev.map((c) => (c.id === userId ? { ...c, razorpayAccountId: accId || null } : c)));
      } else {
        toast.error("Could not save the account ID.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSavingId(null);
    }
  };

  const handleAutoRegister = async (userId: string) => {
    setOnboardingId(userId);
    try {
      const res = await registerRazorpayRouteAccountAction(userId);
      if (res.success && res.accountId) {
        const accountId = res.accountId;
        toast.success(`Route account created: ${accountId}`);
        setAccountInputs((prev) => ({ ...prev, [userId]: accountId }));
        setCreators((prev) => prev.map((c) => (c.id === userId ? { ...c, razorpayAccountId: accountId } : c)));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Automatic onboarding failed. Add the account ID manually.");
    } finally {
      setOnboardingId(null);
    }
  };

  if (creators.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card">
        <AdminEmptyState
          icon={Store}
          title={currentSearch ? `No creators match “${currentSearch}”` : "No creators in this view"}
          description="Try another search or change the status filter."
        />
      </div>
    );
  }

  return (
    <section aria-label="Creators" className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)_auto] gap-6 border-b border-border px-5 py-2.5 text-xs font-medium text-muted-foreground xl:grid">
        <span>Store & owner</span>
        <span>Bank details</span>
        <span>Route onboarding</span>
        <span>Listings</span>
        <span className="sr-only">Actions</span>
      </div>

      <ul className="divide-y divide-border">
        {creators.map((c) => {
          const hasBankDetails = !!c.bankAccountNumber && !!c.bankIfsc;
          const isRouteConnected = !!c.razorpayAccountId && c.razorpayAccountId.startsWith("acc_");
          const inputId = `route-${c.id}`;
          const saving = savingId === c.id;
          const onboarding = onboardingId === c.id;
          const noListings = c.approvedCount === 0 && c.pendingCount === 0 && c.rejectedCount === 0;

          return (
            <li
              key={c.id}
              className="grid gap-4 px-4 py-4 sm:px-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)_auto] xl:gap-6"
            >
              {/* Store & owner */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <p className={cn("truncate text-sm font-medium", c.storeName ? "text-foreground" : "text-muted-foreground")}>
                    {c.storeName || "Unnamed store"}
                  </p>
                  <span className="text-xs text-muted-foreground capitalize">{c.role}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.email}</p>
                {c.name ? <p className="truncate text-xs text-muted-foreground">Owner: {c.name}</p> : null}
              </div>

              {/* Bank */}
              <div className="min-w-0 text-xs">
                <p className="mb-1 text-muted-foreground xl:hidden">Bank details</p>
                {hasBankDetails ? (
                  <dl className="space-y-0.5">
                    <div className="flex gap-1.5">
                      <dt className="sr-only">Bank</dt>
                      <dd className="font-medium text-foreground">{c.bankName || "Bank transfer"}</dd>
                    </div>
                    {c.bankAccountName ? (
                      <div className="flex gap-1.5">
                        <dt className="text-muted-foreground">Name</dt>
                        <dd className="truncate text-foreground">{c.bankAccountName}</dd>
                      </div>
                    ) : null}
                    <div className="flex items-center gap-1.5">
                      <dt className="text-muted-foreground">A/C</dt>
                      <dd className="font-mono text-foreground">
                        <button
                          type="button"
                          onClick={() => setRevealedId((id) => (id === c.id ? null : c.id))}
                          className="rounded underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={revealedId === c.id ? "Hide account number" : "Show full account number"}
                        >
                          {revealedId === c.id ? c.bankAccountNumber : maskAccount(c.bankAccountNumber || "")}
                        </button>
                      </dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-muted-foreground">IFSC</dt>
                      <dd className="font-mono text-foreground">{c.bankIfsc}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-muted-foreground">No bank details saved</p>
                )}
              </div>

              {/* Route onboarding */}
              <div className="min-w-0 space-y-2.5">
                <ul className="space-y-0.5" aria-label="Onboarding steps">
                  <Step done={!!c.storeName}>Store set up</Step>
                  <Step done={hasBankDetails}>Bank credentials</Step>
                  <Step done={isRouteConnected}>Linked account ID</Step>
                </ul>
                <div className="flex max-w-xs gap-1.5">
                  <label htmlFor={inputId} className="sr-only">
                    Razorpay Route account ID for {c.storeName || c.email}
                  </label>
                  <input
                    id={inputId}
                    type="text"
                    spellCheck={false}
                    autoComplete="off"
                    value={accountInputs[c.id] ?? ""}
                    onChange={(e) => setAccountInputs((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleManualSave(c.id);
                      }
                    }}
                    placeholder="acc_XXXXXXXXXXXX"
                    className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-card px-2.5 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={saving || (accountInputs[c.id] ?? "") === (c.razorpayAccountId ?? "")}
                    onClick={() => handleManualSave(c.id)}
                    aria-label="Save account ID"
                    title="Save account ID"
                  >
                    {saving ? <Loader2 className="animate-spin" /> : <Save />}
                  </Button>
                </div>
                {!c.razorpayAccountId && hasBankDetails ? (
                  <Button type="button" variant="secondary" size="xs" disabled={onboarding} onClick={() => handleAutoRegister(c.id)}>
                    {onboarding ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Wand2 aria-hidden="true" />}
                    Create Route account
                  </Button>
                ) : null}
              </div>

              {/* Listings */}
              <div className="min-w-0">
                <p className="mb-1 text-xs text-muted-foreground xl:hidden">Listings</p>
                {noListings ? (
                  <p className="text-xs text-muted-foreground">No listings</p>
                ) : (
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {c.approvedCount > 0 ? <StatusText tone="success">{c.approvedCount} approved</StatusText> : null}
                    {c.pendingCount > 0 ? <StatusText tone="attention">{c.pendingCount} pending</StatusText> : null}
                    {c.rejectedCount > 0 ? <StatusText tone="danger">{c.rejectedCount} rejected</StatusText> : null}
                  </div>
                )}
                {c.productsList ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground" title={c.productsList}>
                    {c.productsList}
                  </p>
                ) : null}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-start gap-1.5 md:col-span-2 xl:col-span-1 xl:flex-col xl:items-end">
                {c.storeName ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/stores/${c.id}`} target="_blank" rel="noopener noreferrer">
                      View store
                      <ExternalLink aria-hidden="true" />
                    </Link>
                  </Button>
                ) : null}
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/admin/products?search=${encodeURIComponent(c.storeName || c.email)}`}>Products</Link>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {pager ? (
        <AdminPager
          basePath="/admin/stores"
          params={pager.params}
          currentPage={pager.currentPage}
          totalPages={pager.totalPages}
          totalCount={pager.totalCount}
          pageSize={pager.pageSize}
          noun="creators"
        />
      ) : null}
    </section>
  );
}
