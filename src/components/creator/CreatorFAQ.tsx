import { Plus } from "lucide-react";

const FAQS = [
  {
    question: "What percentage of sales do I keep?",
    answer:
      "You keep 95% of all direct sales. Scriptly charges a transparent 5% platform fee to cover automated digital delivery, server infrastructure and secure payment processing. If a sale comes through an approved affiliate, the affiliate commission (set by you, typically 30%) is deducted, leaving 65% for you.",
  },
  {
    question: "How and when do I get paid?",
    answer:
      "Payouts go directly to your bank account via Razorpay Route. You can add your beneficiary bank details in your creator console settings.",
  },
  {
    question: "Do I keep the intellectual property of my code?",
    answer:
      "Yes, 100%. You retain full copyright and ownership of your code, design assets and documentation. Buyers receive a non-exclusive licence to use your code in their applications.",
  },
  {
    question: "What file formats can I sell on Scriptly?",
    answer:
      "ZIP packages of complete source repositories, standalone scripts (.py, .ts, .sh), UI component assets, database schemas, prompt packs, or private GitHub repository invite access.",
  },
  {
    question: "Can I list free products or lead magnets?",
    answer:
      "Yes. You can set any product to free. Free products are featured across Scriptly’s /free collection and help you build an audience of developers who often go on to buy your paid tools.",
  },
  {
    question: "What support am I expected to give buyers?",
    answer:
      "Scriptly products are sold as developer assets. Your code should work as described in your README. You aren’t obliged to build custom features or act as an on-call consultant.",
  },
];

export default function CreatorFAQ() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-12 lg:gap-16 lg:px-8">
        <div className="lg:col-span-4">
          <h2 className="font-display text-3xl leading-tight tracking-[-0.02em] text-balance text-foreground md:text-4xl">
            Questions creators ask
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Straight answers for engineers looking to earn from their software.
          </p>
        </div>

        <div className="divide-y divide-border border-y border-border lg:col-span-8">
          {FAQS.map((faq, idx) => (
            <details key={faq.question} open={idx === 0} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-base font-medium text-foreground transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                {faq.question}
                <Plus
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 motion-reduce:transition-none"
                  strokeWidth={1.75}
                />
              </summary>
              <p className="max-w-[68ch] pb-5 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
