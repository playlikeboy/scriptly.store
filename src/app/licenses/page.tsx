import { Metadata } from "next";
import { LegalDocument, type LegalSection } from "../terms/_components/LegalDocument";

export const metadata: Metadata = {
  title: "Product Licensing Terms",
  description: "Review personal, commercial, and redistribution rights for digital code templates and scripts purchased on ScriptlyStore.",
  alternates: {
    canonical: "https://scriptly.store/licenses",
  },
};

const sections: LegalSection[] = [
  {
    id: "commercial",
    title: "1. Commercial License",
    body: (
      <>
        <p>
          All premium templates, boilerplates, prompts, and scripts purchased on ScriptlyStore come with a standard commercial license. Under this license:
        </p>
        <ul>
          <li>You may build unlimited personal or commercial projects using the code assets.</li>
          <li>You may customize, restructure, and modify the source code files to suit your requirements.</li>
          <li>You can sell SaaS applications or services built using these assets.</li>
        </ul>
      </>
    ),
  },
  {
    id: "restrictions",
    title: "2. Restrictions",
    body: (
      <>
        <p>You are strictly prohibited from performing the following actions:</p>
        <ul>
          <li><strong>Redistribution:</strong> You cannot resell, redistribute, sub-license, or share the original ZIP package or source files directly, even for free or inside a larger builder bundle.</li>
          <li><strong>Marketplace Re-hosting:</strong> You cannot host the templates or files on another marketplace to compete directly with ScriptlyStore.</li>
        </ul>
      </>
    ),
  },
  {
    id: "attribution",
    title: "3. Attribution",
    body: (
      <p>
        Attribution back to ScriptlyStore or Strivio inside your compiled frontend applications is optional and not required. The source code is entirely yours to run and deploy.
      </p>
    ),
  },
];

export default function LicensesPage() {
  return (
    <LegalDocument
      path="/licenses"
      title="Product Licenses"
      updated="Last updated June 13, 2026"
      sections={sections}
      contact={
        <p>
          Questions? Contact <a href="mailto:mail@scriptly.store">mail@scriptly.store</a>.
        </p>
      }
    />
  );
}
