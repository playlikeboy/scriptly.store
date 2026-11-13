import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CreatorFinalCTA({
  isLoggedIn = false,
}: {
  isLoggedIn?: boolean;
}) {
  return (
    <section>
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 md:py-28 lg:px-8">
        <h2 className="font-display text-4xl leading-[1.08] tracking-[-0.03em] text-balance text-foreground md:text-6xl">
          Your next customer is searching for code you’ve already written.
        </h2>
        <p className="mx-auto mt-6 max-w-[56ch] text-base leading-relaxed text-muted-foreground">
          Don’t wait for the project to be perfect. Package what works, list it on Scriptly, and turn your engineering
          hours into recurring income.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild variant="accent" size="xl" className="w-full sm:w-auto">
            <Link href={isLoggedIn ? "/creator/new" : "/handler/sign-in?redirectTo=/creator/new"}>
              Open your creator store <ArrowRight strokeWidth={1.75} />
            </Link>
          </Button>
          <Button asChild variant="outline" size="xl" className="w-full sm:w-auto">
            <Link href="/explore">Browse the marketplace</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
