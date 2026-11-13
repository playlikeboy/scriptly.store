import { Metadata } from "next";
import { LegalDocument, type LegalSection } from "../terms/_components/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Understand how we collect, store, and protect your personal data, bank details, and transaction history on ScriptlyStore.",
  alternates: {
    canonical: "https://scriptly.store/privacy",
  },
};

const sections: LegalSection[] = [
  {
    id: "introduction",
    title: "1. Introduction",
    body: (
      <p>
        Strivio Inc. (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the ScriptlyStore marketplace (https://scriptly.store/). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and disclose information from and about users of our website and services.
      </p>
    ),
  },
  {
    id: "collection",
    title: "2. Information We Collect",
    body: (
      <>
        <p>To provide our services, we collect minimal personal data. This includes:</p>
        <ul>
          <li><strong>Account Details:</strong> When you register or sign in, we collect your email address and name. Authentication is handled securely through our partner, Hexclave, and we do not store passwords.</li>
          <li><strong>Transaction Details:</strong> When you make a purchase, details such as name, email address, transaction currency, payment status, and order details are registered.</li>
          <li><strong>Creator Payout Settings:</strong> For creators who opt-in to Direct Bank Transfer, we collect and store their banking details (Bank Name, Account Holder Name, Bank Account Number, and IFSC Code) solely for the purpose of configuring and executing Razorpay Route automated splits.</li>
          <li><strong>Usage & Device Data:</strong> We may automatically log information about your device, browser type, operating system, and interaction details to optimize page speed and functionality.</li>
        </ul>
      </>
    ),
  },
  {
    id: "payment-information",
    title: "3. Payment Information",
    body: (
      <p>
        All payment transactions on ScriptlyStore are securely processed through <strong>Razorpay</strong>. We do not collect, view, or store credit card numbers, CVVs, net banking logins, or other sensitive payment credentials on our servers. All such data is entered directly on Razorpay&apos;s PCI-DSS compliant secure checkout page.
      </p>
    ),
  },
  {
    id: "use",
    title: "4. How We Use Your Data",
    body: (
      <>
        <p>Your collected information is used solely for the following purposes:</p>
        <ul>
          <li>Processing and facilitating payment transactions via Razorpay.</li>
          <li>Delivering purchased digital assets and managing licenses.</li>
          <li>Sending transactional notifications, receipts, and order updates.</li>
          <li>Providing client support and debugging service issues.</li>
          <li>Complying with applicable legal, accounting, and taxation requirements.</li>
        </ul>
      </>
    ),
  },
  {
    id: "cookies",
    title: "5. Cookies & Tracking Technologies",
    body: (
      <p>
        We use essential cookies and session tokens to keep you logged in and preserve items in your shopping cart. You can configure your browser to reject cookies, though some parts of our marketplace may not function properly as a result.
      </p>
    ),
  },
  {
    id: "security",
    title: "6. Data Security",
    body: (
      <p>
        We implement robust security measures to keep your data safe, including HTTPS/TLS 1.3 encryption for all web traffic and secure serverless computing provided by Cloudflare. However, please be aware that no method of transmission over the Internet is 100% secure.
      </p>
    ),
  },
  {
    id: "rights",
    title: "7. Your Rights",
    body: (
      <p>
        You have the right to request access to the personal data we hold about you, request corrections to any inaccuracies, or request the deletion of your account and related data. To exercise these rights, please contact <a href="mailto:mail@scriptly.store">mail@scriptly.store</a>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      path="/privacy"
      title="Privacy Policy"
      updated="Last updated June 13, 2026"
      sections={sections}
      contact={
        <>
          <p>
            If you have questions about this Privacy Policy or how your data is handled, please contact our data team at{" "}
            <a href="mailto:mail@scriptly.store">mail@scriptly.store</a>.
          </p>
          <p>
            <strong>Address:</strong> Strivio Inc., DLF Phase 3, Sector 24, Gurugram, Haryana - 122002, India
          </p>
        </>
      }
    />
  );
}
