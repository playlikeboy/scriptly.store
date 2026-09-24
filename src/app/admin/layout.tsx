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
    <div className="min-h-screen bg-background text-foreground">
      <AdminNav pendingCount={pendingCount} />
      <main className="min-h-screen lg:pl-60">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
