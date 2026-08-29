import { cn } from "@/lib/utils";

export function HashDisplay({
  hash,
  className,
}: {
  hash: string;
  className?: string;
}) {
  return (
    <code
      className={cn(
        "font-mono text-[13px] tracking-tight text-muted-foreground",
        className
      )}
    >
      {hash}
    </code>
  );
}
