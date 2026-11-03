"use client";

import Link from "next/link";
import { useState } from "react";
import { type AccountRole } from "@/lib/account-role";
import { AuthForm, type AuthMode } from "@/components/mobile/auth-form";
import { BrandMark } from "@/components/brand/mark";
import { FilmStill } from "@/components/marketing/film-still";

export function AuthScreen({
  initialMode = "signup",
  initialError = null,
  initialNotice = null,
  resetToken = "",
  initialRole = "borrower",
  onContinue,
  onBack,
}: {
  initialMode?: AuthMode;
  initialError?: string | null;
  initialNotice?: string | null;
  resetToken?: string;
  initialRole?: AccountRole;
  onContinue: (role: AccountRole) => void;
  onBack?: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const heading =
    mode === "signin"
      ? "Welcome back"
      : mode === "forgot"
        ? "Reset your password"
        : mode === "reset"
          ? "Choose a new password"
          : mode === "confirm"
            ? "Confirm your email"
          : mode === "totp"
            ? "Enter your app code"
            : mode === "totp-setup"
              ? "Authenticator"
              : "Create your account";
  const blurb =
    mode === "signin"
      ? "Same email or phone as last time."
      : mode === "forgot"
        ? "We’ll email a reset link if that email or phone has an account."
        : mode === "reset"
          ? "Use at least 10 characters, with letters and a number."
          : mode === "confirm"
            ? "Tap the button to confirm this inbox. Then sign in."
          : mode === "totp"
            ? "Open Google Authenticator or Authy and type the 6-digit code."
            : mode === "totp-setup"
              ? "The account in your app should read Kredoof : your email."
              : "Tell us who you are. We look at the money that already moved — not a stack of statements.";

  return (
    <div className="grid min-h-dvh bg-canvas lg:grid-cols-2">
      <aside className="relative h-[38vh] min-h-[220px] overflow-hidden sm:h-[42vh] lg:h-auto lg:min-h-dvh">
        <FilmStill
          src="/images/auth.jpg"
          alt="Two people exchanging Kenyan shillings over a stall counter"
          className="absolute inset-0 h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/15" />
        <Link
          href="/"
          className="absolute left-4 top-[max(0.85rem,env(safe-area-inset-top))] z-10 flex min-h-10 items-center gap-2 rounded-full bg-black/45 px-3 py-2 text-white backdrop-blur-md"
        >
          <BrandMark size={36} />
        </Link>
        <div className="absolute inset-x-0 bottom-0 z-10 p-5 sm:p-10">
          <p className="display text-[1.7rem] text-white sm:text-4xl lg:text-5xl">
            The till is
            <br />
            already open.
          </p>
          <p className="mt-2 hidden max-w-sm text-sm leading-6 text-white/80 sm:block sm:text-base">
            Shillings on the counter. USDT in the wallet. That is the proof we
            read.
          </p>
        </div>
      </aside>

      <main className="flex items-start justify-center px-4 py-7 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-10 sm:py-10 lg:items-center">
        <div className="w-full max-w-md fade-up">
          <h1 className="display text-[1.85rem] text-pretty sm:text-[2.4rem]">
            {heading}
          </h1>
          <p className="mt-2 mb-6 text-sm leading-6 text-muted-foreground sm:mb-8">
            {blurb}
          </p>
          <AuthForm
            initialMode={initialMode}
            initialError={initialError}
            initialNotice={initialNotice}
            initialRole={initialRole}
            resetToken={resetToken}
            onContinue={onContinue}
            onModeChange={setMode}
          />
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="mt-5 inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Back
            </button>
          ) : (
            <Link
              href="/"
              className="mt-5 inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Back to home
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
