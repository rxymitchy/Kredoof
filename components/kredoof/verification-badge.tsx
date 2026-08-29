import { BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VerificationStatus } from "@/types";

export function VerificationBadge({
  status,
  className,
}: {
  status: VerificationStatus;
  className?: string;
}) {
  const verified = status === "verified";

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-md border-transparent font-medium",
        verified
          ? "bg-verified/12 text-verified"
          : "bg-warning/12 text-warning",
        className
      )}
    >
      {verified ? <BadgeCheck className="size-3" /> : null}
      {verified ? "Verified" : "Unverified"}
    </Badge>
  );
}
