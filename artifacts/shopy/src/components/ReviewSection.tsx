import { Review } from "@/lib/supabase";
import { Star, BadgeCheck } from "lucide-react";

interface ReviewSectionProps {
  reviews: Review[];
}

export function ReviewSection({ reviews }: ReviewSectionProps) {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-xl" data-testid="no-reviews-msg">
        <p className="text-muted-foreground">No reviews yet.</p>
      </div>
    );
  }

  const avgRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6 border-b pb-4">
        <div className="flex items-center gap-1">
          <Star className="w-6 h-6 fill-primary text-primary" />
          <span className="text-2xl font-bold" data-testid="avg-rating">{avgRating.toFixed(1)}</span>
        </div>
        <span className="text-muted-foreground" data-testid="review-count">· {reviews.length} reviews</span>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="bg-card p-4 rounded-xl border" data-testid={`review-${review.id}`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium flex items-center gap-2">
                  {review.buyer_name || "Anonymous"}
                  {review.verified && (
                    <span className="flex items-center text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <BadgeCheck className="w-3 h-3 mr-1" />
                      Verified
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-0.5 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-3 h-3 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted"}`} 
                    />
                  ))}
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(review.created_at).toLocaleDateString()}
              </span>
            </div>
            {review.review_text && (
              <p className="text-sm text-foreground/80 mt-3">{review.review_text}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}