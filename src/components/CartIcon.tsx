"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/CartContext";

export default function CartIcon() {
  // Cart state starts empty on both server and client, then hydrates from
  // localStorage, so the badge never causes a hydration mismatch.
  const { cartCount } = useCart();
  const label = cartCount > 0 ? `Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}` : "Cart";

  return (
    <Link
      href="/cart"
      id="cart-nav-button"
      aria-label={label}
      className="relative inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ShoppingBag className="size-4" strokeWidth={1.75} aria-hidden="true" />
      {cartCount > 0 && (
        <span
          aria-hidden="true"
          className="tabular absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-medium leading-none text-background"
        >
          {cartCount > 99 ? "99+" : cartCount}
        </span>
      )}
    </Link>
  );
}
