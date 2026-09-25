"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Eye,
  Download,
  Heart,
  Star,
  Send,
  MessageSquare,
  Loader2,
  Sparkles,
  CornerDownRight,
  X,
  ShieldCheck,
  CheckCircle2,
  ThumbsUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  initialViews: number;
  initialDownloads: number;
  initialSaves: number;
  initialRating: string;
  initialRatingCount: number;
  userLoggedIn: boolean;
  showStats?: boolean;
}

export default function ProductInteractionAndReviews({
  productId,
  initialViews,
  initialDownloads,
  initialSaves,
  initialRating,
  initialRatingCount,
  userLoggedIn,
  showStats = false,
}: ProductInteractionAndReviewsProps) {
  const [views, setViews] = useState(initialViews);
  const [downloads, setDownloads] = useState(initialDownloads);
  const [saves, setSaves] = useState(initialSaves);
  const [isSaved, setIsSaved] = useState(false);
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState("");
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // Reply Mode states
  const [replyToReview, setReplyToReview] = useState<Review | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  const [isPending, startTransition] = useTransition();

  // Load reviews and check interaction status
  useEffect(() => {
    incrementViewAction(productId).then((res) => {
      if (res?.success) {
        setViews((prev) => prev + 1);
      }
    });

    loadReviews();

    if (userLoggedIn) {
      checkInteractionStatusAction(productId).then((res) => {
        if (res) setIsSaved(res.isSaved);
      });
    }
  }, [productId, userLoggedIn]);

  const loadReviews = async () => {
    try {
      const res = await getProductReviewsAction(productId);
      if (res?.reviews) {
        setReviewsList(res.reviews as Review[]);
      }
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleToggleSave = async () => {
    if (!userLoggedIn) {
      toast.error("Please sign in to save products to your library!");
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
        toast.success(res.active ? "Added to saved items!" : "Removed from saved items.");
      }
    } catch {
      toast.error("Failed to update save status.");
    }
  };

  const handleToggleReviewLike = async (reviewId: string) => {
    if (!userLoggedIn) {
      toast.error("Please sign in to vote on reviews!");
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
          if (r.id === reviewId) {
            const nextLiked = !r.userLiked;
            return {
              ...r,
              userLiked: nextLiked,
              likesCount: nextLiked ? r.likesCount + 1 : Math.max(0, r.likesCount - 1),
            };
          }
          return r;
        })
      );
    } catch {
      toast.error("Failed to like review.");
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userLoggedIn) {
      toast.error("Please sign in to submit a review!");
      return;
    }

    if (!commentInput.trim()) {
      toast.error("Please write a few words about your experience.");
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

      toast.success(parentId ? "Reply submitted successfully!" : "Thank you for your review!");
      setCommentInput("");
      setReplyToReview(null);
      setIsFormOpen(false);
      await loadReviews();
    });
  };

  const parentReviews = reviewsList.filter((r) => !r.parentId);
  const repliesMap = reviewsList.reduce<Record<string, Review[]>>((acc, r) => {
    if (r.parentId) {
      if (!acc[r.parentId]) acc[r.parentId] = [];
      acc[r.parentId].push(r);
    }
    return acc;
  }, {});

  const RATING_LABELS: Record<number, string> = {
    1: "Poor (Needs improvement)",
    2: "Fair (Basic expectations)",
    3: "Good (Solid implementation)",
    4: "Great (High quality)",
    5: "Exceptional (Production ready)",
  };

  return (
    <div className="space-y-8">
      {/* 1. Header with Trust Rating and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span>Builder Reviews &amp; Community Feedback</span>
            </h3>
            <Badge variant="outline" className="rounded-full text-[11px] font-bold border-border/60">
              {parentReviews.length} {parentReviews.length === 1 ? "Review" : "Reviews"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Authentic feedback from verified founders, engineers, and creators.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={handleToggleSave}
            variant="outline"
            size="sm"
            className={`rounded-xl font-bold text-xs h-9 px-3.5 border transition-all ${
              isSaved
                ? "bg-rose-500/10 text-rose-500 border-rose-500/30 hover:bg-rose-500/20"
                : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Heart className={`w-3.5 h-3.5 mr-1.5 ${isSaved ? "fill-current" : ""}`} />
            <span>{isSaved ? "Saved" : "Save"}</span>
            {saves > 0 && <span className="ml-1 opacity-70">({saves})</span>}
          </Button>

          {!isFormOpen && (
            <Button
              onClick={() => {
                if (!userLoggedIn) {
                  toast.error("Please sign in to leave a review!");
                  return;
                }
                setIsFormOpen(true);
              }}
              size="sm"
              className="rounded-xl font-bold text-xs h-9 px-4 bg-primary text-primary-foreground hover:brightness-105 transition-all shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              <span>Write a Review</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Optional Telemetry Stats Strip (Only displayed if showStats is explicitly enabled) */}
      {showStats && (
        <div className="flex flex-wrap items-center gap-6 p-3.5 rounded-2xl border border-border/40 bg-muted/20 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">{views}</span>
            <span>Views</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-border" />
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold text-foreground">{downloads}</span>
            <span>Downloads</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-border" />
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500" />
            <span className="font-semibold text-foreground">{saves}</span>
            <span>Saves</span>
          </div>
        </div>
      )}

      {/* 3. Review Submission Form (Expandable & Clean) */}
      {isFormOpen && (
        <div className="p-6 rounded-2xl border border-border/60 bg-muted/20 space-y-4 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{replyToReview ? `Replying to @${replyToReview.user.name || "Builder"}` : "Share Your Experience"}</span>
            </div>
            <button
              onClick={() => {
                setIsFormOpen(false);
                setReplyToReview(null);
              }}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {userLoggedIn ? (
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              {!replyToReview && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Your Rating
                    </label>
                    <span className="text-xs font-semibold text-amber-500">
                      {RATING_LABELS[hoverRating ?? ratingInput]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingInput(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="p-1 hover:scale-115 transition-transform cursor-pointer"
                      >
                        <Star
                          className={`w-6 h-6 transition-colors ${
                            star <= (hoverRating ?? ratingInput)
                              ? "text-amber-400 fill-amber-400"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Review &amp; Feedback
                </label>
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder={
                    replyToReview
                      ? "Write your reply..."
                      : "How was the code quality, documentation, and setup experience? Be honest to help fellow founders."
                  }
                  rows={3}
                  className="w-full rounded-xl border border-border/70 bg-background/80 px-4 py-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all resize-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsFormOpen(false);
                    setReplyToReview(null);
                  }}
                  className="rounded-xl font-bold text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  size="sm"
                  className="rounded-xl font-bold text-xs px-5 bg-primary text-primary-foreground hover:brightness-105 transition-all shadow-xs"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      <span>{replyToReview ? "Post Reply" : "Submit Review"}</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="p-4 rounded-xl bg-background/50 border border-border/50 text-center space-y-3">
              <p className="text-xs text-muted-foreground">You must be signed in to submit a verified review.</p>
              <Button asChild size="sm" className="rounded-xl font-bold text-xs">
                <Link href={`/handler/sign-in?redirectTo=/products/${productId}`}>Sign In to Review</Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 4. Reviews List / Zero State */}
      <div className="space-y-4">
        {loadingReviews ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Loading reviews...</span>
          </div>
        ) : parentReviews.length === 0 ? (
          /* High-Trust Warm Zero State */
          <div className="flex flex-col items-center justify-center py-12 px-6 rounded-2xl border border-dashed border-border/60 bg-muted/10 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Star className="w-5 h-5 fill-amber-500/20" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Be the first to review this release</h4>
              <p className="text-xs text-muted-foreground max-w-md">
                Have you evaluated, tested, or deployed this code? Share your experience to help the developer community.
              </p>
            </div>
            {!isFormOpen && (
              <Button
                onClick={() => {
                  if (!userLoggedIn) {
                    toast.error("Please sign in to write a review!");
                    return;
                  }
                  setIsFormOpen(true);
                }}
                variant="outline"
                size="sm"
                className="rounded-xl font-bold text-xs border-border/60 mt-1 hover:bg-muted/40"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                <span>Write First Review</span>
              </Button>
            )}
          </div>
        ) : (
          /* List of Reviews */
          <div className="space-y-4">
            {parentReviews.map((rev) => {
              const replies = repliesMap[rev.id] || [];
              const initials = (rev.user.name || rev.user.email || "B")
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <div
                  key={rev.id}
                  className="p-5 rounded-2xl border border-border/40 bg-card/40 hover:bg-card/70 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-foreground">
                            {rev.user.name || "Verified Builder"}
                          </p>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Verified</span>
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {new Date(rev.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Star Rating Display */}
                    <div className="flex items-center gap-1 text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < rev.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal pl-11">
                    {rev.comment}
                  </p>

                  {/* Actions: Helpful button & reply */}
                  <div className="flex items-center justify-between pl-11 pt-1 text-xs">
                    <button
                      onClick={() => handleToggleReviewLike(rev.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                        rev.userLiked
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                      }`}
                    >
                      <ThumbsUp className={`w-3 h-3 ${rev.userLiked ? "fill-current" : ""}`} />
                      <span>Helpful {rev.likesCount > 0 ? `(${rev.likesCount})` : ""}</span>
                    </button>

                    <button
                      onClick={() => {
                        if (!userLoggedIn) {
                          toast.error("Please sign in to reply!");
                          return;
                        }
                        setReplyToReview(rev);
                        setIsFormOpen(true);
                      }}
                      className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      Reply
                    </button>
                  </div>

                  {/* Nested Replies */}
                  {replies.length > 0 && (
                    <div className="mt-3 pl-11 space-y-2 border-l-2 border-border/40 ml-4">
                      {replies.map((reply) => (
                        <div key={reply.id} className="p-3 rounded-xl bg-muted/30 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">
                              {reply.user.name || "Verified Builder"}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {new Date(reply.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          <p className="text-muted-foreground">{reply.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
