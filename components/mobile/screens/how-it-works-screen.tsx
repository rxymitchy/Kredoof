"use client";

import Link from "next/link";
import { SiteDock } from "@/components/layout/site-dock";
import { FilmStill } from "@/components/marketing/film-still";
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
    body: "We analyze your transaction history: what comes in, what goes out, and how consistently you move money.",
  },
  {
    n: "03",
    title: "Get your credit profile",
    body: "We turn your financial activity into a credit profile that helps lenders understand your ability to repay.",
  },
  {
    n: "04",
    title: "Meet your lender",
    body: "If you qualify, lenders can review your profile and decide whether to offer you a loan.",
  },
  {
    n: "05",
    title: "Get funded",
    body: "A lender funds your loan directly. You get the money.",
  },
  {
    n: "06",
    title: "Pay back, little by little",
    body: "Repay your lender in manageable daily instalments.",
  },
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
            Banks want paperwork.
            <br />
            We look at your money.
          </h1>
        </div>
      </div>
      <main className="mx-auto max-w-4xl px-5 pb-28 pt-8 sm:px-8 sm:pb-24">
        <div className="max-w-xl space-y-4 text-base leading-7 text-muted-foreground sm:text-lg">
          <p>Your wallet has a financial history. We help it count.</p>
          <p>
            Connect your wallet. Kredoof looks at the money coming in, the money
            going out, and how you manage it.
          </p>
          <p>
            We use that activity to build your credit profile. If you qualify,
            lenders can review it and decide whether to fund your loan.
          </p>
          <p>
            Kredoof isn’t a bank. We’re a smarter way to show what your money
            says about you.
          </p>
        </div>

        <ol className="mt-12 grid gap-0 sm:mt-16">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 70}>
              <li className="grid gap-2 border-t border-hairline py-6 sm:grid-cols-[4.5rem_1fr] sm:items-baseline sm:gap-3 sm:py-8">
                <span className="font-mono text-xs tracking-[0.18em] text-mint-deep">
                  {step.n}
                </span>
                <div>
                  <h2 className="text-xl tracking-[-0.03em] sm:text-2xl">
                    {step.title}
                  </h2>
                  <p className="mt-2 text-base leading-7 text-muted-foreground">
                    {step.body}
                  </p>
                </div>
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
