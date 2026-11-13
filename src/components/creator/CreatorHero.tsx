import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney, formatPrice } from "@/lib/price-utils";

export type ShowcaseProduct = {
  title: string;
  slug: string;
  thumbnail: string | null;
  price: number;
  isFree: boolean;
  category: string;
};

const TERMS = ["95% of direct sales", "No listing or monthly fees", "Automated delivery", "You keep 100% of your IP"];

/** Worked example of the 95/5 split on a ₹2,499 sale. Arithmetic, not a claim. */
function SplitExample() {
  const sale = 249900;
  const fee = Math.round(sale * 0.05);
  return (
    <figure className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <figcaption className="text-sm text-muted-foreground">Example: one sale of a ₹2,499 starter kit</figcaption>
      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">Buyer pays</dt>
          <dd className="tabular text-foreground">{formatMoney(sale)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">Platform fee (5%)</dt>
          <dd className="tabular text-muted-foreground">−{formatMoney(fee)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
          <dt className="font-medium text-foreground">Lands in your bank</dt>
          <dd className="tabular font-display text-3xl text-foreground">{formatMoney(sale - fee)}</dd>
        </div>
      </dl>
    </figure>
  );
}

function Showcase({ items }: { items: ShowcaseProduct[] }) {
  return (
    <figure>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4">
        {items.map((p, i) => {
          const free = p.isFree || p.price <= 0;
          return (
            <li key={p.slug} className={i % 2 === 1 ? "sm:translate-y-6" : undefined}>
              <Link
                href={`/products/${p.slug}`}
                className="group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <div className="overflow-hidden rounded-xl bg-secondary">
                  { }
                  <img
                    src={p.thumbnail ?? ""}
                    alt=""
                    width={480}
                    height={300}
                    loading={i < 2 ? "eager" : "lazy"}
                    decoding="async"
                    className="aspect-[16/10] w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium text-foreground">{p.title}</p>
                  <p className={`tabular shrink-0 text-sm ${free ? "text-success" : "text-foreground"}`}>
                    {free ? "Free" : formatPrice(p.price)}
                  </p>
                </div>
                <p className="truncate text-xs text-muted-foreground capitalize">{p.category}</p>
              </Link>
            </li>
          );
        })}
      </ul>
      <figcaption className="mt-8 text-xs text-muted-foreground sm:mt-10">Listed on Scriptly by independent developers.</figcaption>
    </figure>
  );
}

export default function CreatorHero({
  isLoggedIn = false,
  userName,
  showcase = [],
}: {
  isLoggedIn?: boolean;
  userName?: string | null;
  showcase?: ShowcaseProduct[];
}) {
  const startHref = isLoggedIn ? "/creator/new" : "/handler/sign-in?redirectTo=/creator/new";

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 pt-10 pb-16 sm:px-6 md:pt-16 md:pb-24 lg:px-8">
        {isLoggedIn ? (
          <div className="mb-10 flex flex-col gap-3 border-b border-border pb-4 text-sm sm:flex-row sm:items-center sm:justify-between md:mb-14">
            <p className="text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{userName || "Creator"}</span>. Your creator
              console is ready.
            </p>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/creator/dashboard">Open dashboard</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/creator/new">New product</Link>
              </Button>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <h1 className="font-display text-5xl leading-[1.02] tracking-[-0.03em] text-balance text-foreground sm:text-6xl md:text-7xl">
              You built it.
              <br />
              <em className="italic">Now sell it.</em>
            </h1>
            <p className="mt-6 max-w-[52ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
              Turn your boilerplates, automations, UI kits and dev scripts into products other engineers pay for. Keep{" "}
              <strong className="font-medium text-foreground">95% of direct sales</strong>, with no listing or monthly
              fees.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="accent" size="xl" className="w-full sm:w-auto">
                <Link href={startHref}>
                  Start selling, free <ArrowRight strokeWidth={1.75} />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="w-full sm:w-auto">
                <a href="#calculator">Estimate your earnings</a>
              </Button>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {TERMS.map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span aria-hidden className="size-1 rounded-full bg-muted-foreground" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-6">
            {showcase.length >= 2 ? <Showcase items={showcase.slice(0, showcase.length >= 4 ? 4 : 2)} /> : <SplitExample />}
          </div>
        </div>
      </div>
    </section>
  );
}
