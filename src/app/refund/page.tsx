import { Metadata } from "next";
import { LegalDocument, REGISTERED_OFFICE, type LegalSection } from "../terms/_components/LegalDocument";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy",
  description: "Learn about our cancellation and refund policies for downloadable digital goods on ScriptlyStore.",
  alternates: {
    canonical: "https://scriptly.store/refund",
  },
};

const sections: LegalSection[] = [
  {
    id: "digital-goods",
    title: "1. Nature of Digital Goods",
    body: (
      <p>
        Due to the downloadable nature of digital products, SaaS templates, boilerplates, ebooks, prompts, scripts, and UI kits hosted on ScriptlyStore, all purchases are final and non-refundable. Once a file link is generated or access is unlocked, we cannot revoke files or issue refunds.
      </p>
    ),
  },
  {
    id: "exceptions",
    title: "2. Refund Exceptions",
    body: (
      <>
        <p>We only issue refunds under the following unique conditions:</p>
        <ul>
          <li><strong>Double Purchase:</strong> If you accidentally purchased the same product twice within 24 hours.</li>
          <li><strong>Corrupt or Defective File:</strong> If the provided ZIP package is corrupt and cannot be opened or contains missing files (requires support verification).</li>
        </ul>
      </>
    ),
  },
  {
    id: "process",
    title: "3. Request Process & Refund Timelines",
    body: (
      <>
        <p>
          To request a refund under valid exception cases, email <a href="mailto:mail@scriptly.store">mail@scriptly.store</a> with your transaction receipt, registered email, and detailed reasoning within 7 days of purchase.
        </p>
        <p>
          Once verified and approved, refunds are processed via our payment processor, <strong>Razorpay</strong>, back to your original payment method. For payments that were dynamically split at checkout, Razorpay Route will automatically reverse the split transfers proportionally from the linked merchant bank account. The refund amount will typically reflect in your account within <strong>5-7 business days</strong>.
        </p>
      </>
    ),
  },
  {
    id: "cancellation",
    title: "4. Cancellation Policy",
    body: (
      <p>
        Since all products are digital and delivered immediately upon payment capture, cancellations of successful orders are not supported. If you want to delete your account or cancel your registration with ScriptlyStore, you can contact us at <a href="mailto:mail@scriptly.store">mail@scriptly.store</a>.
      </p>
    ),
  },
];

export default function RefundPage() {
  return (
    <LegalDocument
      path="/refund"
      title="Cancellation & Refund Policy"
      updated="Last updated June 13, 2026"
      sections={sections}
      contact={
        <>
          <p>
            For support queries, please email <a href="mailto:mail@scriptly.store">mail@scriptly.store</a>.
          </p>
          <p>
            <strong>Registered Office:</strong> {REGISTERED_OFFICE}
          </p>
        </>
      }
    />
  );
}
