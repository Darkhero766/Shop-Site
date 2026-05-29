import { Review } from "@/lib/supabase";
import { Star, BadgeCheck, MessageSquare } from "lucide-react";

interface ReviewSectionProps {
  reviews: Review[];
}

function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-3 text-right text-muted-foreground font-medium">{star}</span>
      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-5 text-muted-foreground">{count}</span>
    </div>
  );
}

function ReviewAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const colors = [
    "bg-violet-100 text-violet-700",
    "bg-emerald-100 text-emerald-700",
    "bg-sky-100 text-sky-700",
    "bg-rose-100 text-rose-700",
    "bg-amber-100 text-amber-700",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${color}`}>
      {initials || "?"}
    </div>
  );
}

export function ReviewSection({ reviews }: ReviewSectionProps) {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-16 bg-muted/20 rounded-2xl border border-dashed" data-testid="no-reviews-msg">
        <MessageSquare className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-muted-foreground font-medium">No reviews yet</p>
        <p className="text-sm text-muted-foreground/60 mt-1">Be the first to leave a review after your purchase</p>
      </div>
    );
  }

  const avgRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;

  const distribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
  }));

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="flex flex-col sm:flex-row gap-6 items-start bg-muted/20 rounded-2xl p-6 border">
        {/* Big rating */}
        <div className="text-center sm:border-r sm:pr-6 sm:min-w-[110px]">
          <div className="text-5xl font-extrabold text-foreground leading-none" data-testid="avg-rating">
            {avgRating.toFixed(1)}
          </div>
          <div className="flex justify-center gap-0.5 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${i < Math.round(avgRating) ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted"}`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1" data-testid="review-count">
            {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
          </p>
        </div>

        {/* Distribution bars */}
        <div className="flex-1 w-full space-y-1.5">
          {distribution.map(({ star, count }) => (
            <RatingBar key={star} star={star} count={count} total={reviews.length} />
          ))}
        </div>
      </div>

      {/* Review cards */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="bg-card p-5 rounded-2xl border hover:shadow-sm transition-shadow"
            data-testid={`review-${review.id}`}
          >
            <div className="flex gap-3">
              <ReviewAvatar name={review.buyer_name || "Anonymous"} />

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-semibold text-sm leading-tight">
                      {review.buyer_name || "Anonymous"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted"}`}
                          />
                        ))}
                      </div>
                      {review.verified && (
                        <span className="flex items-center text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                          <BadgeCheck className="w-3 h-3 mr-1" />
                          Verified purchase
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(review.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                {review.review_text && (
                  <p className="text-sm text-foreground/80 mt-3 leading-relaxed">
                    "{review.review_text}"
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
