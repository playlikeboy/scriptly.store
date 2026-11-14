"use client";

import { useState, useEffect, useTransition, useCallback, useId, useMemo } from "react";
import { Heart, Star, Loader2, X, ThumbsUp, BadgeCheck, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  incrementViewAction,
  toggleInteractionAction,
  checkInteractionStatusAction,
  submitReviewAction,
  getProductReviewsAction,
  toggleReviewLikeAction,
} from "@/lib/actions/interactions";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Review {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  parentId: string | null;
  createdAt: Date | string;
  user: {
    name: string | null;
    email: string;
  };
  likesCount: number;
  userLiked: boolean;
}

interface ProductInteractionAndReviewsProps {
  productId: string;
  /** Used for the sign-in return URL. Falls back to the product id. */
  productSlug?: string;
  initialViews: number;
  initialDownloads: number;
  initialSaves: number;
  initialRating: string;
  initialRatingCount: number;
  userLoggedIn: boolean;
  showStats?: boolean;
}

const RATING_LABELS: Record<number, string> = {
  1: "Poor (Needs improvement)",
  2: "Fair (Basic expectations)",
  3: "Good (Solid implementation)",
  4: "Great (High quality)",
  5: "Exceptional (Production ready)",
};

const formatDate = (value: Date | string, withYear = true) =>
  new Date(value).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  });

function Stars({ value, size = "size-3.5" }: { value: number; size?: string }) {
  return (
    <span className="flex items-center gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          strokeWidth={1.75}
          className={cn(size, i < value ? "fill-amber-500 text-amber-500" : "text-border")}
        />
      ))}
    </span>
  );
}

export default function ProductInteractionAndReviews({
  productId,
  productSlug,
  initialViews,
  initialDownloads,
  initialSaves,
  initialRating,
  initialRatingCount,
  userLoggedIn,
  showStats = false,
}: ProductInteractionAndReviewsProps) {
  const formId = useId();
  const [views, setViews] = useState(initialViews);
  const [saves, setSaves] = useState(initialSaves);
  const [isSaved, setIsSaved] = useState(false);
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reviewsError, setReviewsError] = useState(false);

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState("");
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [replyToReview, setReplyToReview] = useState<Review | null>(null);

  const [isPending, startTransition] = useTransition();

  const signInHref = `/handler/sign-in?redirectTo=/products/${productSlug ?? productId}`;

  const loadReviews = useCallback(async () => {
    try {
      const res = await getProductReviewsAction(productId);
      if (res?.reviews) {
        setReviewsList(res.reviews as Review[]);
      }
      setReviewsError(Boolean(res && "error" in res && res.error));
    } catch (err) {
      console.error("Failed to load reviews:", err);
      setReviewsError(true);
    } finally {
      setLoadingReviews(false);
    }
  }, [productId]);

  useEffect(() => {
    incrementViewAction(productId).then((res) => {
      if (res?.success) setViews((prev) => prev + 1);
    });

    loadReviews();

    if (userLoggedIn) {
      checkInteractionStatusAction(productId).then((res) => {
        if (res) setIsSaved(res.isSaved);
      });
    }
  }, [productId, userLoggedIn, loadReviews]);

  const handleToggleSave = async () => {
    if (!userLoggedIn) {
      toast.error("Sign in to save products to your library.");
      return;
    }

    try {
      const res = await toggleInteractionAction(productId, "save");
      if (res?.error) {
        toast.error(res.error);
        return;
      }

      if (res?.success) {
        setIsSaved(res.active || false);
        setSaves((prev) => (res.active ? prev + 1 : Math.max(0, prev - 1)));
        toast.success(res.active ? "Saved to your library." : "Removed from saved items.");
      }
    } catch {
      toast.error("Couldn't update saved status. Try again.");
    }
  };

  const handleToggleReviewLike = async (reviewId: string) => {
    if (!userLoggedIn) {
      toast.error("Sign in to vote on reviews.");
      return;
    }

    try {
      const res = await toggleReviewLikeAction(reviewId);
      if (res?.error) {
        toast.error(res.error);
        return;
      }

      setReviewsList((prevList) =>
        prevList.map((r) => {
          if (r.id !== reviewId) return r;
          const nextLiked = !r.userLiked;
          return {
            ...r,
            userLiked: nextLiked,
            likesCount: nextLiked ? r.likesCount + 1 : Math.max(0, r.likesCount - 1),
          };
        })
      );
    } catch {
      toast.error("Couldn't record your vote. Try again.");
    }
  };

  const openForm = (reply: Review | null = null) => {
    if (!userLoggedIn) {
      toast.error(reply ? "Sign in to reply." : "Sign in to leave a review.");
      return;
    }
    setReplyToReview(reply);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setReplyToReview(null);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userLoggedIn) {
      toast.error("Sign in to submit a review.");
      return;
    }

    if (!commentInput.trim()) {
      toast.error("Write a few words about your experience.");
      return;
    }

    startTransition(async () => {
      const parentId = replyToReview?.id;
      const rating = parentId ? 5 : ratingInput;

      const res = await submitReviewAction(productId, rating, commentInput, parentId);
      if (res?.error) {
        toast.error(res.error);
        return;
      }

      toast.success(parentId ? "Reply posted." : "Thanks for your review.");
      setCommentInput("");
      closeForm();
      await loadReviews();
    });
  };

  const { parentReviews, repliesMap } = useMemo(() => {
    const parents: Review[] = [];
    const map: Record<string, Review[]> = {};
    for (const r of reviewsList) {
      if (r.parentId) {
        (map[r.parentId] ||= []).push(r);
      } else {
        parents.push(r);
      }
    }
    return { parentReviews: parents, repliesMap: map };
  }, [reviewsList]);

  const ratingValue = Number.parseFloat(initialRating) || 0;
  const displayedRating = hoverRating ?? ratingInput;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Reviews</h2>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {initialRatingCount > 0 && ratingValue > 0 ? (
              <>
                <Stars value={Math.round(ratingValue)} />
                <span className="tabular font-medium text-foreground">{ratingValue.toFixed(1)}</span>
                <span className="tabular">
                  from {initialRatingCount} {initialRatingCount === 1 ? "rating" : "ratings"}
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular">
                  {parentReviews.length} {parentReviews.length === 1 ? "review" : "reviews"}
                </span>
              </>
            ) : parentReviews.length > 0 ? (
              <span className="tabular">
                {parentReviews.length} {parentReviews.length === 1 ? "review" : "reviews"}
              </span>
            ) : (
              <span>No reviews yet. Bought it? Be the first to review.</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={isSaved ? "secondary" : "outline"}
            onClick={handleToggleSave}
            aria-pressed={isSaved}
          >
            <Heart
              className={cn("size-4", isSaved && "fill-primary text-primary")}
              strokeWidth={1.75}
              aria-hidden="true"
            />
            {isSaved ? "Saved" : "Save"}
            {saves > 0 && <span className="tabular text-muted-foreground">{saves}</span>}
          </Button>

          {!isFormOpen && (
            <Button type="button" variant="default" onClick={() => openForm()}>
              Write a review
            </Button>
          )}
        </div>
      </div>

      {/* Optional stats (only when the creator enables it) */}
      {showStats && (
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">Views</dt>
            <dd className="tabular font-medium text-foreground">{views}</dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">Downloads</dt>
            <dd className="tabular font-medium text-foreground">{initialDownloads}</dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">Saves</dt>
            <dd className="tabular font-medium text-foreground">{saves}</dd>
          </div>
        </dl>
      )}

      {/* Review form */}
      {isFormOpen && (
        <div className="max-w-2xl rounded-2xl border border-border bg-card p-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-foreground">
              {replyToReview ? `Reply to ${replyToReview.user.name || "Builder"}` : "Share your experience"}
            </h3>
            <Button type="button" variant="ghost" size="icon-sm" onClick={closeForm} aria-label="Close review form">
              <X strokeWidth={1.75} />
            </Button>
          </div>

          {userLoggedIn ? (
            <form onSubmit={handleReviewSubmit} className="mt-4 space-y-4">
              {!replyToReview && (
                <fieldset className="space-y-1.5">
                  <legend className="text-sm font-medium text-foreground">Your rating</legend>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center" onMouseLeave={() => setHoverRating(null)}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatingInput(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          aria-label={`${star} star${star > 1 ? "s" : ""}`}
                          aria-pressed={ratingInput === star}
                          className="rounded-md p-1 transition-transform duration-150 hover:scale-110"
                        >
                          <Star
                            strokeWidth={1.75}
                            aria-hidden="true"
                            className={cn(
                              "size-6 transition-colors",
                              star <= displayedRating ? "fill-amber-500 text-amber-500" : "text-border"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground" aria-live="polite">
                      {RATING_LABELS[displayedRating]}
                    </span>
                  </div>
                </fieldset>
              )}

              <div className="space-y-1.5">
                <label htmlFor={`${formId}-comment`} className="text-sm font-medium text-foreground">
                  {replyToReview ? "Your reply" : "Your review"}
                </label>
                <textarea
                  id={`${formId}-comment`}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder={
                    replyToReview
                      ? "Write your reply…"
                      : "How was the code quality, documentation, and setup experience? Be honest to help fellow founders."
                  }
                  rows={4}
                  className="w-full resize-y rounded-[10px] border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:border-ring focus-visible:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={closeForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} aria-busy={isPending}>
                  {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  {isPending ? "Posting…" : replyToReview ? "Post reply" : "Submit review"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="mt-4 space-y-3 text-sm">
              <p className="text-muted-foreground">Sign in to submit a verified review.</p>
              <Button asChild>
                <Link href={signInHref}>Sign in to review</Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Reviews list */}
      {loadingReviews ? (
        <ul className="divide-y divide-border" aria-busy="true" aria-label="Loading reviews">
          {Array.from({ length: 2 }).map((_, i) => (
            <li key={i} className="flex gap-3 py-5">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-full max-w-lg" />
                <Skeleton className="h-3 w-2/3 max-w-md" />
              </div>
            </li>
          ))}
        </ul>
      ) : reviewsError && parentReviews.length === 0 ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <p>Reviews couldn&apos;t be loaded.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setLoadingReviews(true);
              loadReviews();
            }}
          >
            Retry
          </Button>
        </div>
      ) : parentReviews.length === 0 ? (
        <div className="max-w-xl space-y-3 py-4">
          <MessageSquare className="size-5 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
          <h3 className="text-base font-semibold text-foreground">No reviews yet</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Have you evaluated, tested, or deployed this code? Share your experience to help the developer community.
          </p>
          {!isFormOpen && (
            <Button type="button" variant="outline" onClick={() => openForm()}>
              Write the first review
            </Button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {parentReviews.map((rev) => {
            const replies = repliesMap[rev.id] || [];
            const initials = (rev.user.name || rev.user.email || "B")
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();

            return (
              <li key={rev.id} className="flex gap-3 py-5 sm:gap-4">
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground"
                >
                  {initials}
                </span>
                <article className="min-w-0 flex-1 space-y-2">
                  <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="text-sm font-medium text-foreground">{rev.user.name || "Verified Builder"}</p>
                    <span className="inline-flex items-center gap-1 text-xs text-success">
                      <BadgeCheck className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                      Verified
                    </span>
                    <Stars value={rev.rating} />
                    <time dateTime={new Date(rev.createdAt).toISOString()} className="text-xs text-muted-foreground">
                      {formatDate(rev.createdAt)}
                    </time>
                  </header>

                  <p className="max-w-[68ch] whitespace-pre-line text-sm leading-relaxed text-foreground">
                    {rev.comment}
                  </p>

                  <div className="flex items-center gap-1 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleReviewLike(rev.id)}
                      aria-pressed={rev.userLiked}
                      className={cn("-ml-3", rev.userLiked && "text-primary hover:text-primary")}
                    >
                      <ThumbsUp className={cn(rev.userLiked && "fill-current")} strokeWidth={1.75} aria-hidden="true" />
                      Helpful
                      {rev.likesCount > 0 && <span className="tabular">{rev.likesCount}</span>}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => openForm(rev)}>
                      Reply
                    </Button>
                  </div>

                  {replies.length > 0 && (
                    <ul className="mt-2 space-y-2">
                      {replies.map((reply) => (
                        <li key={reply.id} className="rounded-[10px] bg-secondary px-4 py-3 text-sm">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="font-medium text-foreground">{reply.user.name || "Verified Builder"}</span>
                            <time
                              dateTime={new Date(reply.createdAt).toISOString()}
                              className="text-xs text-muted-foreground"
                            >
                              {formatDate(reply.createdAt, false)}
                            </time>
                          </div>
                          <p className="mt-1 whitespace-pre-line text-muted-foreground">{reply.comment}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
