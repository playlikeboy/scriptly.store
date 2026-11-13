import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

/**
 * Shared frame for hosted payment pages (/pay and /pay/[slug]).
 * The global navbar/footer already carry the brand; this only adds
 * a quiet return path and the trust context for the checkout card.
 */
export default function PayShell({
  children,
  verified = false,
}: {
  children: React.ReactNode;
  verified?: boolean;
}) {
  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto flex min-h-[70vh] max-w-5xl flex-col px-4 py-6 sm:px-6 md:py-10">
        <div className="flex items-center justify-between gap-3 text-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden="true" />
            Back to store
          </Link>
          {verified && (
            <span className="inline-flex items-center gap-1.5 text-success">
              <ShieldCheck className="size-4" strokeWidth={1.75} aria-hidden="true" />
              Cryptographically verified link
            </span>
          )}
        </div>

        <div className="flex flex-1 items-center justify-center py-8 md:py-12">{children}</div>

        <p className="text-center text-xs text-muted-foreground">
          Secure, verified checkout powered by Razorpay and ScriptlyStore.
        </p>
      </div>
    </div>
  );
}
