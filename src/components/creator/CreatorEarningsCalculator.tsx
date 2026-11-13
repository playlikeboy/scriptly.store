"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/price-utils";

const PRICE_MARKS = ["$5 script", "$49 boilerplate", "$99 full stack"];
const SALES_MARKS = ["5 side project", "50 steady tool", "200 breakout kit"];

const rangeClass =
  "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-card";

export default function CreatorEarningsCalculator({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [price, setPrice] = useState(19);
  const [sales, setSales] = useState(35);
  const priceId = useId();
  const salesId = useId();

  const gross = price * sales;
  const rows = [
    { label: "Scriptly", share: 0.95, highlight: true },
    { label: "Typical digital storefront", share: 0.7, highlight: false },
    { label: "Legacy template marketplace", share: 0.5, highlight: false },
  ].map((r) => ({ ...r, amount: Math.round(gross * r.share) }));
  const takeHome = rows[0].amount;
  const extraVs70 = takeHome - rows[1].amount;

  return (
    <section id="calculator" className="scroll-mt-20 border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="max-w-[44rem]">
          <h2 className="font-display text-3xl leading-tight tracking-[-0.02em] text-balance text-foreground md:text-4xl">
            Estimate your monthly earnings
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Move the sliders to see your take-home at Scriptly’s 95% creator split. Figures are estimates, not a
            forecast.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-12">
          <div className="space-y-8 p-5 sm:p-8 lg:col-span-7">
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-4">
                <label htmlFor={priceId} className="text-sm font-medium text-foreground">
                  Product price
                </label>
                <output htmlFor={priceId} className="tabular text-lg font-semibold text-foreground">
                  {formatMoney((price) * 100)}
                </output>
              </div>
              <input
                id={priceId}
                type="range"
                min={5}
                max={99}
                step={1}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className={rangeClass}
              />
              <div aria-hidden className="flex justify-between text-xs text-muted-foreground">
                {PRICE_MARKS.map((m, i) => (
                  <span key={m} className={i === 1 ? "hidden sm:inline" : undefined}>
                    {m}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-4">
                <label htmlFor={salesId} className="text-sm font-medium text-foreground">
                  Orders per month
                </label>
                <output htmlFor={salesId} className="tabular text-lg font-semibold text-foreground">
                  {sales}
                </output>
              </div>
              <input
                id={salesId}
                type="range"
                min={5}
                max={200}
                step={1}
                value={sales}
                onChange={(e) => setSales(Number(e.target.value))}
                className={rangeClass}
              />
              <div aria-hidden className="flex justify-between text-xs text-muted-foreground">
                {SALES_MARKS.map((m, i) => (
                  <span key={m} className={i === 1 ? "hidden sm:inline" : undefined}>
                    {m}
                  </span>
                ))}
              </div>
            </div>

            <table className="w-full text-sm">
              <caption className="pb-2 text-left text-sm font-medium text-foreground">
                Monthly take-home compared
              </caption>
              <tbody className="divide-y divide-border border-y border-border">
                {rows.map((r) => (
                  <tr key={r.label}>
                    <th scope="row" className={`py-2.5 text-left font-normal ${r.highlight ? "text-foreground" : "text-muted-foreground"}`}>
                      {r.label} <span className="tabular text-muted-foreground">({Math.round(r.share * 100)}%)</span>
                    </th>
                    <td className={`tabular py-2.5 text-right ${r.highlight ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                      {formatMoney((r.amount) * 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            aria-live="polite"
            className="flex flex-col justify-between gap-8 border-t border-border bg-secondary/40 p-5 sm:p-8 lg:col-span-5 lg:border-t-0 lg:border-l"
          >
            <div>
              <p className="text-sm text-muted-foreground">Your estimated monthly earnings</p>
              <p className="tabular mt-2 font-display text-5xl leading-none tracking-[-0.02em] text-foreground sm:text-6xl">
                {formatMoney((takeHome) * 100)}
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                That’s <span className="tabular font-medium text-success">{formatMoney((extraVs70) * 100)}</span> more each month
                than a typical 70% storefront, paid straight to your linked bank account.
              </p>
            </div>
            <Button asChild variant="accent" size="lg" className="w-full">
              <Link href={isLoggedIn ? "/creator/new" : "/handler/sign-in?redirectTo=/creator/new"}>
                Claim your 95% <ArrowRight strokeWidth={1.75} />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
