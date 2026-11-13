import { Metadata } from "next";
import CartClient from "@/components/CartClient";

export const metadata: Metadata = {
  title: "Shopping Cart | ScriptlyStore",
  description: "Review your selected digital assets and complete secure checkout with instant download.",
};

export const dynamic = "force-dynamic";

export default function CartPage() {
  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        <h1 className="font-display text-3xl text-foreground md:text-4xl">Your cart</h1>
        <div className="mt-8">
          <CartClient />
        </div>
      </div>
    </div>
  );
}
