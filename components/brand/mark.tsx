import { cn } from "@/lib/utils";

export const KREDOOF_LOGO_SRC = "/brand/kredoof-logo.png";

/** Official lockup: shield, KREDOOF, and the tagline. */
export function BrandMark({
  className,
  size = 36,
}: {
  className?: string;
  size?: number;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={KREDOOF_LOGO_SRC}
      alt="Kredoof"
      height={size}
      className={cn("shrink-0 object-contain", className)}
      style={{ height: size, width: "auto" }}
    />
  );
}
