import { cn } from "@/lib/utils";
import type { FactorRating } from "@/types";

const ratingStyles: Record<FactorRating, string> = {
  excellent: "bg-verified/15 text-verified",
  strong: "bg-verified/12 text-verified",
  good: "bg-foreground/8 text-foreground",
  low: "bg-foreground/8 text-muted-foreground",
  medium: "bg-warning/15 text-warning",
};

export function RatingPill({
  rating,
  className,
}: {
  rating: FactorRating;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize",
        ratingStyles[rating],
        className
      )}
    >
      {rating}
    </span>
  );
}
