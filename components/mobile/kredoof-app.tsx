"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { type AuthMode } from "@/components/mobile/auth-form";
import { AuthScreen } from "@/components/mobile/screens/auth-screen";
import { BundlingScreen } from "@/components/mobile/screens/bundling-screen";
import { ConnectScreen } from "@/components/mobile/screens/connect-screen";
import { HowItWorksScreen } from "@/components/mobile/screens/how-it-works-screen";
import {
  MainScreen,
  type AgentStage,
  type MainTab,
} from "@/components/mobile/screens/main-screen";
import { useTransactions } from "@/hooks/use-transactions";
import { useUnderwritingProfile } from "@/hooks/use-underwriting-profile";
import { generateReportHtml, reportIdFor } from "@/lib/report-html";
import { bandForScore } from "@/lib/loan-bands";
import { mockApplicant, mockTransactions } from "@/data";
import { mockCreditDecision, mockFinancialProfile } from "@/data";
import type { EngineProfile } from "@/services/engine";
import type { OnChainTransaction } from "@/types";

export type AppStage = "how" | "auth" | "connect" | "bundling" | "main";

const BUNDLE_ITEMS = [
  "Wallet connected",
  "Looking at your payments",
  "Checking they are real",
  "Understanding how money moves",
  "Checking for warning signs",
  "Preparing your result",
];

const AGENT_STEPS = [
  "Collecting your recent payments",
  "Checking amounts and who you paid",
  "Seeing how long you have used this wallet",
  "Checking if payments look regular and on time",
  "Writing a simple result",
];

export function KredoofApp({
  startAt = "auth",
  initialTab = "portfolio",
  initialAuthMode = "signup",
  initialError = null,
  resetToken = "",
}: {
  startAt?: AppStage;
  initialTab?: MainTab;
  initialAuthMode?: AuthMode;
  initialError?: string | null;
  resetToken?: string;
}) {
  const router = useRouter();
  const { address } = useAccount();
  const [stage, setStage] = useState<AppStage>(startAt);
  const [authMode, setAuthMode] = useState<AuthMode>(initialAuthMode);
  const [tab, setTab] = useState<MainTab>(initialTab);
  const [bundleDone, setBundleDone] = useState(0);
  const [liveMode, setLiveMode] = useState(false);
  const [liveProfile, setLiveProfile] = useState<EngineProfile | null>(null);
  const [liveTxs, setLiveTxs] = useState<OnChainTransaction[] | null>(null);
  const [agentStage, setAgentStage] = useState<AgentStage>("idle");
  const [agentLog, setAgentLog] = useState<string[]>([]);
  const [sessionReady, setSessionReady] = useState(startAt !== "auth");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { signedIn?: boolean }) => {
        if (cancelled) return;
        if (
          data.signedIn &&
          (startAt === "auth" || startAt === "connect") &&
          initialAuthMode !== "reset" &&
          initialAuthMode !== "forgot"
        ) {
          setStage("connect");
        }
        setSessionReady(true);
      })
      .catch(() => {
        if (!cancelled) setSessionReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [startAt, initialAuthMode]);

  const needsProfile = stage === "main" || stage === "bundling";
  const underwriting = useUnderwritingProfile(needsProfile);
  const transactions = useTransactions(needsProfile);

  const decision = liveProfile?.decision ?? underwriting.decision ?? mockCreditDecision;
  const financial = liveProfile?.financial ?? underwriting.financial ?? mockFinancialProfile;
  const txs = liveTxs ?? transactions.data?.items ?? mockTransactions;
  const applicant = liveProfile?.applicant ?? underwriting.applicant ?? mockApplicant;

  const reportId = useMemo(
    () => reportIdFor(applicant, decision.score),
    [applicant, decision.score]
  );

  useEffect(() => {
    if (stage !== "bundling") return;
    setBundleDone(0);
    const timers: number[] = [];
    BUNDLE_ITEMS.forEach((_, i) => {
      timers.push(
        window.setTimeout(() => {
          setBundleDone(i + 1);
          if (i === BUNDLE_ITEMS.length - 1) {
            timers.push(window.setTimeout(() => setStage("main"), 650));
          }
        }, i * 520)
      );
    });
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [stage]);

  useEffect(() => {
    if (stage !== "bundling" || !liveMode || !address) return;
    let cancelled = false;
    fetch("/api/underwrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setLiveTxs(data.items ?? []);
          return;
        }
        setLiveProfile(data);
        setLiveTxs(data.liveTransactions ?? data.transactions?.items ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [stage, liveMode, address]);

  const runAgent = useCallback(() => {
    setAgentStage("thinking");
    setAgentLog([]);
    setTab("agent");
    AGENT_STEPS.forEach((step, i) => {
      window.setTimeout(() => {
        setAgentLog((prev) => [...prev, step]);
        if (i === AGENT_STEPS.length - 1) {
          window.setTimeout(() => setAgentStage("done"), 550);
        }
      }, i * 460);
    });
  }, []);

  const downloadReport = () => {
    const band = bandForScore(decision.score);
    const totalIn = txs
      .filter((t) => t.direction === "in")
      .reduce((s, t) => s + t.amount, 0);
    const totalOut = txs
      .filter((t) => t.direction === "out")
      .reduce((s, t) => s + t.amount, 0);
    const html = generateReportHtml({
      applicant,
      decision,
      band,
      txs,
      reportId,
      totalInUsdc: totalIn,
      totalOutUsdc: totalOut,
    });
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kredoof-summary.html";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.push("/");
    router.refresh();
  }

  if (!sessionReady) {
    return null;
  }

  if (stage === "how") {
    return (
      <HowItWorksScreen
        onContinue={() => {
          setAuthMode("signup");
          setStage("auth");
        }}
        onBack={() => router.push("/")}
      />
    );
  }

  if (stage === "auth") {
    return (
      <AuthScreen
        initialMode={authMode}
        initialError={initialError}
        resetToken={resetToken}
        onContinue={() => setStage("connect")}
        onBack={() => router.push("/")}
      />
    );
  }

  if (stage === "connect") {
    return (
      <ConnectScreen
        onContinue={() => {
          setLiveMode(true);
          setStage("bundling");
        }}
        onDemo={() => {
          setLiveMode(false);
          setStage("bundling");
        }}
        onSignOut={() => {
          void signOut();
        }}
      />
    );
  }

  if (stage === "bundling") {
    return <BundlingScreen doneCount={bundleDone} items={BUNDLE_ITEMS} />;
  }

  return (
    <MainScreen
      tab={tab}
      onTab={setTab}
      decision={decision}
      financial={financial}
      txs={txs}
      applicant={applicant}
      agentStage={agentStage}
      agentLog={agentLog}
      onRunAgent={runAgent}
      onDownload={downloadReport}
      onPrint={() => window.print()}
      reportId={reportId}
      onSignOut={() => {
        void signOut();
      }}
    />
  );
}
