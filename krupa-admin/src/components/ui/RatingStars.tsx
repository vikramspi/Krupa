import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

interface RatingStarsProps {
  /** Null renders nothing at all — never a zero or placeholder rating. */
  rating: number | null;
  className?: string;
  size?: "sm" | "md";
}

/** Five-star display. The numeric rating is exposed to assistive tech as text. */
export function RatingStars({ rating, className, size = "sm" }: RatingStarsProps) {
  if (rating === null) return null;
  const iconSize = size === "sm" ? "size-3.5" : "size-4";
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      <span className="sr-only">Rated {rating} out of 5</span>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        return (
          <span key={i} className={cn("relative inline-block", iconSize)} aria-hidden="true">
            <Star className={cn("absolute inset-0 text-ink-200", iconSize)} fill="currentColor" strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cn("text-sun-400", iconSize)} fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Compact "★ 4.8 (412)" chip used on cards. */
export function RatingPill({ rating, count, className }: { rating: number | null; count?: number; className?: string }) {
  if (rating === null) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-semibold text-ink-900",
        /\btext-(xs|sm|base)\b/.test(className ?? "") ? null : "text-sm",
        className,
      )}
    >
      <Star className="size-4 text-sun-400" fill="currentColor" strokeWidth={0} aria-hidden="true" />
      <span>
        <span className="sr-only">Rated </span>
        {rating.toFixed(1)}
        <span className="sr-only"> out of 5</span>
      </span>
      {count !== undefined && (
        <span className="font-medium text-ink-500">
          ({count}
          <span className="sr-only"> {count === 1 ? "review" : "reviews"}</span>)
        </span>
      )}
    </span>
  );
}
