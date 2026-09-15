"use client";

import { useRouter } from "next/navigation";
import { HowItWorksScreen } from "@/components/mobile/screens/how-it-works-screen";

export default function HowPage() {
  const router = useRouter();
  return (
    <HowItWorksScreen
      onContinue={() => router.push("/onboard?step=signup")}
      onBack={() => router.push("/")}
    />
  );
}
