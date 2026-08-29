import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  emphasis = false,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn("bg-card/80", className)}>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            "font-semibold tracking-tight text-foreground",
            emphasis ? "text-3xl" : "text-2xl"
          )}
        >
          {value}
        </p>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
