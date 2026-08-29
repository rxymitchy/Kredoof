import { cn } from "@/lib/utils";

export function AddressDisplay({
  address,
  className,
}: {
  address: string;
  className?: string;
}) {
  return (
    <code
      className={cn(
        "font-mono text-[13px] tracking-tight text-foreground",
        className
      )}
    >
      {address}
    </code>
  );
}
