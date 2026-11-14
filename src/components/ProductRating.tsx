"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { rateProductAction } from "@/lib/actions/products";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProductRatingProps {
  productId: string;
  initialRating: string; // e.g. "4.8"
}

export default function ProductRating({ productId, initialRating }: ProductRatingProps) {
  const parsed = parseFloat(initialRating);
  const [rating, setRating] = useState(Number.isFinite(parsed) ? parsed : 0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRate = (value: number) => {
    startTransition(async () => {
      try {
        const res = await rateProductAction(productId, value);
        if (res.success && res.rating) {
          setRating(parseFloat(res.rating));
          toast.success("Thanks, your rating was saved.");
        } else {
          toast.error("Your rating could not be saved. Please try again.");
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    });
  };

  const activeValue = hoverRating ?? Math.round(rating);

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <div
        role="group"
        aria-label="Rate this product"
        className="flex items-center"
        onMouseLeave={() => setHoverRating(null)}
      >
        {[1, 2, 3, 4, 5].map((value) => {
          const isStarred = value <= activeValue;
          return (
            <button
              key={value}
              type="button"
              disabled={isPending}
              onClick={() => handleRate(value)}
              onMouseEnter={() => setHoverRating(value)}
              onFocus={() => setHoverRating(value)}
              onBlur={() => setHoverRating(null)}
              aria-label={`Rate ${value} out of 5`}
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-md transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
                isStarred ? "text-amber-500" : "text-border hover:text-amber-500/70"
              )}
            >
              <Star className="size-4 fill-current" strokeWidth={1.75} aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <p className="flex items-baseline gap-1.5 text-muted-foreground" aria-live="polite">
        {rating > 0 && (
          <span className="font-semibold tabular-nums text-foreground">{rating.toFixed(1)}</span>
        )}
        <span className="text-xs">
          {isPending
            ? "Saving your rating…"
            : hoverRating
              ? `Rate ${hoverRating} of 5`
              : rating > 0
                ? "average rating"
                : "No ratings yet"}
        </span>
      </p>
    </div>
  );
}
