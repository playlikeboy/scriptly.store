import { Metadata } from "next";
import RouteGuideClient from "./RouteGuideClient";

export const metadata: Metadata = {
  title: "Razorpay Route Splits Developer Guide | ScriptlyStore Docs",
  description:
    "Comprehensive architectural guide on how ScriptlyStore dynamically splits multi-party vendor transactions using Razorpay Route.",
  alternates: {
    canonical: "https://scriptly.store/docs/route-guide",
  },
};

export default function RouteGuidePage() {
  return <RouteGuideClient />;
}
