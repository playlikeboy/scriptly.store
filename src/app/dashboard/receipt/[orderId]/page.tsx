export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { db } from "@/db";
import { orders, products, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getOrCreateDbUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CircleCheck } from "lucide-react";
import { PrintButton } from "@/components/PrintButton";
import { formatMoney } from "@/lib/price-utils";

export const metadata: Metadata = {
  title: "Purchase Receipt",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{
    orderId: string;
  }>;
}

export default async function ReceiptPage({ params }: PageProps) {
  const user = await getOrCreateDbUser();
  if (!user) {
    redirect("/handler/sign-in?redirectTo=/dashboard");
  }

  const { orderId } = await params;

  const orderRecord = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!orderRecord || orderRecord.status !== "completed") {
    redirect("/dashboard");
  }

  // Authorize: must be owner of order or admin
  const isAdmin = user.role === "admin";
  if (orderRecord.userId !== user.id && !isAdmin) {
    redirect("/dashboard");
  }

  const viewingOtherBuyer = isAdmin && orderRecord.userId !== user.id;

  // Product and (for admins) buyer lookups are independent.
  const [productRecord, buyer] = await Promise.all([
    db.query.products.findFirst({ where: eq(products.id, orderRecord.productId) }),
    viewingOtherBuyer
      ? db.query.users.findFirst({ where: eq(users.id, orderRecord.userId) })
      : Promise.resolve(undefined),
  ]);

  if (!productRecord) {
    redirect("/dashboard");
  }

  const buyerEmail = buyer?.email ?? user.email;

  const invoiceNumber = `INV-${orderRecord.id.replace(/-/g, "").substring(0, 12).toUpperCase()}`;
  const formattedDate = new Date(orderRecord.createdAt).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // All amounts are integer paise.
  const basePrice = productRecord.price;
  const discount = orderRecord.discountApplied;
  const totalAmount = orderRecord.amount;
  const editCopyPrice = orderRecord.addOnEditCopy ? Math.round(productRecord.price / 3) : 0;
  const setupDeployPrice = orderRecord.addOnSetupDeploy ? Math.round(productRecord.price / 3) : 0;
  const subtotalAmount = basePrice + editCopyPrice + setupDeployPrice;

  const inr = (paise: number) => formatMoney(paise);

  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:py-12 print:max-w-none print:p-0">
        {/* Actions (hidden on print) */}
        <div className="flex items-center justify-between gap-3 print:hidden">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden="true" />
            Back to library
          </Link>
          <PrintButton />
        </div>

        {/* Invoice */}
        <article className="mt-6 rounded-2xl border border-border bg-card p-6 sm:p-10 print:mt-0 print:rounded-none print:border-0 print:p-0">
          <header className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-display text-2xl text-foreground">ScriptlyStore</p>
              <p className="mt-1 text-sm text-muted-foreground">Official digital receipt</p>
            </div>
            <div className="sm:text-right">
              <h1 className="font-display text-3xl text-foreground">Invoice</h1>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{invoiceNumber}</p>
            </div>
          </header>

          <dl className="grid grid-cols-1 gap-6 py-8 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Billed to</dt>
              <dd className="mt-1 break-all font-medium text-foreground">{buyerEmail}</dd>
              <dd className="text-xs text-muted-foreground">Verified customer account</dd>
            </div>
            <div className="sm:text-right">
              <dt className="text-muted-foreground">Date of purchase</dt>
              <dd className="mt-1 font-medium text-foreground">{formattedDate}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Payment status</dt>
              <dd className="mt-1 inline-flex items-center gap-1.5 font-medium text-success">
                <CircleCheck className="size-4" strokeWidth={1.75} aria-hidden="true" />
                Successful & completed
              </dd>
            </div>
            <div className="sm:text-right">
              <dt className="text-muted-foreground">Payment reference</dt>
              <dd className="mt-1 break-all font-mono text-xs text-foreground">
                {orderRecord.razorpayPaymentId || "Razorpay API Payment"}
              </dd>
            </div>
          </dl>

          {/* Line items */}
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Line items</caption>
            <thead>
              <tr className="border-y border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="py-3 pr-4 font-medium">
                  Item
                </th>
                <th scope="col" className="py-3 text-right font-medium">
                  Amount (USD)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="py-4 pr-4">
                  <p className="font-medium text-foreground">{productRecord.title}</p>
                  <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                    {productRecord.category.replace(/-/g, " ")}
                  </p>
                </td>
                <td className="tabular py-4 text-right align-top text-foreground">{inr(basePrice)}</td>
              </tr>
              {orderRecord.addOnEditCopy && (
                <tr>
                  <td className="py-4 pr-4">
                    <p className="font-medium text-foreground">Edit copy & content support</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Add-on service (1/3 product price)</p>
                  </td>
                  <td className="tabular py-4 text-right align-top text-foreground">{inr(editCopyPrice)}</td>
                </tr>
              )}
              {orderRecord.addOnSetupDeploy && (
                <tr>
                  <td className="py-4 pr-4">
                    <p className="font-medium text-foreground">Setup & deployment support</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Add-on service (1/3 product price)</p>
                  </td>
                  <td className="tabular py-4 text-right align-top text-foreground">{inr(setupDeployPrice)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-2 flex justify-end border-t border-border pt-4">
            <dl className="w-full space-y-2 text-sm sm:w-72">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular text-foreground">{inr(subtotalAmount)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    Discount
                    {orderRecord.couponCode && (
                      <>
                        {" "}
                        <span className="font-mono text-xs">({orderRecord.couponCode})</span>
                      </>
                    )}
                  </dt>
                  <dd className="tabular text-success">−{inr(discount)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
                <dt className="font-medium text-foreground">Total paid</dt>
                <dd className="tabular text-2xl font-semibold tracking-tight text-foreground">{inr(totalAmount)}</dd>
              </div>
            </dl>
          </div>

          <footer className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
            <p>
              Thank you for supporting creators on ScriptlyStore! If you have any questions, contact our technical
              support.
            </p>
            <p className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
              <span>scriptly.store</span>
              <a href="mailto:support@scriptly.store" className="hover:text-foreground transition-colors">
                support@scriptly.store
              </a>
            </p>
          </footer>
        </article>
      </div>
    </div>
  );
}
