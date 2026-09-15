"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { KredoofApp, type AppStage } from "@/components/mobile/kredoof-app";

function OnboardInner() {
  const params = useSearchParams();
  const step = params.get("step");
  const startAt: AppStage =
    step === "how" ? "how" : step === "connect" ? "connect" : "auth";
  const authMode = step === "signin" ? "signin" : "signup";
  const initialError = params.get("error");
  return (
    <KredoofApp
      startAt={startAt}
      initialAuthMode={authMode}
      initialError={initialError}
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
