import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FinalCTA() {
  return (
    <section aria-labelledby="home-cta-title" className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2
            id="home-cta-title"
            className="font-display text-4xl leading-[1.08] font-medium tracking-[-0.03em] text-balance text-foreground md:text-5xl"
          >
            Your next product shouldn&apos;t start from zero.
          </h2>
          <p className="mx-auto mt-5 max-w-[52ch] text-base leading-relaxed text-muted-foreground md:text-lg">
            Find the codebase, UI system or automation you need. Or sell what you have already built and
            keep 95% of direct sales.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/explore">
                Explore the catalogue
                <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/creator">Sell on Scriptly</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
