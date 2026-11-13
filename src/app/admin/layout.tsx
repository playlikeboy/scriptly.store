import { isAdmin } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { sql, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { Metadata } from "next";
import AdminNav from "@/app/admin/AdminNav";

export const metadata: Metadata = {
  title: "Admin Console",
  description: "ScriptlyStore admin dashboard for managing products, orders, creators, and payouts.",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authorized = await isAdmin();

  if (!authorized) {
    redirect("/");
  }

  const [pendingCountResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(eq(products.status, "pending"));

  const pendingCount = Number(pendingCountResult?.count || 0);

  return (
    <div className="bg-background text-foreground lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <AdminNav pendingCount={pendingCount} />
      <div className="min-w-0">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          {children}
        </div>
      </div>
    </div>
  );
}
