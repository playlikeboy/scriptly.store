import { CATALOG_MONEY_UNIT } from "./util";
import { loadCategoryTree } from "./tools/categories";
import { loadOverview } from "./tools/site";

type Resource = {
  uri: string;
  name: string;
  title: string;
  description: string;
  mimeType: string;
  read(): Promise<string>;
};

const MONEY_GUIDE = `# ScriptlyStore money units

- Catalog money (products.price, orders.amount, orders.discount_applied, coupons fixed discounts and
  min_purchase_amount, payouts.amount, affiliate_commissions.amount) is an integer in ${CATALOG_MONEY_UNIT}.
  Example: 2500 = $25.00.
- Payment links (payment_links.price, total_earned, payment_link_activities.amount) are integer INR paise.
  Example: 49900 = ₹499.
- Tool output gives money as { amount, unit, formatted }. Tool input takes the raw integer in the unit named
  in the field description (catalog fields: price/amount/minPurchaseAmount; payment links: pricePaise).
- Percentage coupons store a whole percent (1-100) in discountValue, not money.
- Creator share is 95% of completed gross sales; the platform keeps 5%.
`;

const RESOURCES: Resource[] = [
  {
    uri: "scriptly://categories",
    name: "categories",
    title: "Category tree",
    description: "Categories with subcategories and product counts (first 100 categories).",
    mimeType: "application/json",
    read: async () => JSON.stringify(await loadCategoryTree({ limit: 100, offset: 0 })),
  },
  {
    uri: "scriptly://stats/overview",
    name: "stats-overview",
    title: "Store overview stats",
    description: "Same data as the site_overview tool.",
    mimeType: "application/json",
    read: async () => JSON.stringify(await loadOverview()),
  },
  {
    uri: "scriptly://guide/money",
    name: "money-guide",
    title: "Money units guide",
    description: "Which fields are USD cents vs INR paise.",
    mimeType: "text/markdown",
    read: async () => MONEY_GUIDE,
  },
];

export function listResources() {
  return RESOURCES.map(({ uri, name, title, description, mimeType }) => ({ uri, name, title, description, mimeType }));
}

export async function readResource(uri: string) {
  const r = RESOURCES.find((x) => x.uri === uri);
  if (!r) return null;
  return { contents: [{ uri: r.uri, mimeType: r.mimeType, text: await r.read() }] };
}
