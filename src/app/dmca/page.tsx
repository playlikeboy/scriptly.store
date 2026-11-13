import { Metadata } from "next";
import { LegalDocument, type LegalSection } from "../terms/_components/LegalDocument";

export const metadata: Metadata = {
  title: "DMCA Copyright Policy",
  description: "Our copyright infringement notification and counter-notification procedures under the DMCA.",
  alternates: {
    canonical: "https://scriptly.store/dmca",
  },
};

const sections: LegalSection[] = [
  {
    id: "overview",
    title: "1. Overview of Copyright Protection",
    body: (
      <p>
        ScriptlyStore (&ldquo;Platform&rdquo;), owned and operated by Strivio Inc., respects the intellectual property rights of others. We expect all creators and users to upload only materials they own or hold explicit permissions to distribute. In accordance with the Digital Millennium Copyright Act (&ldquo;DMCA&rdquo;), we respond promptly to notices of alleged copyright infringement.
      </p>
    ),
  },
  {
    id: "takedown",
    title: "2. DMCA Takedown Notice Requirements",
    body: (
      <>
        <p>
          If you believe that any creator script, boilerplate, text description, or other media hosted on our website infringes upon your copyright, you may submit a formal notification to our Designated Copyright Agent. Your notice must include:
        </p>
        <ul>
          <li>A physical or electronic signature of the copyright owner or a person authorized to act on their behalf.</li>
          <li>Identification of the copyrighted work claimed to have been infringed (e.g. description or link to original work).</li>
          <li>Identification of the material that is claimed to be infringing, including the specific URL on ScriptlyStore where the material is located.</li>
          <li>Your contact details: name, address, telephone number, and email address.</li>
          <li>A statement that you have a good faith belief that the use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
          <li>A statement that the information in the notification is accurate, and under penalty of perjury, that you are the copyright owner or authorized to act on behalf of the owner.</li>
        </ul>
      </>
    ),
  },
  {
    id: "safe-harbor",
    title: "3. Safe Harbor Actions",
    body: (
      <>
        <p>Upon receipt of a valid and complete DMCA notice, we will:</p>
        <ul>
          <li>Expeditiously remove or disable access to the allegedly infringing material.</li>
          <li>Notify the creator or user who uploaded the material that access has been disabled.</li>
          <li>Forward a copy of the notification to the uploader.</li>
        </ul>
      </>
    ),
  },
  {
    id: "counter-notice",
    title: "4. Counter-Notification Procedure",
    body: (
      <>
        <p>
          If you believe your material was removed or disabled by mistake or misidentification, you may file a counter-notification with our copyright agent. To be valid, a counter-notice must be in writing and include:
        </p>
        <ul>
          <li>Your physical or electronic signature.</li>
          <li>Identification of the material that has been removed or to which access has been disabled, and the location (URL) before removal.</li>
          <li>A statement under penalty of perjury that you have a good faith belief that the material was removed or disabled as a result of mistake or misidentification.</li>
          <li>Your name, address, and telephone number.</li>
          <li>A statement that you consent to the jurisdiction of the Federal District Court for the judicial district in which your address is located (or Gurugram, India, if your address is outside the US), and that you will accept service of process from the person who provided the original DMCA notice.</li>
        </ul>
      </>
    ),
  },
  {
    id: "repeat-infringers",
    title: "5. Repeat Infringer Policy",
    body: (
      <p>
        ScriptlyStore maintains a strict policy to terminate accounts and storefronts of creators or users who are deemed to be repeat infringers of copyright claims. Repeat infringers are users who have been verified as uploading infringing material more than twice.
      </p>
    ),
  },
];

export default function DmcaPage() {
  return (
    <LegalDocument
      path="/dmca"
      title="DMCA Copyright Policy"
      updated="Effective as of June 15, 2026"
      sections={sections}
      contact={
        <>
          <h2 className="font-display text-xl text-foreground">Contact our copyright agent</h2>
          <p className="mt-2">Submit all DMCA notices or counter-notifications to:</p>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
            <dt className="text-foreground">Email</dt>
            <dd><a href="mailto:mail@scriptly.store">mail@scriptly.store</a></dd>
            <dt className="text-foreground">Address</dt>
            <dd>Strivio Inc. Attn: Copyright Agent, DLF Phase 3, Sector 24, Gurugram, Haryana - 122002, India.</dd>
          </dl>
        </>
      }
    />
  );
}
