import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

const POLICIES = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund", label: "Cancellation & Refund" },
  { href: "/shipping", label: "Shipping & Delivery" },
  { href: "/licenses", label: "Product Licenses" },
  { href: "/dmca", label: "DMCA Copyright" },
  { href: "/trust", label: "Trust & Security" },
];

/** Typography for policy prose: one place, scoped by class, no globals. */
export const legalProse =
  "text-[1.0625rem] leading-[1.75] text-foreground/85 " +
  "[&_p]:my-4 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_li]:pl-1 [&_li]:marker:text-muted-foreground " +
  "[&_strong]:font-semibold [&_strong]:text-foreground " +
  "[&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/40 [&_a:hover]:decoration-primary";

interface LegalDocumentProps {
  /** Path of the current page, used to mark it in the policy list. */
  path: string;
  title: string;
  /** e.g. "Last updated June 13, 2026" */
  updated: string;
  intro?: ReactNode;
  sections: LegalSection[];
  /** Closing contact block content. */
  contact: ReactNode;
}

export function LegalDocument({ path, title, updated, intro, sections, contact }: LegalDocumentProps) {
  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
        {/* Sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-10 text-sm">
            {sections.length > 2 && (
              <nav aria-label="On this page">
                <h2 className="font-medium text-foreground">On this page</h2>
                <ol className="mt-3 space-y-2">
                  {sections.map((s) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`} className="block text-muted-foreground transition-colors hover:text-foreground">
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            <nav aria-label="Policies">
              <h2 className="font-medium text-foreground">Policies</h2>
              <ul className="mt-3 space-y-2">
                {POLICIES.map((p) => (
                  <li key={p.href}>
                    <Link
                      href={p.href}
                      aria-current={p.href === path ? "page" : undefined}
                      className={cn(
                        "block transition-colors",
                        p.href === path ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {p.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>

        {/* Document */}
        <article className="min-w-0 max-w-[68ch]">
          <header className="border-b border-border pb-8">
            <h1 className="font-display text-3xl md:text-5xl leading-[1.1] text-foreground">{title}</h1>
            <p className="mt-4 text-sm text-muted-foreground">{updated}</p>
            {intro && <div className="mt-6 text-lg leading-relaxed text-muted-foreground">{intro}</div>}
          </header>

          <div className={legalProse}>
            {sections.map((s) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-24 pt-10">
                <h2 id={`${s.id}-title`} className="font-display text-2xl leading-tight text-foreground">
                  {s.title}
                </h2>
                {s.body}
              </section>
            ))}
          </div>

          <footer className="mt-14 border-t border-border pt-8 text-sm leading-relaxed text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline [&_p+p]:mt-2">
            {contact}
          </footer>

          {/* Policy list on small screens */}
          <nav aria-label="Policies" className="mt-12 lg:hidden">
            <h2 className="text-sm font-medium text-foreground">Other policies</h2>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {POLICIES.filter((p) => p.href !== path).map((p) => (
                <li key={p.href}>
                  <Link href={p.href} className="text-muted-foreground transition-colors hover:text-foreground">
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </article>
      </div>
    </div>
  );
}

export const REGISTERED_OFFICE = "Strivio Inc., DLF Phase 3, Sector 24, Gurugram, Haryana - 122002, India.";
