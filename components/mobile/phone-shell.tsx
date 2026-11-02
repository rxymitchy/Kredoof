import { SiteDock } from "@/components/layout/site-dock";
import { cn } from "@/lib/utils";

export function PhoneShell({
  children,
  className,
  width = "default",
}: {
  children: React.ReactNode;
  className?: string;
  width?: "default" | "narrow" | "wide";
}) {
  return (
    <div className="relative min-h-dvh bg-canvas">
      <SiteDock />
      <main
        className={cn(
          "relative mx-auto w-full px-4 pb-20 pt-24 sm:px-6 sm:pb-20 sm:pt-32 lg:px-8",
          width === "narrow" && "max-w-md",
          width === "default" && "max-w-6xl",
          width === "wide" && "max-w-6xl",
          className
        )}
      >
        {children}
      </main>
    </div>
  );
}
