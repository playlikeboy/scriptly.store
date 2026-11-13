import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared primitives for the creator + affiliate consoles (Operate-tool surfaces).
 * Server-safe: no hooks, no "use client".
 */

export const fieldClass =
  "h-10 w-full min-w-0 rounded-[10px] border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors outline-none hover:border-foreground/25 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/15";

export const textareaClass = cn(fieldClass, "h-auto py-2.5 leading-relaxed");

export const selectClass = cn(fieldClass, "cursor-pointer pr-8");

export const labelClass = "text-sm font-medium text-foreground";

export const hintClass = "text-xs leading-relaxed text-muted-foreground";

export const errorTextClass = "text-xs font-medium text-destructive";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export function formatDate(value: Date | string) {
  return dateFormatter.format(new Date(value));
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <h1 className="font-display text-3xl leading-tight tracking-[-0.02em] text-foreground md:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-[60ch] text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card", className)}>
      {title ? (
        <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3.5 sm:px-5">
          <div className="min-w-0 space-y-0.5">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={cn(bodyClassName)}>{children}</div>
    </section>
  );
}

type Tone = "success" | "neutral" | "destructive" | "primary";

const toneClass: Record<Tone, string> = {
  success: "bg-success/10 text-success",
  neutral: "bg-secondary text-muted-foreground",
  destructive: "bg-destructive/10 text-destructive",
  primary: "bg-primary/10 text-primary",
};

export function StatusPill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        toneClass[tone]
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-[42ch] text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** Compact metric strip: one bordered surface, hairline-divided cells. */
export function StatStrip({
  items,
}: {
  items: { label: string; value: ReactNode; hint?: ReactNode }[];
}) {
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-4">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            "space-y-1 p-4 sm:p-5",
            i % 2 === 1 && "border-l border-border",
            i >= 2 && "border-t border-border lg:border-t-0",
            i === 2 && "lg:border-l"
          )}
        >
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="tabular text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {item.value}
          </dd>
          {item.hint ? <dd className="text-xs text-muted-foreground">{item.hint}</dd> : null}
        </div>
      ))}
    </dl>
  );
}

export const tableHeadClass =
  "h-10 px-4 text-left text-xs font-medium text-muted-foreground whitespace-nowrap first:pl-4 sm:first:pl-5 last:pr-4 sm:last:pr-5";
export const tableCellClass =
  "px-4 py-3 align-middle first:pl-4 sm:first:pl-5 last:pr-4 sm:last:pr-5";
