"use client";

import { ChevronRight } from "lucide-react";
import { PhoneShell } from "@/components/mobile/phone-shell";
import { PrimaryButton } from "@/components/mobile/ui";

const STEPS = [
  "Connect wallet",
  "Kredoof reads on-chain activity",
  "It verifies the records",
  "It understands financial behavior",
  "It checks risk",
  "It issues an explainable credit decision",
];

export function HowItWorksScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <PhoneShell>
      <div className="max-w-3xl">
        <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">
          How it works
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Traditional alternative credit may use M-Pesa data, bank statements,
          or device behavior. Kredoof starts from verified blockchain transaction
          activity.
        </p>
        <p className="font-serif mt-4 text-xl italic text-foreground">
          The transaction itself is the evidence.
        </p>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {STEPS.map((step, i) => (
          <div
            key={step}
            className="flex items-center justify-between rounded-2xl border border-hairline bg-white px-5 py-4"
          >
            <span className="text-sm sm:text-base">
              <span className="mr-2 font-mono text-xs text-[#a9b0a2]">
                {i + 1}
              </span>
              {step}
            </span>
            <ChevronRight size={16} className="text-[#a9b0a2]" />
          </div>
        ))}
      </div>
      <PrimaryButton onClick={onContinue} className="mt-8 sm:w-auto sm:px-8">
        Connect Wallet
      </PrimaryButton>
    </PhoneShell>
  );
}
