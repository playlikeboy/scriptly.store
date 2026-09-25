import { Metadata } from "next";
import IndexNowClient from "./IndexNowClient";

export const metadata: Metadata = {
  title: "IndexNow & Bing Instant Indexing Console | ScriptlyStore",
  description:
    "Real-time search engine submission dashboard. Ping Microsoft Bing, Yandex, and Seznam automatically upon publishing new codebases.",
  alternates: {
    canonical: "https://scriptly.store/indexnow",
  },
};

export default function IndexNowPage() {
  return <IndexNowClient />;
}
