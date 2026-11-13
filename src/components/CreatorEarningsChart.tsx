"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatMoney } from "@/lib/price-utils";
import { cn } from "@/lib/utils";

export interface CreatorEarningsPoint {
  /** YYYY-MM-DD (IST) */
  day: string;
  /** Creator share in paise */
  net: number;
  /** Completed orders */
  count: number;
}

type Range = "7d" | "30d";
type Metric = "net" | "count";

const chartConfig = {
  net: { label: "Earnings", color: "var(--foreground)" },
  count: { label: "Orders", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

const dayLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const labelFor = (day: string) => dayLabel.format(new Date(`${day}T00:00:00Z`));

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-[10px] bg-secondary p-0.5">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-8 rounded-lg px-3 text-[13px] transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "bg-card font-medium text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function CreatorEarningsChart({ series }: { series: CreatorEarningsPoint[] }) {
  const [range, setRange] = useState<Range>("30d");
  const [metric, setMetric] = useState<Metric>("net");

  const data = useMemo(() => {
    const slice = range === "7d" ? series.slice(-7) : series;
    return slice.map((p) => ({ ...p, label: labelFor(p.day) }));
  }, [series, range]);

  const totals = useMemo(
    () => data.reduce((acc, p) => ({ net: acc.net + p.net, count: acc.count + p.count }), { net: 0, count: 0 }),
    [data]
  );

  const hasData = totals.count > 0;

  return (
    <section aria-labelledby="earnings-chart-title" className="rounded-2xl border border-border bg-card">
      <div className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="space-y-0.5">
          <h2 id="earnings-chart-title" className="text-sm font-semibold text-foreground">
            Sales performance
          </h2>
          <p className="text-xs text-muted-foreground">
            <span className="tabular font-medium text-foreground">{formatMoney(totals.net)}</span> earned from{" "}
            <span className="tabular font-medium text-foreground">{totals.count}</span>{" "}
            {totals.count === 1 ? "order" : "orders"} in the last {range === "7d" ? "7" : "30"} days
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Metric"
            value={metric}
            onChange={setMetric}
            options={[
              { value: "net", label: "Earnings" },
              { value: "count", label: "Orders" },
            ]}
          />
          <Segmented
            label="Range"
            value={range}
            onChange={setRange}
            options={[
              { value: "7d", label: "7 days" },
              { value: "30d", label: "30 days" },
            ]}
          />
        </div>
      </div>

      <div className="px-2 pt-4 pb-2 sm:px-4">
        {hasData ? (
          <ChartContainer config={chartConfig} className="aspect-auto h-60 w-full">
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={16}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                width={metric === "net" ? 56 : 28}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickFormatter={(v: number) => (metric === "net" ? formatMoney(v) : String(v))}
              />
              <ChartTooltip
                cursor={{ fill: "var(--secondary)" }}
                content={
                  <ChartTooltipContent
                    hideIndicator
                    formatter={(value) => (
                      <span className="tabular font-medium text-foreground">
                        {metric === "net"
                          ? formatMoney(Number(value))
                          : `${value} ${Number(value) === 1 ? "order" : "orders"}`}
                      </span>
                    )}
                  />
                }
              />
              <Bar dataKey={metric} fill={`var(--color-${metric})`} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex h-60 flex-col items-center justify-center px-6 text-center">
            <p className="text-sm font-medium text-foreground">No sales in this period</p>
            <p className="mt-1 max-w-[40ch] text-sm text-muted-foreground">
              Completed orders appear here, grouped by day.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
