"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export interface AffiliateDailyPoint {
  /** YYYY-MM-DD (IST) */
  day: string;
  clicks: number;
  sales: number;
}

const chartConfig = {
  clicks: { label: "Clicks", color: "var(--muted-foreground)" },
  sales: { label: "Sales", color: "var(--foreground)" },
} satisfies ChartConfig;

const dayLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Click + conversion timeline. All numbers are aggregated in SQL on the server;
 * this leaf only renders them.
 */
export default function AffiliateDashboardClient({ series }: { series: AffiliateDailyPoint[] }) {
  const data = series.map((p) => ({ ...p, label: dayLabel.format(new Date(`${p.day}T00:00:00Z`)) }));
  const hasData = series.some((p) => p.clicks > 0 || p.sales > 0);

  if (!hasData) {
    return (
      <div className="flex h-60 flex-col items-center justify-center px-6 text-center">
        <p className="text-sm font-medium text-foreground">No activity in the last 14 days</p>
        <p className="mt-1 max-w-[40ch] text-sm text-muted-foreground">
          Clicks and sales from your referral links appear here, grouped by day.
        </p>
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-60 w-full">
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={2}>
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
          width={28}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <ChartTooltip cursor={{ fill: "var(--secondary)" }} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="clicks" fill="var(--color-clicks)" fillOpacity={0.35} radius={[3, 3, 0, 0]} maxBarSize={18} />
        <Bar dataKey="sales" fill="var(--color-sales)" radius={[3, 3, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ChartContainer>
  );
}
