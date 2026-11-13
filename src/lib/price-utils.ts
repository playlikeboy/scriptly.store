import { CHECKOUT_CURRENCY } from "@/config/pricing";

export function getProductEffectivePrice(product: {
  price: number;
  isFree?: boolean;
  discountPercent?: number | null;
  promoStart?: Date | string | null;
  promoEnd?: Date | string | null;
}) {
  const price = product.price; // in paise
  const isFreeField = !!product.isFree;
  const discountPercentField = product.discountPercent || 0;
  
  // Verify promotion dates
  const now = new Date();
  let hasPromoInterval = false;
  let isPromoActive = true;

  if (product.promoStart || product.promoEnd) {
    hasPromoInterval = true;
    
    if (product.promoStart) {
      const start = new Date(product.promoStart);
      if (now < start) {
        isPromoActive = false;
      }
    }
    if (product.promoEnd) {
      const end = new Date(product.promoEnd);
      if (now > end) {
        isPromoActive = false;
      }
    }
  }

  // If promo is not active, return the standard original price
  if (hasPromoInterval && !isPromoActive) {
    return {
      price,
      effectivePrice: price,
      isFree: false,
      discountPercent: 0,
      hasDiscount: false,
      promoEnd: product.promoEnd ? new Date(product.promoEnd) : null,
      isPromoActive: false,
    };
  }

  // If promo is active (or permanently active)
  if (isFreeField) {
    return {
      price,
      effectivePrice: 0,
      isFree: true,
      discountPercent: 100,
      hasDiscount: true,
      promoEnd: product.promoEnd ? new Date(product.promoEnd) : null,
      isPromoActive: hasPromoInterval,
    };
  }

  if (discountPercentField > 0) {
    const discountAmount = Math.round(price * (discountPercentField / 100));
    const effectivePrice = Math.max(price - discountAmount, 0);
    return {
      price,
      effectivePrice,
      isFree: effectivePrice === 0,
      discountPercent: discountPercentField,
      hasDiscount: true,
      promoEnd: product.promoEnd ? new Date(product.promoEnd) : null,
      isPromoActive: hasPromoInterval,
    };
  }

  return {
    price,
    effectivePrice: price,
    isFree: false,
    discountPercent: 0,
    hasDiscount: false,
    promoEnd: null,
    isPromoActive: false,
  };
}

export const formatINR = (amountInRupees: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amountInRupees);

/** Real INR paise only — payment links (/pay). Never use for catalog prices. */
export const formatPaiseToINR = (amountInPaise: number) =>
  formatINR(Math.round(amountInPaise / 100));

/**
 * Catalog money. Product prices, order amounts, coupons, payouts and
 * affiliate commissions are stored as integer minor units of the catalog
 * currency (CHECKOUT_CURRENCY.catalogCurrency — currently USD cents).
 * Razorpay charges the INR equivalent at checkout (see orders.ts).
 * Every catalog amount shown to users goes through formatMoney/formatPrice.
 */
const catalogLocale = CHECKOUT_CURRENCY.catalogCurrency === "INR" ? "en-IN" : "en-US";
const wholeFormatter = new Intl.NumberFormat(catalogLocale, {
  style: "currency",
  currency: CHECKOUT_CURRENCY.catalogCurrency,
  maximumFractionDigits: 0,
});
const centsFormatter = new Intl.NumberFormat(catalogLocale, {
  style: "currency",
  currency: CHECKOUT_CURRENCY.catalogCurrency,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats a catalog amount (minor units): "$29", "$29.50", "$0". */
export const formatMoney = (amountInMinor: number) => {
  const minor = Math.round(amountInMinor);
  return (minor % 100 === 0 ? wholeFormatter : centsFormatter).format(minor / 100);
};

/** Formats a product price (minor units); zero or less renders "Free". */
export const formatPrice = (amountInMinor: number) =>
  amountInMinor <= 0 ? "Free" : formatMoney(amountInMinor);

/** Catalog currency code for labels, e.g. "USD". */
export const CATALOG_CURRENCY = CHECKOUT_CURRENCY.catalogCurrency;

/** @deprecated use formatMoney. */
export const formatUSD = formatMoney;

