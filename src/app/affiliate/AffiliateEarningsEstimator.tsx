"use client";

import { useId, useState } from "react";
import { formatMoney } from "@/lib/price-utils";

const rangeClass =
  "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-card";

export default function AffiliateEarningsEstimator() {
  const [sales, setSales] = useState(1500); // USD of referred sales per month
  const [rate, setRate] = useState(30); // %
  const salesId = useId();
  const rateId = useId();
  const earnings = Math.round(sales * (rate / 100));

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="space-y-7 p-5 sm:p-8">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor={salesId} className="text-sm font-medium text-foreground">
              Referred sales per month
            </label>
            <output htmlFor={salesId} className="tabular text-lg font-semibold text-foreground">
              {formatMoney(sales * 100)}
            </output>
          </div>
          <input
            id={salesId}
            type="range"
            min={100}
            max={10000}
            step={100}
            value={sales}
            onChange={(e) => setSales(Number(e.target.value))}
            className={rangeClass}
          />
          <div aria-hidden className="flex justify-between text-xs text-muted-foreground">
            <span>$100</span>
            <span>$10,000</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor={rateId} className="text-sm font-medium text-foreground">
              Average commission
            </label>
            <output htmlFor={rateId} className="tabular text-lg font-semibold text-foreground">
              {rate}%
            </output>
          </div>
          <input
            id={rateId}
            type="range"
            min={5}
            max={50}
            step={5}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className={rangeClass}
          />
          <div aria-hidden className="flex justify-between text-xs text-muted-foreground">
            <span>5%</span>
            <span>50%</span>
          </div>
        </div>
      </div>

      <div aria-live="polite" className="border-t border-border bg-secondary/40 p-5 sm:p-8">
        <p className="text-sm text-muted-foreground">Estimated monthly commission</p>
        <p className="tabular mt-2 font-display text-5xl leading-none tracking-[-0.02em] text-foreground">
          {formatMoney(earnings * 100)}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          An estimate only. Each product’s rate is set by its creator, and commission is paid in rupees.
        </p>
      </div>
    </div>
  );
}
