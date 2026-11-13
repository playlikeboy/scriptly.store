import { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Razorpay Route Splits Developer Guide | ScriptlyStore Docs",
  description:
    "Comprehensive architectural guide on how ScriptlyStore dynamically splits multi-party vendor transactions using Razorpay Route.",
  alternates: {
    canonical: "https://scriptly.store/docs/route-guide",
  },
};

const SUMMARY = [
  {
    title: "95% creator share",
    body: "ScriptlyStore maintains a builder-first pricing structure. You keep 95% of every transaction, with only a 5% flat platform charge.",
  },
  {
    title: "Instant routing",
    body: "Say goodbye to monthly holdbacks. When customer checkouts are processed, your splits are automatically routed directly into your bank.",
  },
  {
    title: "Secure escrow",
    body: "Transactions are managed under Razorpay's RBI-compliant nodal account mechanism, guaranteeing complete financial security.",
  },
];

const TOC = [
  { id: "creators", title: "For creators" },
  { id: "buyers", title: "For buyers" },
  { id: "admins", title: "For admins" },
];

function C({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">{children}</code>
  );
}

function B({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}

function Step({ marker, title, children }: { marker: string; title: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 border-t border-border py-5">
      <span className="font-display text-xl leading-7 text-muted-foreground tabular" aria-hidden="true">{marker}</span>
      <div>
        <h4 className="text-base font-semibold text-foreground">{title}</h4>
        <div className="mt-1.5 text-base leading-relaxed text-muted-foreground">{children}</div>
      </div>
    </li>
  );
}

function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="mt-6 rounded-xl bg-secondary px-5 py-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </aside>
  );
}

export default function RouteGuidePage() {
  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
        <aside className="hidden lg:block">
          <nav aria-label="On this page" className="sticky top-24 text-sm">
            <h2 className="font-medium text-foreground">On this page</h2>
            <ol className="mt-3 space-y-2">
              {TOC.map((t) => (
                <li key={t.id}>
                  <a href={`#${t.id}`} className="block text-muted-foreground transition-colors hover:text-foreground">
                    {t.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="min-w-0 max-w-[72ch]">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden="true" />
            Back to marketplace
          </Link>

          <header className="mt-8 border-b border-border pb-8">
            <h1 className="font-display text-3xl md:text-5xl leading-[1.1] text-foreground">Razorpay Route splits</h1>
            <p className="mt-2 text-base text-muted-foreground">Developer & user guide</p>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Learn how ScriptlyStore uses Razorpay Route to dynamically split customer checkout payments instantly.
              Read instructions for creators, buyers, and administrators.
            </p>

            <dl className="mt-8 grid gap-6 sm:grid-cols-3">
              {SUMMARY.map((s) => (
                <div key={s.title}>
                  <dt className="text-base font-semibold text-foreground">{s.title}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</dd>
                </div>
              ))}
            </dl>

            {/* Jump links on small screens */}
            <nav aria-label="Sections" className="mt-8 lg:hidden">
              <ul className="flex flex-wrap gap-2">
                {TOC.map((t) => (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      className="inline-flex h-8 items-center rounded-full bg-secondary px-3 text-sm text-foreground transition-colors hover:bg-secondary/70"
                    >
                      {t.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </header>

          {/* Creators */}
          <section id="creators" aria-labelledby="creators-title" className="scroll-mt-24 pt-12">
            <h2 id="creators-title" className="font-display text-2xl text-foreground">For creators</h2>
            <h3 className="mt-2 text-lg font-semibold text-foreground">Onboarding &amp; direct payout settings</h3>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              By leveraging <B>Razorpay Route</B>, ScriptlyStore has enabled a decentralized payout experience.
              Instead of waiting for platform thresholds, earnings are split instantly during customer checkout.
              Follow these simple steps to activate instant direct-bank payouts for your store.
            </p>

            <ol className="mt-6 border-b border-border">
              <Step marker="1" title="Submit bank account details">
                Go to your{" "}
                <Link href="/creator" className="text-primary underline decoration-primary/40 hover:decoration-primary">Creator Console</Link>{" "}
                and find the <B>Payout &amp; Split Settings</B> editor. Select <B>Direct Bank (via Razorpay Route)</B> as your payout method. Fill in your Bank Name, Beneficiary Name, Account Number, and IFSC Code accurately.
              </Step>
              <Step marker="2" title="Verification & account ID creation">
                Once submitted, our administrators review your details and initiate sub-merchant account creation. Your store gets linked with a unique <B>Razorpay Linked Account ID</B> (e.g. <C>acc_Hsb82sJdh7s</C>). You can track this status directly inside your creator console settings.
              </Step>
              <Step marker="3" title="Automatic splits">
                Whenever a buyer purchases your script, the system calculates the equivalent INR amount. It builds a checkout routing payload: 95% of your product price is transferred to your bank, while the platform collects a 5% commission. Payout releases are processed based on standard banking settlement cycles (typically T+2 business days).
              </Step>
            </ol>

            <Note title="Important KYC compliance details">
              Because payments are processed directly via banking partners, Razorpay requires that you comply with standard regulations. If the API automation returns compliance alerts, our administration will reach out to gather manual KYC details (like business name, address, or tax registration) to complete your account setup via the Razorpay dashboard.
            </Note>
          </section>

          {/* Buyers */}
          <section id="buyers" aria-labelledby="buyers-title" className="scroll-mt-24 pt-14">
            <h2 id="buyers-title" className="font-display text-2xl text-foreground">For buyers</h2>
            <h3 className="mt-2 text-lg font-semibold text-foreground">Secure checkout &amp; instant delivery</h3>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              ScriptlyStore secures your transactions using enterprise-grade gateways.
              When checking out on our platform, here is what you can expect as a buyer:
            </p>

            <dl className="mt-6 divide-y divide-border border-y border-border">
              <div className="py-5">
                <dt className="text-base font-semibold text-foreground">PCI-DSS compliant payments</dt>
                <dd className="mt-1.5 text-base leading-relaxed text-muted-foreground">
                  Your payments are fully handled via <B>Razorpay International</B>. Card details, net banking credentials, and UPI codes are never stored on ScriptlyStore servers. Your checkout process is protected with end-to-end SSL encryption.
                </dd>
              </div>
              <div className="py-5">
                <dt className="text-base font-semibold text-foreground">Instant access &amp; account setup</dt>
                <dd className="mt-1.5 text-base leading-relaxed text-muted-foreground">
                  Immediately upon successful checkout, you are redirected back to your customer dashboard. Your digital file downloads are unlocked instantly. If you are a new customer, a secure buyer account is automatically created using your checkout email.
                </dd>
              </div>
              <div className="py-5">
                <dt className="text-base font-semibold text-foreground">Clear licenses</dt>
                <dd className="mt-1.5 text-base leading-relaxed text-muted-foreground">
                  Every code boilerplate, script, or prompt package you purchase comes with either a Standard or Commercial license. Review license limits on the{" "}
                  <Link href="/licenses" className="text-primary underline decoration-primary/40 hover:decoration-primary">licenses page</Link>. As all items are downloadable digital assets, checkouts are final and non-refundable unless corrupt files are verified.
                </dd>
              </div>
            </dl>
          </section>

          {/* Admins */}
          <section id="admins" aria-labelledby="admins-title" className="scroll-mt-24 pt-14">
            <h2 id="admins-title" className="font-display text-2xl text-foreground">For admins</h2>
            <h3 className="mt-2 text-lg font-semibold text-foreground">Administrative routing onboarding fallback</h3>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              For ScriptlyStore moderators, onboarding creators onto Razorpay Route can be completed using a hybrid automated or manual model.
            </p>

            <ol className="mt-6 border-b border-border">
              <Step marker="A" title="Automated API onboarding (one-click)">
                Navigate to <C>/admin/stores</C>. If a creator has saved their bank details, you will see an <B>Auto Route Onboard</B> button. Clicking this triggers the Razorpay Route Accounts API (<C>POST /v2/accounts</C>). It registers their email, business name, and bank details, automatically fetching and assigning a verified Linked Account ID (<C>acc_...</C>).
              </Step>
              <Step marker="B" title="Manual dashboard onboarding fallback">
                <p>If the automated API request fails (due to regulatory warnings or complex business types):</p>
                <ol className="mt-3 list-decimal space-y-1.5 pl-5 marker:text-muted-foreground">
                  <li>Log into the official <B>Razorpay Dashboard</B>.</li>
                  <li>Go to <B>Route &gt; Linked Accounts</B> and click <B>Add Account</B>.</li>
                  <li>Fill out the creator&apos;s bank details manually and save to generate an Account ID.</li>
                  <li>Copy the resulting <C>acc_...</C> ID.</li>
                  <li>Paste it in the creator&apos;s record on <C>/admin/stores</C> and click <B>Save</B> (disk icon).</li>
                </ol>
              </Step>
            </ol>

            <Note title="Developer sandbox notice">
              When testing under sandbox mode (<C>rzp_test_...</C> key prefix), Razorpay will mock all Route transfers. The server action automatically identifies mock credentials, generating virtual checkouts and logging test payouts to ensure seamless end-to-end flow evaluation.
            </Note>
          </section>

          <div className="mt-16 border-t border-border pt-8">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden="true" />
              Back to marketplace home
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
