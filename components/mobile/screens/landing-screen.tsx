"use client";

import { ShieldCheck } from "lucide-react";
import { PhoneShell } from "@/components/mobile/phone-shell";
import { PrimaryButton } from "@/components/mobile/ui";

export function LandingScreen({
  onConnect,
  onHowItWorks,
  onSignIn,
}: {
  onConnect: () => void;
  onHowItWorks: () => void;
  onSignIn: () => void;
}) {
  return (
    <PhoneShell>
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Agentic credit underwriting
          </p>
          <h1 className="font-heading mt-3 text-4xl font-extrabold tracking-[0.08em] sm:text-5xl lg:text-6xl">
            KREDOOF
          </h1>
          <p className="font-serif mt-3 text-xl text-foreground italic sm:text-2xl">
            Got the proof? Get the credit.
          </p>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            Turn your verified blockchain transaction history into a credit
            profile lenders can understand.
          </p>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            Many businesses have real financial activity but lack the collateral
            or traditional credit history lenders require. Kredoof turns
            verified on-chain activity into evidence lenders can use.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <PrimaryButton onClick={onConnect} className="sm:w-auto sm:px-8">
              Connect Wallet
            </PrimaryButton>
            <button
              type="button"
              onClick={onHowItWorks}
              className="font-heading w-full rounded-2xl border border-hairline bg-white px-8 py-3.5 text-sm font-bold sm:w-auto"
            >
              See How It Works
            </button>
          </div>
          <button
            type="button"
            onClick={onSignIn}
            className="mt-4 text-left text-sm text-muted-foreground"
          >
            Or continue with email — demo only
          </button>
          <p className="mt-8 text-sm text-muted-foreground">
            Assessment KES 50–150 · 1% success fee on disbursed loans.
          </p>
        </div>

        <div className="rounded-3xl border border-hairline bg-white p-6 shadow-[0_24px_60px_-28px_rgba(20,23,28,0.18)] sm:p-8">
          <p className="font-heading text-sm font-bold">The transaction is the evidence</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {["Wallet", "Verified activity", "Credit decision"].map((step, i) => (
              <div
                key={step}
                className="rounded-2xl bg-[#F4F7F3] px-4 py-5 text-center"
              >
                <div className="font-mono text-xs text-muted-foreground">
                  0{i + 1}
                </div>
                <div className="mt-2 text-sm font-semibold">{step}</div>
              </div>
            ))}
          </div>
          <div
            className="mt-6 flex items-center justify-center rounded-2xl py-10"
            style={{
              background: "linear-gradient(135deg, #DDF3D6 0%, #8FD9A4 100%)",
            }}
          >
            <div className="text-center">
              <ShieldCheck className="mx-auto text-[#1F5A34]" size={36} />
              <p className="font-heading mt-3 text-sm font-bold text-[#123A22]">
                Avalanche · USDC / USDT
              </p>
              <p className="mt-1 text-xs text-[#215B36]/80">
                No bank or M-Pesa statements
              </p>
            </div>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
