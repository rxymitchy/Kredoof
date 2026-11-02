import { cn } from "@/lib/utils";

/** Proof gauge — a ring with a live slice. Not a wordmark clone of anyone else. */
export function BrandMark({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <circle
        cx="32"
        cy="32"
        r="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="5.5"
        opacity="0.18"
      />
      <path
        d="M32 10 A22 22 0 1 1 14.8 43.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      <circle cx="32" cy="32" r="8" fill="currentColor" />
    </svg>
  );
}
