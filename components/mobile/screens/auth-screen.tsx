"use client";

import { type AccountRole } from "@/lib/account-role";
import { AuthForm, type AuthMode } from "@/components/mobile/auth-form";
import { PhoneShell } from "@/components/mobile/phone-shell";

export function AuthScreen({
  initialMode = "signup",
  initialError = null,
  resetToken = "",
  initialRole = "borrower",
  onContinue,
  onBack,
}: {
  initialMode?: AuthMode;
  initialError?: string | null;
  resetToken?: string;
  initialRole?: AccountRole;
  onContinue: (role: AccountRole) => void;
  onBack?: () => void;
}) {
  return (
    <PhoneShell width="narrow">
      <div className="rounded-3xl border border-hairline bg-white p-6 sm:p-8">
        <div className="mb-8 text-center">
          <div className="font-heading text-2xl font-extrabold tracking-[0.12em]">
            KREDOOF
          </div>
          <p className="font-serif mt-2 text-lg italic text-foreground">
            Got the proof? Get the credit.
          </p>
        </div>
        <AuthForm
          initialMode={initialMode}
          initialError={initialError}
          resetToken={resetToken}
          initialRole={initialRole}
          onContinue={onContinue}
        />
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mt-4 block w-full text-center text-sm font-semibold text-mint-deep"
          >
            Back
          </button>
        ) : null}
      </div>
    </PhoneShell>
  );
}
