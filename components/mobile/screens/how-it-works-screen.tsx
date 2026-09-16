"use client";

import { ChevronRight } from "lucide-react";
import { PhoneShell } from "@/components/mobile/phone-shell";
import { PrimaryButton } from "@/components/mobile/ui";

const STEPS = [
  "Connect your wallet",
  "We look at your payments",
  "We check they are real",
  "We see how money comes in and goes out",
  "We look for warning signs",
  "You get a simple yes, no, or how much",
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
          already moved through your wallet.
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
      <PrimaryButton onClick={onContinue} className="mt-8 sm:w-auto sm:px-8">
        Sign up
      </PrimaryButton>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="mt-4 block text-sm text-muted-foreground"
        >
          Back
        </button>
      ) : null}
    </PhoneShell>
  );
}
