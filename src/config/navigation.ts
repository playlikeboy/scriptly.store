export interface NavItem {
  href: string;
  label: string;
  badge?: string;
  description?: string;
  external?: boolean;
}

/** Primary catalogue navigation shown in the site header. */
export const MAIN_NAVIGATION: NavItem[] = [
  { href: "/explore", label: "Explore", description: "Browse developer tools, scripts and templates" },
  { href: "/featured", label: "Featured", description: "Handpicked top premium releases" },
  { href: "/free", label: "Free", description: "Open source boilerplates, scripts and tools" },
  { href: "/blog", label: "Learn", description: "Engineering guides, tutorials and monetization" },
];

/** Creator entry point, rendered apart from the catalogue links. */
export const SELL_LINK: NavItem = {
  href: "/creator",
  label: "Sell on Scriptly",
  description: "Sell your code and keep 95% of sales",
};

export const FOOTER_NAVIGATION: Record<
  "marketplace" | "creators" | "learn" | "company" | "legal",
  NavItem[]
> = {
  marketplace: [
    { href: "/explore", label: "Explore" },
    { href: "/featured", label: "Featured" },
    { href: "/free", label: "Free products" },
    { href: "/offers", label: "Offers" },
    { href: "/search", label: "Search" },
  ],
  creators: [
    { href: "/creator", label: "Sell on Scriptly" },
    { href: "/creator/new", label: "Submit a product" },
    { href: "/affiliate", label: "Affiliate program" },
    { href: "/trust", label: "Creator economics & split" },
  ],
  learn: [
    { href: "/blog", label: "Blog & guides" },
    { href: "/licenses", label: "License guide" },
    { href: "/docs/api", label: "API docs" },
    { href: "/rss", label: "RSS feed" },
  ],
  company: [
    { href: "/about", label: "About" },
    { href: "/trust", label: "Trust center" },
    { href: "/contact", label: "Support & contact" },
    { href: "https://razorpay.me/@iamsh", label: "Tip & sponsor", external: true },
  ],
  legal: [
    { href: "/terms", label: "Terms of service" },
    { href: "/privacy", label: "Privacy policy" },
    { href: "/refund", label: "Refund policy" },
    { href: "/dmca", label: "DMCA policy" },
  ],
};
