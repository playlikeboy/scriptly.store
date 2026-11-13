import { Check, X } from "lucide-react";

const RAW = [
  "Default README with generic create-next-app text.",
  "Hardcoded keys or secrets, and no environment documentation.",
  "No live preview or video showing it running.",
  "Tangled dependencies without a tested lockfile.",
  "An ambiguous licence that leaves buyers unsure about commercial use.",
];

const PRODUCT: React.ReactNode[] = [
  "A clear README with a three-minute quickstart and architecture overview.",
  <>
    A clean <code className="font-mono text-[0.85em] text-foreground">.env.example</code> with descriptive placeholders.
  </>,
  "A working live demo so buyers can try it first.",
  <>
    A tested lockfile (<code className="font-mono text-[0.85em] text-foreground">bun.lockb</code>) that installs cleanly.
  </>,
  "Explicit single-seat or team licensing.",
];

export default function CreatorPackagingGuide() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="max-w-[44rem]">
          <h2 className="font-display text-3xl leading-tight tracking-[-0.02em] text-balance text-foreground md:text-4xl">
            The difference between code and a product
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Engineers don’t buy syntax, they buy time saved. Clean packaging turns a side project into an asset that
            commands ₹2,500 or more.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <h3 className="border-b border-border pb-3 text-base font-medium text-muted-foreground">A raw code dump</h3>
            <ul className="mt-4 space-y-3">
              {RAW.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                  <X aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" strokeWidth={1.75} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="border-b border-foreground pb-3 text-base font-medium text-foreground">
              A product developers pay for
            </h3>
            <ul className="mt-4 space-y-3">
              {PRODUCT.map((item, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-foreground">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={1.75} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <p className="text-sm font-medium text-foreground">Packaging takes less than 20 minutes</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Zip your repo, leave out <code className="font-mono text-[0.85em] text-foreground">node_modules</code> and{" "}
            <code className="font-mono text-[0.85em] text-foreground">.next</code>, and you’re ready to publish.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-[10px] bg-secondary px-4 py-3 font-mono text-[13px] text-foreground">
            <code>zip -r product.zip . -x &quot;node_modules/*&quot; &quot;.git/*&quot; &quot;.next/*&quot;</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
