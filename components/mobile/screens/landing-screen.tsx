"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteDock } from "@/components/layout/site-dock";
import { FilmStill, ParallaxFrame } from "@/components/marketing/film-still";
import { Reveal } from "@/components/marketing/reveal";

const STEPS = [
  {
    n: "01",
    title: "Connect your wallet",
    body: "Sign up and connect your Avalanche wallet. No piles of paperwork.",
  },
  {
    n: "02",
    title: "We look at your money",
    body: "Money in, money out, and how you manage it. That’s your history.",
  },
  {
    n: "03",
    title: "Get funded",
    body: "We build your credit profile. If you qualify, a lender can fund you.",
  },
];

const TICKER = [
  "Avalanche wallet",
  "Connect on Avalanche",
  "Money in",
  "Money out",
  "Credit profile",
  "Get funded",
];

export function LandingScreen() {
  const [signedIn, setSignedIn] = useState(false);
  const [role, setRole] = useState<"borrower" | "lender">("borrower");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { signedIn?: boolean; role?: "borrower" | "lender" }) => {
        setSignedIn(Boolean(data.signedIn));
        if (data.role === "lender") setRole("lender");
      })
      .catch(() => undefined);
  }, []);

  const creditHref = signedIn
    ? role === "lender"
      ? "/lend"
      : "/onboard?step=connect"
    : "/onboard?step=signup";
  const lendHref =
    signedIn && role === "lender" ? "/lend" : "/onboard?step=signup&as=lender";

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-canvas text-foreground">
      <SiteDock tone="ghost" fadeOnScroll />

      <section className="relative min-h-[100dvh] overflow-hidden">
        <div className="absolute inset-0">
          <ParallaxFrame className="h-full min-h-[120%]" strength={0.1}>
            <FilmStill
              src="/images/hero.jpg"
              alt="A shopkeeper at a till with a phone nearby"
              className="h-full min-h-[100dvh] w-full"
              imgClassName="min-h-[100dvh]"
            />
          </ParallaxFrame>
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/25" />
        </div>

        <div className="relative z-10 flex min-h-[100dvh] flex-col justify-end px-5 pb-32 pt-24 text-white lg:max-w-3xl lg:justify-center lg:px-16 lg:pb-20">
          <h1 className="display text-[clamp(2.35rem,9vw,5.4rem)]">
            Got the{" "}
            <em className="font-serif pr-[0.06em] italic font-medium tracking-[-0.04em] text-[#8fd9a4]">
              proof
            </em>
            ?
            <br />
            Get the credit.
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-6 text-white/80 sm:text-lg lg:mt-7">
            Your wallet has a financial history. We help it count — then lenders
            can fund you.
          </p>
          <div className="mt-8 hidden gap-3 lg:flex">
            <Link
              href={creditHref}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-mint-deep px-6 text-sm font-medium text-white"
            >
              {signedIn ? "Continue" : "Get credit"}
            </Link>
            <Link
              href={lendHref}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/25 bg-white/10 px-6 text-sm font-medium text-white backdrop-blur-md"
            >
              Lend
            </Link>
          </div>
        </div>
      </section>

      <div className="relative z-10 overflow-hidden border-y border-hairline bg-canvas">
        <div className="marquee-track flex gap-10 py-3.5 font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
          {[...TICKER, ...TICKER, ...TICKER].map((item, i) => (
            <span key={`${item}-${i}`} className="flex items-center gap-10">
              {item}
              <span className="text-mint-deep">·</span>
            </span>
          ))}
        </div>
      </div>

      <section className="relative min-h-[78dvh] overflow-hidden bg-[#0c0d0b] text-white">
        <ParallaxFrame className="absolute inset-0" strength={0.16}>
          <FilmStill
            src="/images/count.jpg"
            alt="Hands counting Kenyan shilling notes at a workshop bench"
            className="h-[120%] w-full"
            imgClassName="h-full opacity-70"
          />
        </ParallaxFrame>
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />
        <Reveal className="relative z-10 mx-auto flex min-h-[78dvh] max-w-5xl flex-col justify-end px-5 py-16 sm:px-8 lg:px-12">
          <p className="display text-[clamp(2.4rem,9vw,4.8rem)]">
            Your money
            <br />
            <span className="text-[#8fd9a4]">already speaks.</span>
          </p>
          <p className="mt-6 max-w-md text-base leading-7 text-white/75">
            Kredoof isn’t a bank. We’re a smarter way to show what your money
            says about you.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-20 pt-20 sm:px-6 sm:pb-28 sm:pt-28">
        <Reveal>
          <h2 className="display mx-auto max-w-3xl text-center text-[clamp(2rem,8vw,3.4rem)]">
            How it works.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-0 sm:mt-16">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 90}>
              <div className="grid items-baseline gap-2 border-t border-hairline py-7 sm:grid-cols-[5rem_1fr_1.2fr] sm:gap-3 sm:py-8">
                <p className="font-mono text-xs tracking-[0.18em] text-mint-deep">
                  {step.n}
                </p>
                <h3 className="text-xl tracking-[-0.04em] sm:text-3xl">
                  {step.title}
                </h3>
                <p className="text-base leading-7 text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-28 sm:px-4 lg:grid lg:grid-cols-2 lg:overflow-visible lg:pb-8">
        <Link
          href={creditHref}
          className="group relative min-h-[20rem] w-[86vw] shrink-0 snap-center overflow-hidden rounded-[1.75rem] text-white sm:min-h-[22rem] lg:w-auto"
        >
          <FilmStill
            src="/images/hero.jpg"
            alt=""
            className="absolute inset-0 h-full w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/20" />
          <div className="relative flex h-full min-h-[20rem] flex-col justify-end px-6 py-10 sm:min-h-[22rem] sm:px-12 sm:py-12">
            <p className="text-sm text-white/70">Need a loan</p>
            <h2 className="display mt-3 text-[clamp(2rem,6vw,3.4rem)]">
              Get credit
            </h2>
            <p className="mt-3 max-w-sm text-base leading-7 text-white/75">
              Connect your wallet. If you qualify, lenders can fund you.
            </p>
            <span className="mt-8 inline-flex text-sm text-[#8fd9a4]">
              {signedIn ? "Continue →" : "Start →"}
            </span>
          </div>
        </Link>
        <Link
          href={lendHref}
          className="group relative min-h-[20rem] w-[86vw] shrink-0 snap-center overflow-hidden rounded-[1.75rem] lg:w-auto"
        >
          <FilmStill
            src="/images/auth.jpg"
            alt=""
            className="absolute inset-0 h-full w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d0b]/80 via-[#0c0d0b]/35 to-transparent" />
          <div className="relative flex h-full min-h-[20rem] flex-col justify-end px-6 py-10 text-white sm:min-h-[22rem] sm:px-12 sm:py-12">
            <p className="text-sm text-[#8fd9a4]">Want to fund</p>
            <h2 className="display mt-3 text-[clamp(2rem,6vw,3.4rem)]">
              {signedIn && role === "lender" ? "Your desk" : "Lend"}
            </h2>
            <p className="mt-3 max-w-sm text-base leading-7 text-white/75">
              Review a credit profile and decide whether to fund the loan.
            </p>
            <span className="mt-8 inline-flex text-sm text-white/80">
              Open the desk →
            </span>
          </div>
        </Link>
      </section>

      <footer className="flex flex-col items-center gap-3 px-6 py-12 pb-28 text-center text-sm text-muted-foreground lg:pb-12">
        <p>Kredoof. Got the proof? Get the credit.</p>
        {signedIn ? (
          <button
            type="button"
            className="min-h-11 font-medium text-foreground underline-offset-4 hover:underline"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" }).catch(
                () => null
              );
              setSignedIn(false);
            }}
          >
            Sign out
          </button>
        ) : (
          <Link
            href="/onboard?step=signin"
            className="inline-flex min-h-11 items-center font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        )}
      </footer>

      <div className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-2 gap-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
        <Link
          href={creditHref}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-mint-deep text-sm font-medium text-white shadow-[0_12px_30px_-12px_rgba(20,122,67,0.7)]"
        >
          Get credit
        </Link>
        <Link
          href={lendHref}
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/10 bg-white/90 text-sm font-medium backdrop-blur-md"
        >
          Lend
        </Link>
      </div>
    </div>
  );
}
