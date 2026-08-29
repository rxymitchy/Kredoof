"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthScreen } from "@/components/mobile/screens/auth-screen";
import { BundlingScreen } from "@/components/mobile/screens/bundling-screen";
import { ConnectScreen } from "@/components/mobile/screens/connect-screen";
import { HowItWorksScreen } from "@/components/mobile/screens/how-it-works-screen";
import { LandingScreen } from "@/components/mobile/screens/landing-screen";
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

export type AppStage =
  | "landing"
  | "how"
  | "auth"
  | "connect"
  | "bundling"
  | "main";

const BUNDLE_ITEMS = [
  "Wallet connected",
  "Reading blockchain transactions",
  "Verifying transaction records",
  "Analyzing financial activity",
  "Checking risk indicators",
  "Preparing credit decision",
];

const AGENT_STEPS = [
  "Pulling verified Avalanche transfers",
  "Confirming hashes, counterparties, and amounts",
  "Scoring wallet age, volume, consistency, repayment, diversity, dispute rate",
  "Checking mock risk indicators (not live fraud detection)",
  "Compiling an explainable credit decision",
];

export function KredoofApp({
  startAt = "landing",
  initialTab = "portfolio",
}: {
  startAt?: AppStage;
  initialTab?: MainTab;
}) {
  const [stage, setStage] = useState<AppStage>(startAt);
  const [tab, setTab] = useState<MainTab>(initialTab);
  const [bundleDone, setBundleDone] = useState(0);
  const [agentStage, setAgentStage] = useState<AgentStage>(
    startAt === "main" ? "idle" : "idle"
  );
  const [agentLog, setAgentLog] = useState<string[]>([]);

  const underwriting = useUnderwritingProfile();
  const transactions = useTransactions();

  const decision = underwriting.decision ?? mockCreditDecision;
  const financial = underwriting.financial ?? mockFinancialProfile;
  const txs = transactions.data?.items ?? mockTransactions;
  const applicant = underwriting.applicant ?? mockApplicant;

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
    a.download = "kredoof-credit-report.html";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (stage === "landing") {
    return (
      <LandingScreen
        onConnect={() => setStage("connect")}
        onHowItWorks={() => setStage("how")}
        onSignIn={() => setStage("auth")}
      />
    );
  }

  if (stage === "how") {
    return <HowItWorksScreen onContinue={() => setStage("connect")} />;
  }

  if (stage === "auth") {
    return <AuthScreen onContinue={() => setStage("connect")} />;
  }

  if (stage === "connect") {
    return <ConnectScreen onContinue={() => setStage("bundling")} />;
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
      agentStage={agentStage}
      agentLog={agentLog}
      onRunAgent={runAgent}
      onDownload={downloadReport}
      onPrint={() => window.print()}
      reportId={reportId}
    />
  );
}
