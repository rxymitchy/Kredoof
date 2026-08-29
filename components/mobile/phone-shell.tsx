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
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-20 border-b border-hairline bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <span className="font-heading text-sm font-extrabold tracking-[0.2em]">
            KREDOOF
          </span>
          <span className="hidden text-sm text-muted-foreground sm:block">
            Got the proof? Get the credit.
          </span>
        </div>
      </header>
      <main
        className={cn(
          "mx-auto w-full px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14",
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
