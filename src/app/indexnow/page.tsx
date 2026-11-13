import { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth-utils";
import { getSitemapUrlsAction } from "@/lib/actions/indexnow";
import IndexNowClient from "./IndexNowClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "IndexNow & Bing Instant Indexing Console | ScriptlyStore",
  description:
    "Real-time search engine submission dashboard. Ping Microsoft Bing, Yandex, and Seznam automatically upon publishing new codebases.",
  alternates: {
    canonical: "https://scriptly.store/indexnow",
  },
};

export default async function IndexNowPage() {
  // Operator console: submitting the sitemap to search engines is an admin task.
  if (!(await isAdmin())) redirect("/");

  // Load the sitemap on the server so the queue renders without a client round-trip.
  const initial = await getSitemapUrlsAction();

  return (
    <IndexNowClient
      initialUrls={initial.success && initial.urls ? initial.urls : []}
      initialError={initial.success ? null : initial.error || "Failed to load URLs."}
    />
  );
}
