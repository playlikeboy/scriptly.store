import { Metadata } from "next";
import { db } from "@/db";
import { orders, products } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CircleCheck, Download, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOrCreateDbUser } from "@/lib/auth-utils";
import { formatMoney } from "@/lib/price-utils";

export const metadata: Metadata = {
  title: "Purchase Successful",
  description: "Your purchase was successful! Download your files from your ScriptlyStore dashboard.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    orderId?: string;
  }>;
}

const formatAmount = (paise: number) => (paise <= 0 ? "Free" : formatMoney(paise));

export default async function PurchaseSuccessPage({ searchParams }: PageProps) {
  const { orderId } = await searchParams;

  if (!orderId) {
    redirect("/");
  }

  const user = await getOrCreateDbUser();
  if (!user) {
    redirect(`/handler/sign-in?redirectTo=${encodeURIComponent(`/purchase-success?orderId=${orderId}`)}`);
  }

  const [anchor] = await db
    .select({
      userId: orders.userId,
      status: orders.status,
      razorpayOrderId: orders.razorpayOrderId,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  // Receipts are private: only the buyer (or an admin) may view them.
  if (!anchor || anchor.status !== "completed" || (anchor.userId !== user.id && user.role !== "admin")) {
    redirect("/dashboard");
  }

  // A cart checkout creates one order row per product under the same gateway order.
  const lineItems = await db
    .select({
      orderId: orders.id,
      amount: orders.amount,
      paymentId: orders.razorpayPaymentId,
      addOnEditCopy: orders.addOnEditCopy,
      addOnSetupDeploy: orders.addOnSetupDeploy,
      product: {
        id: products.id,
        title: products.title,
        slug: products.slug,
        price: products.price,
      },
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .where(
      anchor.razorpayOrderId
        ? and(
            eq(orders.razorpayOrderId, anchor.razorpayOrderId),
            eq(orders.userId, anchor.userId),
            eq(orders.status, "completed")
          )
        : eq(orders.id, orderId)
    )
    .orderBy(asc(orders.createdAt));

  if (lineItems.length === 0) {
    redirect("/dashboard");
  }

  const totalPaid = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const paymentId = lineItems[0].paymentId;
  const isMulti = lineItems.length > 1;

  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 md:py-20">
        <CircleCheck className="size-8 text-success" strokeWidth={1.75} aria-hidden="true" />
        <h1 className="mt-5 font-display text-3xl text-foreground md:text-4xl">Purchase confirmed</h1>
        <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
          Your payment has been processed and your digital assets are ready for download.
        </p>

        <section aria-labelledby="receipt-heading" className="mt-10 rounded-2xl border border-border bg-card">
          <h2 id="receipt-heading" className="sr-only">
            Transaction receipt
          </h2>
          <ul className="divide-y divide-border">
            {lineItems.map((item) => {
              const editCopyPrice = item.addOnEditCopy ? Math.round(item.product.price / 3) : 0;
              const setupDeployPrice = item.addOnSetupDeploy ? Math.round(item.product.price / 3) : 0;
              const baseProductPaid = item.amount - editCopyPrice - setupDeployPrice;

              return (
                <li key={item.orderId} className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                    <div className="min-w-0">
                      <Link
                        href={`/products/${item.product.slug}`}
                        className="font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {item.product.title}
                      </Link>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        Order {item.orderId.slice(0, 12).toUpperCase()}
                      </p>
                    </div>
                    <Button asChild size="sm">
                      <a href={`/api/download/${item.product.id}`}>
                        <Download strokeWidth={1.75} aria-hidden="true" />
                        Download
                      </a>
                    </Button>
                  </div>

                  {(item.addOnEditCopy || item.addOnSetupDeploy) && (
                    <dl className="mt-4 space-y-1.5 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Base product</dt>
                        <dd className="tabular text-foreground">{formatAmount(baseProductPaid)}</dd>
                      </div>
                      {item.addOnEditCopy && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-muted-foreground">Edit copy & content support</dt>
                          <dd className="tabular text-foreground">{formatMoney(editCopyPrice)}</dd>
                        </div>
                      )}
                      {item.addOnSetupDeploy && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-muted-foreground">Setup & deployment support</dt>
                          <dd className="tabular text-foreground">{formatMoney(setupDeployPrice)}</dd>
                        </div>
                      )}
                    </dl>
                  )}

                  {isMulti && (
                    <p className="mt-3 text-right text-sm">
                      <span className={item.amount <= 0 ? "tabular text-success" : "tabular text-foreground"}>
                        {formatAmount(item.amount)}
                      </span>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          <dl className="space-y-2 border-t border-border p-5 text-sm sm:p-6">
            {paymentId && (
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                <dt className="text-muted-foreground">Payment ID</dt>
                <dd className="break-all font-mono text-xs text-foreground">{paymentId}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-4 pt-1">
              <dt className="font-medium text-foreground">Amount paid</dt>
              <dd
                className={`tabular text-2xl font-semibold tracking-tight ${
                  totalPaid <= 0 ? "text-success" : "text-foreground"
                }`}
              >
                {formatAmount(totalPaid)}
              </dd>
            </div>
          </dl>
        </section>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button asChild variant="outline" size="lg">
            <Link href={`/dashboard/receipt/${lineItems[0].orderId}`}>
              <FileText className="size-4" strokeWidth={1.75} aria-hidden="true" />
              View receipt
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href="/dashboard">
              Go to your library
              <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Return to marketplace
          </Link>
        </p>
      </div>
    </div>
  );
}
