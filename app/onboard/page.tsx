"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { type AuthMode } from "@/components/mobile/auth-form";
import { KredoofApp, type AppStage } from "@/components/mobile/kredoof-app";

function OnboardInner() {
  const params = useSearchParams();
  const step = params.get("step");
  const startAt: AppStage =
    step === "how" ? "how" : step === "connect" ? "connect" : "auth";
  const authMode: AuthMode =
    step === "signin"
      ? "signin"
      : step === "forgot"
        ? "forgot"
        : step === "reset"
          ? "reset"
          : "signup";
  const initialError = params.get("error");
  const resetToken = params.get("token") ?? "";
  const initialRole = params.get("as") === "lender" ? "lender" : "borrower";
  return (
    <KredoofApp
      startAt={startAt}
      initialAuthMode={authMode}
      initialError={initialError}
      resetToken={resetToken}
      initialRole={initialRole}
    />
  );
}

export default function OnboardPage() {
  return (
    <Suspense fallback={null}>
      <OnboardInner />
    </Suspense>
  );
}
