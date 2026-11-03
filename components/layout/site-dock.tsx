"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand/mark";
import { cn } from "@/lib/utils";

export function SiteDock({
  tone = "light",
  fadeOnScroll = false,
}: {
  tone?: "light" | "dark" | "ghost";
  fadeOnScroll?: boolean;
}) {
  const [signedIn, setSignedIn] = useState(false);
  const [role, setRole] = useState<"borrower" | "lender">("borrower");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { signedIn?: boolean; role?: "borrower" | "lender" }) => {
        setSignedIn(Boolean(data.signedIn));
        if (data.role === "lender") setRole("lender");
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!fadeOnScroll) return;
    const onScroll = () => {
      setScrolled((window.scrollY || document.documentElement.scrollTop) > 32);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll);
    };
  }, [fadeOnScroll]);

  const localPreview = process.env.NODE_ENV === "development";
  const primaryHref = localPreview
    ? "/dashboard"
    : signedIn
      ? role === "lender"
        ? "/lend"
        : "/onboard?step=connect"
      : "/onboard?step=signup";
  const primaryLabel = signedIn
    ? role === "lender"
      ? "Desk"
      : "Continue"
    : "Credit";

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4">
      <nav
        className={cn(
          "pointer-events-auto flex w-full max-w-3xl items-center justify-between gap-2 rounded-full border px-2 py-1.5 pl-3 sm:gap-3 sm:px-3 sm:pl-4",
          "transition-[opacity,transform] duration-500 ease-out",
          tone === "dark" && "border-white/10 bg-[#0c0d0b]/70 text-white",
          tone === "light" &&
            "border-black/10 bg-white/75 text-foreground shadow-[0_12px_40px_-24px_rgba(12,13,11,0.45)] backdrop-blur-xl",
          tone === "ghost" &&
            "border-white/15 bg-white/10 text-white shadow-none backdrop-blur-md",
          fadeOnScroll && "dock-scroll-fade",
          fadeOnScroll && scrolled && "pointer-events-none -translate-y-3 opacity-0"
        )}
      >
        <Link href="/" className="flex min-h-10 items-center gap-2">
          <BrandMark size={20} />
          <span className="text-[15px] font-medium tracking-[-0.04em]">
            Kredoof
          </span>
        </Link>
        <div className="flex items-center gap-0.5 sm:gap-2">
          <Link
            href="/how"
            className={cn(
              "inline-flex min-h-10 items-center rounded-full px-2.5 text-[13px] sm:px-3",
              tone === "ghost"
                ? "text-white/70 transition hover:text-white"
                : "text-muted-foreground transition hover:text-foreground"
            )}
          >
            How
            <span className="hidden sm:inline">&nbsp;it works</span>
          </Link>
          {!signedIn ? (
            <Link
              href="/onboard?step=signin"
              className={cn(
                "inline-flex min-h-10 items-center rounded-full px-2.5 text-[13px] sm:px-3",
                tone === "ghost"
                  ? "text-white/70 transition hover:text-white"
                  : "text-muted-foreground transition hover:text-foreground"
              )}
            >
              Sign in
            </Link>
          ) : null}
          <Link
            href={primaryHref}
            className="inline-flex min-h-10 items-center rounded-full bg-mint-deep px-3.5 text-[13px] font-medium text-white sm:px-5"
          >
            <span className="sm:hidden">{primaryLabel}</span>
            <span className="hidden sm:inline">
              {signedIn
                ? role === "lender"
                  ? "Your desk"
                  : "Continue"
                : "Get credit"}
            </span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
