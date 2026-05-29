import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  onRatingChange?: (rating: number) => void;
  readOnly?: boolean;
}

export function StarRating({ rating, maxRating = 5, onRatingChange, readOnly = false }: StarRatingProps) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxRating }).map((_, i) => (
        <button
          key={i}
          type="button"
          disabled={readOnly}
          onClick={() => onRatingChange?.(i + 1)}
          className={`p-0 focus:outline-none ${readOnly ? "cursor-default" : "cursor-pointer transition-transform hover:scale-110"}`}
        >
          <Star
            className={`h-5 w-5 ${
              i < rating ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted"
            }`}
          />
        </button>
      ))}
    </div>
  );
}