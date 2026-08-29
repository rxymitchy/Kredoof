"use client";

import { Lock, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { PhoneShell } from "@/components/mobile/phone-shell";
import { PrimaryButton } from "@/components/mobile/ui";
import { cn } from "@/lib/utils";

export function AuthScreen({ onContinue }: { onContinue: () => void }) {
  const [mode, setAuthMode] = useState<"signin" | "signup">("signin");

  return (
    <PhoneShell width="narrow">
      <div className="rounded-3xl border border-hairline bg-white p-6 sm:p-8">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[18px]"
            style={{ background: "linear-gradient(135deg, #DDF3D6, #8FD9A4)" }}
          >
            <ShieldCheck size={26} color="#1F5A34" />
          </div>
          <div className="font-heading text-2xl font-extrabold">KREDOOF</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Agentic credit underwriting
          </div>
        </div>
        <div className="mb-5 flex rounded-[14px] bg-[#F3F5F1] p-1">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setAuthMode(m)}
              className={cn(
                "font-heading flex-1 rounded-[10px] py-2.5 text-sm font-bold",
                mode === m
                  ? "bg-white text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                  : "text-[#a9b0a2]"
              )}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>
        <div className="mb-3 flex items-center gap-2.5 rounded-[14px] border border-hairline px-3.5 py-3">
          <Mail size={16} className="text-[#a9b0a2]" />
          <input
            placeholder="you@business.co.ke"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <div className="mb-5 flex items-center gap-2.5 rounded-[14px] border border-hairline px-3.5 py-3">
          <Lock size={16} className="text-[#a9b0a2]" />
          <input
            type="password"
            placeholder="Password"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <PrimaryButton onClick={onContinue}>
          {mode === "signin" ? "Sign in" : "Create account"}
        </PrimaryButton>
        <p className="mt-4 text-center text-sm text-[#a9b0a2]">
          Demo prototype — any details continue. Kredoof does not require bank
          or M-Pesa statements.
        </p>
      </div>
    </PhoneShell>
  );
}
