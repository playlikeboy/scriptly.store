import { Metadata } from "next";
import { requireAdminPage } from "@/app/admin/_components/require-admin";
import {
  getAdminPaymentLinksAction,
  getPaymentLinkActivitiesAction,
  getSeparatePaymentAnalyticsAction,
} from "@/lib/actions/payment-links";
import AdminPaymentLinksManager from "@/components/admin/AdminPaymentLinksManager";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Payment Links & Instant Checkouts | Admin Console",
  description: "Create and track custom payment links with automated post-payment redirection.",
};

export default async function AdminPaymentLinksPage() {
  await requireAdminPage();

  const [links, activities, analytics, headersList] = await Promise.all([
    getAdminPaymentLinksAction(),
    getPaymentLinkActivitiesAction(100),
    getSeparatePaymentAnalyticsAction(),
    headers(),
  ]);

  const host = headersList.get("host") || "scriptly.store";
  const protocol = host.includes("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  return (
    <div className="space-y-6">
      <AdminPaymentLinksManager
        initialLinks={links}
        initialActivities={activities}
        initialAnalytics={analytics}
        origin={origin}
      />
    </div>
  );
}
