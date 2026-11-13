/**
 * Canonical pricing, commission splits, and fee configurations for ScriptlyStore.
 * All financial splits across creator payouts, affiliate programs, and platform fees
 * must derive directly from this configuration.
 *
 * Units: every amount below (and every amount stored in `products.price`,
 * `orders.amount`, `coupons.*Amount`, `payouts.amount`,
 * `affiliate_commissions.amount`) is an integer in the catalog's minor unit
 * (1/100 of the catalog currency, i.e. paise for INR). Razorpay is always
 * charged in INR paise; see CHECKOUT_CURRENCY for the catalog -> INR step.
 */

export const COMMISSION_RATES = {
  // Direct sale without affiliate referral
  directCreatorShare: 0.95,
  directPlatformShare: 0.05,

  // Sale referred by an approved affiliate
  affiliateCreatorShare: 0.65,
  affiliateShare: 0.30,
  affiliatePlatformShare: 0.05,
} as const;

export const PRICING_RULES = {
  // Minimum chargeable amount in catalog minor units (100 = $1.00)
  minChargeableCents: 100,

  // Default affiliate commission percent if unspecified on product
  defaultAffiliateCommissionPercent: 30,

  // Automatic bulk discount: 20% off when cart subtotal >= 6000 minor units (60.00)
  bulkDiscountThresholdCents: 6000,
  bulkDiscountPercent: 20,

  // Additional discount percentage for buyers using an affiliate referral link (5%)
  referralBuyerDiscountPercent: 5,

  // Addon cost calculation (1/3rd of base price per addon)
  addonCostDivisor: 3,
} as const;

/**
 * Catalog -> Razorpay charge conversion.
 *
 * Razorpay orders are always created in INR paise. `catalogCurrency` declares
 * what unit the stored catalog amounts are in:
 *  - "INR": amounts are already paise; charged 1:1.
 *  - "USD": amounts are cents; converted with the live USD->INR rate
 *    (falling back to `fallbackUsdToInrRate` when the rate API is unavailable).
 *
 * Checkout has historically converted with a live USD->INR rate, so "USD" is
 * kept to preserve the amounts customers are charged. Switching to "INR" must
 * happen together with confirming that stored prices are paise.
 */
export const CHECKOUT_CURRENCY = {
  catalogCurrency: "USD" as "USD" | "INR",
  chargeCurrency: "INR",
  fallbackUsdToInrRate: 95,
  exchangeRateUrl: "https://open.er-api.com/v6/latest/USD",
  exchangeRateRevalidateSeconds: 3600,
  exchangeRateTimeoutMs: 3000,
} as const;
