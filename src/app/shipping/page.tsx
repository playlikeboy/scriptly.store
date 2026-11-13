import { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, REGISTERED_OFFICE, type LegalSection } from "../terms/_components/LegalDocument";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy",
  description: "Read our policy on instant electronic delivery of downloadable digital assets and code templates on ScriptlyStore.",
  alternates: {
    canonical: "https://scriptly.store/shipping",
  },
};

const sections: LegalSection[] = [
  {
    id: "method",
    title: "1. Delivery Method",
    body: (
      <p>
        ScriptlyStore sells downloadable digital assets, including website templates, SaaS boilerplates, ebooks, development scripts, UI kits, and prompts. <strong>There is no physical shipping or dispatch involved.</strong> Consequently, there are zero shipping charges, delivery fees, packaging costs, or customs duties applied to any order.
      </p>
    ),
  },
  {
    id: "timeline",
    title: "2. Delivery Timeline",
    body: (
      <p>
        All purchases are delivered electronically. Upon successful payment capture through <strong>Razorpay</strong>, access to your purchased digital files is unlocked <strong>instantly</strong>. You will be redirected to the purchase success screen to download your items immediately, and a transaction receipt containing download instructions will be sent to your registered email address.
      </p>
    ),
  },
  {
    id: "access",
    title: "3. How to Access Purchases",
    body: (
      <p>
        You can access all your purchased files at any time by logging into your customer account <strong>Dashboard</strong> at <Link href="/dashboard">/dashboard</Link>. If you do not have an active account, one will be created under the email address utilized at checkout.
      </p>
    ),
  },
  {
    id: "delays",
    title: "4. Technical Delays & Resolution",
    body: (
      <>
        <p>
          In rare instances, network latency or webhook delays might defer order activation. If your payment was captured but downloads are not visible:
        </p>
        <ul>
          <li>Wait up to 10-15 minutes and refresh your dashboard.</li>
          <li>Verify that the transaction amount was successfully debited from your card or bank account.</li>
          <li>If the download remains locked after 15 minutes, please contact <a href="mailto:mail@scriptly.store">mail@scriptly.store</a>. We will verify the transaction and manually grant access within <strong>24 hours</strong>.</li>
        </ul>
      </>
    ),
  },
];

export default function ShippingPage() {
  return (
    <LegalDocument
      path="/shipping"
      title="Shipping & Delivery Policy"
      updated="Last updated June 13, 2026"
      sections={sections}
      contact={
        <>
          <p>
            For delivery support or inquiries, please contact <a href="mailto:mail@scriptly.store">mail@scriptly.store</a>.
          </p>
          <p>
            <strong>Registered Office:</strong> {REGISTERED_OFFICE}
          </p>
        </>
      }
    />
  );
}
