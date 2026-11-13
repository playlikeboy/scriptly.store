import Link from "next/link";
import { FOOTER_NAVIGATION, type NavItem } from "@/config/navigation";
import { siteConfig } from "@/config/site";

const COLUMNS: { title: string; items: NavItem[] }[] = [
  { title: "Marketplace", items: FOOTER_NAVIGATION.marketplace },
  { title: "Creators", items: FOOTER_NAVIGATION.creators },
  { title: "Learn", items: FOOTER_NAVIGATION.learn },
  { title: "Company", items: FOOTER_NAVIGATION.company },
  { title: "Legal", items: FOOTER_NAVIGATION.legal },
];

const linkClass =
  "rounded-sm text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";

function FooterLink({ item }: { item: NavItem }) {
  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {item.label}
      </a>
    );
  }
  return (
    <Link href={item.href} className={linkClass}>
      {item.label}
    </Link>
  );
}

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-7">
          <div className="col-span-2 sm:col-span-3 lg:col-span-2 lg:pr-8">
            <Link
              href="/"
              aria-label="Scriptly.store home"
              className="inline-block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="font-display text-2xl font-semibold tracking-[-0.02em] text-foreground">
                Scriptly<span className="text-muted-foreground">.store</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              The marketplace for software you can build on. Production-ready templates, scripts and
              developer tools, delivered instantly with full source code.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Creators keep 95% of direct sales.{" "}
              <Link href="/creator" className="font-medium text-foreground underline-offset-4 hover:underline">
                Start selling
              </Link>
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-sm font-medium text-foreground">{column.title}</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {column.items.map((item) => (
                  <li key={`${column.title}-${item.href}-${item.label}`}>
                    <FooterLink item={item} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. Prices in US dollars, charged in INR via Razorpay.
          </p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <li>
              <a href={siteConfig.social.github} target="_blank" rel="noopener noreferrer" className={linkClass}>
                GitHub
              </a>
            </li>
            <li>
              <a href={siteConfig.social.twitter} target="_blank" rel="noopener noreferrer" className={linkClass}>
                X (Twitter)
              </a>
            </li>
            <li>
              <a href={`mailto:${siteConfig.supportEmail}`} className={linkClass}>
                {siteConfig.supportEmail}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
