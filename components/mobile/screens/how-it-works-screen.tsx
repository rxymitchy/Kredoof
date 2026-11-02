"use client";

import Link from "next/link";
import { SiteDock } from "@/components/layout/site-dock";
import { FilmStill } from "@/components/marketing/film-still";
import { Reveal } from "@/components/marketing/reveal";

const STEPS = [
  "You sign up and show us money on your phone.",
  "We check what came in and what went out.",
  "If it looks good, you can borrow — and people who want to lend can see it.",
  "Someone puts in shillings and takes you — just them.",
  "We send you the money.",
  "You pay them back, a bit each day.",
];

export function HowItWorksScreen({
  onContinue,
  onBack,
}: {
  onContinue: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-canvas text-foreground">
      <SiteDock />
      <div className="relative h-[46vh] min-h-[260px] overflow-hidden sm:h-[54vh]">
        <FilmStill
          src="/images/count.jpg"
          alt="Hands counting Kenyan shilling notes"
          className="absolute inset-0 h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/20 to-black/25" />
        <div className="absolute inset-x-0 bottom-0 px-5 pb-6 sm:px-8">
          <p className="text-sm text-muted-foreground">How it works</p>
          <h1 className="display mt-2 text-[clamp(2.1rem,9vw,4.4rem)]">
            Banks want papers.
            <br />
            We look at the money.
          </h1>
        </div>
      </div>
      <main className="mx-auto max-w-4xl px-5 pb-28 pt-8 sm:px-8 sm:pb-24">
        <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
          You show us money that already moved. If it looks good, you can
          borrow — or someone can lend you shillings. Kredoof is not a bank.
        </p>

        <ol className="mt-10 grid gap-0 sm:mt-16">
          {STEPS.map((step, i) => (
            <Reveal key={step} delay={i * 70}>
              <li className="grid gap-2 border-t border-hairline py-6 sm:grid-cols-[4.5rem_1fr] sm:items-baseline sm:gap-3 sm:py-8">
                <span className="font-mono text-xs tracking-[0.18em] text-mint-deep">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-lg tracking-[-0.03em] sm:text-2xl">{step}</p>
              </li>
            </Reveal>
          ))}
        </ol>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-mint-deep px-7 text-sm font-medium text-white"
          >
            Get credit
          </button>
          <Link
            href="/onboard?step=signup&as=lender"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-hairline bg-white px-7 text-sm font-medium"
          >
            I want to lend
          </Link>
        </div>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mt-6 inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Back
          </button>
        ) : null}
      </main>
    </div>
  );
}
