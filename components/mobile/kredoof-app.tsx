"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import { type AccountRole } from "@/lib/account-role";
import { type AuthMode } from "@/components/mobile/auth-form";
import { AuthScreen } from "@/components/mobile/screens/auth-screen";
import { BundlingScreen } from "@/components/mobile/screens/bundling-screen";
import { ConnectScreen } from "@/components/mobile/screens/connect-screen";
import { HowItWorksScreen } from "@/components/mobile/screens/how-it-works-screen";
import {
  MainScreen,
  type AgentStage,
  type HomePane,
  type MainTab,
} from "@/components/mobile/screens/main-screen";
import { generateReportHtml, reportIdFor } from "@/lib/report-html";
import { bandForScore } from "@/lib/loan-bands";
import { LONG_TERM_MIN_SCORE } from "@/lib/loan-terms";
import type { EngineProfile } from "@/services/engine";
import type {
  Applicant,
  CreditDecision,
  FinancialProfile,
  OnChainTransaction,
} from "@/types";

const EMPTY_APPLICANT: Applicant = {
  name: "",
  owner: "",
  initials: "K",
  sector: "",
  location: "",
  walletAddress: "0x0000000000000000000000000000000000000000",
  network: "Avalanche",
};

const EMPTY_DECISION: CreditDecision = {
  score: 0,
  scoreMax: 850,
  status: "building",
  statusLabel: "",
  risk: "medium-low",
  riskLabel: "",
  recommendedLimitKsh: 0,
  recommendedLimitLabel: "",
  rationale: [],
  methodology: [],
  source: "engine",
};

const EMPTY_FINANCIAL: FinancialProfile = {
  totalTransactions: 0,
  transactionVolumeKsh: 0,
  transactionVolumeLabel: "",
  averageMonthlyVolumeKsh: 0,
  activeCounterparties: 0,
  onTimeRepaymentPercent: 0,
  walletAgeMonths: 0,
  monthlyVolume: [],
  inflowsVsOutflows: [],
  source: "engine",
};

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
  "Checking each payment exists on the chain",
  "Writing a simple result",
];

export function KredoofApp({
  startAt = "auth",
  initialTab = "home",
  initialHomePane = "credit",
  initialAuthMode = "signup",
  initialError = null,
  initialNotice = null,
  resetToken = "",
  initialRole = "borrower",
}: {
  startAt?: AppStage;
  initialTab?: MainTab;
  initialHomePane?: HomePane;
  initialAuthMode?: AuthMode;
  initialError?: string | null;
  initialNotice?: string | null;
  resetToken?: string;
  initialRole?: AccountRole;
}) {
  const router = useRouter();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const [stage, setStage] = useState<AppStage>(startAt);
  const [authMode, setAuthMode] = useState<AuthMode>(initialAuthMode);
  const [tab, setTab] = useState<MainTab>(initialTab);
  const [homePane, setHomePane] = useState<HomePane>(initialHomePane);
  const [bundleDone, setBundleDone] = useState(0);
  const [liveProfile, setLiveProfile] = useState<EngineProfile | null>(null);
  const [liveTxs, setLiveTxs] = useState<OnChainTransaction[] | null>(null);
  const [txsLoading, setTxsLoading] = useState(false);
  const [agentStage, setAgentStage] = useState<AgentStage>("idle");
  const [agentLog, setAgentLog] = useState<string[]>([]);
  const [sessionReady, setSessionReady] = useState(startAt !== "auth");
  const [hasOpenLoan, setHasOpenLoan] = useState(false);
  const [allowsLongTerm, setAllowsLongTerm] = useState(false);
  const [openRepayUsdc, setOpenRepayUsdc] = useState<number | null>(null);
  const [openAmountDue, setOpenAmountDue] = useState<number | null>(null);
  const [openLateFee, setOpenLateFee] = useState<number | null>(null);
  const [openDueAt, setOpenDueAt] = useState<number | null>(null);
  const [openDaysPastDue, setOpenDaysPastDue] = useState(0);

  const refreshLoans = useCallback(() => {
    fetch("/api/loans/mine")
      .then((res) => res.json())
      .then(
        (data: {
          hasOpenLoan?: boolean;
          allowsLongTerm?: boolean;
          openLoan?: {
            repay_usdc?: number;
            amount_due?: number;
            late_fee?: number;
            due_at?: number;
            days_past_due?: number;
          } | null;
          loans?: Array<{
            status?: string;
            repay_usdc?: number;
            amount_due?: number;
            late_fee?: number;
            due_at?: number;
            days_past_due?: number;
          }>;
        }) => {
          setHasOpenLoan(Boolean(data.hasOpenLoan));
          setAllowsLongTerm(Boolean(data.allowsLongTerm));
          const open =
            data.openLoan ??
            (data.loans ?? []).find((loan) => {
              const status = (loan.status ?? "").toLowerCase();
              return status === "drawn" || status === "disbursed" || status === "open";
            });
          setOpenRepayUsdc(open?.repay_usdc ?? null);
          setOpenAmountDue(open?.amount_due ?? open?.repay_usdc ?? null);
          setOpenLateFee(open?.late_fee ?? null);
          setOpenDueAt(open?.due_at ?? null);
          setOpenDaysPastDue(open?.days_past_due ?? 0);
        }
      )
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshLoans();
  }, [refreshLoans, stage, address]);

  useEffect(() => {
    let cancelled = false;
    const localPreview =
      process.env.NODE_ENV === "development" && startAt === "main";
    const boot = localPreview
      ? fetch("/api/auth/dev-borrower", { method: "POST" }).catch(() => null)
      : Promise.resolve(null);
    boot
      .then(() => fetch("/api/auth/me"))
      .then((res) => res.json())
      .then((data: { signedIn?: boolean; role?: AccountRole }) => {
        if (cancelled) return;
        if (data.signedIn && data.role === "lender" && startAt !== "main") {
          router.replace("/lend");
          setSessionReady(true);
          return;
        }
        if (
          data.signedIn &&
          (startAt === "auth" || startAt === "connect") &&
          initialAuthMode !== "reset" &&
          initialAuthMode !== "forgot" &&
          initialAuthMode !== "totp" &&
          initialAuthMode !== "totp-setup" &&
          initialAuthMode !== "confirm"
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
  }, [startAt, initialAuthMode, router]);

  const decision = liveProfile?.decision ?? EMPTY_DECISION;
  const financial = liveProfile?.financial ?? EMPTY_FINANCIAL;
  const txs = liveTxs ?? [];
  const applicant = liveProfile?.applicant ?? EMPTY_APPLICANT;
  const hasLiveData = Boolean(liveProfile?.decision);

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
    if (!address) {
      setLiveTxs([]);
      setLiveProfile(null);
      setTxsLoading(false);
      return;
    }
    let cancelled = false;
    setTxsLoading(true);
    fetch(`/api/chain/transfers?address=${encodeURIComponent(address)}`)
      .then((res) => res.json())
      .then((data: { items?: OnChainTransaction[] }) => {
        if (cancelled) return;
        setLiveTxs(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => {
        if (!cancelled) setLiveTxs([]);
      })
      .finally(() => {
        if (!cancelled) setTxsLoading(false);
      });
    fetch("/api/underwrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setLiveProfile(null);
          return;
        }
        setLiveProfile(data);
        if (Array.isArray(data.liveTransactions)) {
          setLiveTxs(data.liveTransactions);
        }
      })
      .catch(() => {
        if (!cancelled) setLiveProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  const runAgent = useCallback(() => {
    setAgentStage("thinking");
    setAgentLog([]);
    setTab("home");
    setHomePane("review");
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
        initialNotice={initialNotice}
        resetToken={resetToken}
          initialRole={initialRole}
          onContinue={(nextRole) => {
            if (nextRole === "lender") {
              router.push("/lend");
              return;
            }
            setStage("connect");
          }}
        onBack={() => router.push("/")}
      />
    );
  }

  if (stage === "connect") {
    return (
      <ConnectScreen
        onContinue={() => {
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
      homePane={homePane}
      onHomePane={setHomePane}
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
      hasOpenLoan={hasOpenLoan}
      allowsLongTerm={
        allowsLongTerm ||
        (hasLiveData && decision.score >= LONG_TERM_MIN_SCORE)
      }
      openRepayUsdc={openRepayUsdc}
      openAmountDue={openAmountDue}
      openLateFee={openLateFee}
      openDueAt={openDueAt}
      openDaysPastDue={openDaysPastDue}
      onLoanChange={refreshLoans}
      hasLiveData={hasLiveData}
      txsLoading={txsLoading}
      onDisconnectWallet={() => {
        if (hasOpenLoan) return;
        disconnect();
      }}
      onDeleteAccount={() => {
        if (hasOpenLoan) return;
        if (
          typeof window !== "undefined" &&
          !window.confirm("Delete this account? This cannot be undone.")
        ) {
          return;
        }
        void fetch("/api/account/delete", { method: "POST" }).then(async (res) => {
          if (!res.ok) return;
          disconnect();
          await signOut();
        });
      }}
    />
  );
}
