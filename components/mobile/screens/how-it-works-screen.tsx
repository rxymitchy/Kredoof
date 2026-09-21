"use client";

import { ChevronRight } from "lucide-react";
import { PhoneShell } from "@/components/mobile/phone-shell";
import { PrimaryButton } from "@/components/mobile/ui";

const STEPS = [
  "A business signs up and connects a wallet",
  "We look at real USDC/USDT payments",
  "If they qualify, the file lands on the lender desk",
  "A lender pays KSh 100 for that exclusive file",
  "The lender funds. The borrower receives the amount we show, minus 1%",
  "The borrower pays back the amount we show, on time. Daily interest goes to the funder",
];

export function HowItWorksScreen({
  onContinue,
  onBack,
}: {
  onContinue: () => void;
  onBack?: () => void;
}) {
  return (
    <PhoneShell>
      <div className="max-w-3xl">
        <h1 className="font-heading text-3xl font-extrabold text-foreground sm:text-4xl">
          How it works
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Banks often ask for paper statements. We look at the money that
          already moved through the wallet, then put a qualified file in front
          of a lender.
        </p>
        <p className="font-serif mt-4 text-xl italic text-foreground">
          Your payments are the proof.
        </p>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {STEPS.map((step, i) => (
          <div
            key={step}
            className="flex items-center justify-between rounded-2xl border border-hairline bg-white px-5 py-4"
          >
            <span className="text-sm text-foreground sm:text-base">
              <span className="mr-2 font-mono text-xs text-muted-foreground">
                {i + 1}
              </span>
              {step}
            </span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <PrimaryButton onClick={onContinue} className="sm:w-auto sm:px-8">
          Get credit
        </PrimaryButton>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.location.href = "/onboard?step=signup&as=lender";
            }
          }}
          className="font-heading inline-flex items-center justify-center rounded-2xl border border-hairline bg-white px-8 py-3.5 text-sm font-bold text-foreground"
        >
          Become a lender
        </button>
      </div>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="mt-4 block text-sm font-semibold text-mint-deep"
        >
          Back
        </button>
      ) : null}
    </PhoneShell>
  );
}
