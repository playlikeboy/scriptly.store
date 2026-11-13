import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Page header                                                                */
/* -------------------------------------------------------------------------- */

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 max-w-2xl">
        <h1 className="font-display text-3xl text-balance text-foreground md:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-2 text-sm text-pretty text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div> : null}
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Panel: one bordered surface. Never nest another bordered box inside.       */
/* -------------------------------------------------------------------------- */

export function AdminPanel({
  title,
  description,
  actions,
  children,
  className,
  id,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("min-w-0 overflow-hidden rounded-2xl border border-border bg-card", className)}>
      {title ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Status text: dot + label, tokens only                                      */
/* -------------------------------------------------------------------------- */

export type StatusTone = "success" | "neutral" | "attention" | "danger";

const toneText: Record<StatusTone, string> = {
  success: "text-success",
  neutral: "text-muted-foreground",
  attention: "text-primary",
  danger: "text-destructive",
};

const toneDot: Record<StatusTone, string> = {
  success: "bg-success",
  neutral: "bg-muted-foreground/60",
  attention: "bg-primary",
  danger: "bg-destructive",
};

export function StatusText({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap", toneText[tone], className)}>
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", toneDot[tone])} />
      {children}
    </span>
  );
}

export function orderStatusTone(status: string): StatusTone {
  if (status === "completed") return "success";
  if (status === "pending") return "neutral";
  return "danger";
}

/* -------------------------------------------------------------------------- */
/* Empty state                                                                */
/* -------------------------------------------------------------------------- */

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      {Icon ? <Icon aria-hidden="true" strokeWidth={1.75} className="mb-3 size-5 text-muted-foreground" /> : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-pretty text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Ledger strip: compact figures for an operator, not a hero metric          */
/* -------------------------------------------------------------------------- */

export function AdminFigures({
  items,
  className,
}: {
  items: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "default" | "attention" }[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border",
        items.length >= 4 ? "lg:grid-cols-4" : "sm:grid-cols-3",
        items.length === 5 && "lg:grid-cols-5",
        className
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0 bg-card px-4 py-3.5 sm:px-5">
          <dt className="truncate text-xs text-muted-foreground">{item.label}</dt>
          <dd
            className={cn(
              "mt-1 truncate text-xl font-semibold tracking-tight tabular-nums",
              item.tone === "attention" ? "text-primary" : "text-foreground"
            )}
          >
            {item.value}
          </dd>
          {item.hint ? <dd className="mt-0.5 truncate text-xs text-muted-foreground">{item.hint}</dd> : null}
        </div>
      ))}
    </dl>
  );
}

/* -------------------------------------------------------------------------- */
/* Filter tabs (links, server-renderable)                                    */
/* -------------------------------------------------------------------------- */

export function AdminFilterTabs({
  label,
  tabs,
}: {
  label: string;
  tabs: { href: string; label: string; count?: number; active: boolean }[];
}) {
  return (
    <nav aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 scrollbar-none">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          scroll={false}
          aria-current={tab.active ? "page" : undefined}
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring",
            tab.active
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          {tab.label}
          {typeof tab.count === "number" ? (
            <span className={cn("tabular-nums", tab.active ? "text-background/70" : "text-muted-foreground")}>
              {tab.count.toLocaleString("en-IN")}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* Pager (links)                                                              */
/* -------------------------------------------------------------------------- */

function pageWindow(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  return Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
}

export function buildHref(basePath: string, params: Record<string, string | undefined>, overrides: Record<string, string | undefined>) {
  const merged: Record<string, string | undefined> = { ...params, ...overrides };
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined && value !== "") search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function AdminPager({
  basePath,
  params,
  pageKey = "page",
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  noun = "results",
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  pageKey?: string;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  noun?: string;
}) {
  if (totalCount === 0) return null;
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);
  const href = (page: number) => buildHref(basePath, params, { [pageKey]: page > 1 ? String(page) : undefined });
  const pages = pageWindow(currentPage, totalPages);
  const linkBase =
    "inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg px-2 text-[13px] font-medium tabular-nums transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-xs text-muted-foreground tabular-nums">
        {start.toLocaleString("en-IN")}–{end.toLocaleString("en-IN")} of {totalCount.toLocaleString("en-IN")} {noun}
      </p>
      {totalPages > 1 ? (
        <nav aria-label="Pagination" className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {currentPage > 1 ? (
            <Link href={href(currentPage - 1)} scroll={false} className={cn(linkBase, "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
              <ChevronLeft className="size-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Previous</span>
            </Link>
          ) : (
            <span aria-disabled="true" className={cn(linkBase, "text-muted-foreground/50")}>
              <ChevronLeft className="size-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Previous</span>
            </span>
          )}
          {pages.map((page, index) => {
            const gap = index > 0 && page - pages[index - 1] > 1;
            const active = page === currentPage;
            return (
              <span key={page} className="contents">
                {gap ? <span aria-hidden="true" className="px-1 text-xs text-muted-foreground">…</span> : null}
                <Link
                  href={href(page)}
                  scroll={false}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    linkBase,
                    active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  {page}
                </Link>
              </span>
            );
          })}
          {currentPage < totalPages ? (
            <Link href={href(currentPage + 1)} scroll={false} className={cn(linkBase, "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
              <span className="sr-only sm:not-sr-only">Next</span>
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <span aria-disabled="true" className={cn(linkBase, "text-muted-foreground/50")}>
              <span className="sr-only sm:not-sr-only">Next</span>
              <ChevronRight className="size-4" aria-hidden="true" />
            </span>
          )}
        </nav>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared table cell classes                                                  */
/* -------------------------------------------------------------------------- */

export const th = "h-10 px-4 text-left align-middle text-xs font-medium whitespace-nowrap text-muted-foreground first:pl-4 sm:first:pl-5 last:pr-4 sm:last:pr-5";
export const td = "px-4 py-3 align-middle first:pl-4 sm:first:pl-5 last:pr-4 sm:last:pr-5";

export function formatAdminDate(value: Date | string, withTime = false) {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  if (!withTime) return day;
  const time = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(date);
  return `${day}, ${time}`;
}

export function parsePage(value: string | undefined) {
  const n = parseInt(value || "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
