"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Printer,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useAccount, useConnect, useConnectors } from "wagmi";
import { Avatar, Orb, PrimaryButton } from "@/components/mobile/ui";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  formatDayMonth,
  formatIsoDate,
  formatKesOfUsdc,
  formatTokenAmount,
  formatUsdc,
  shortenAddress,
  usdcFromKes,
  explorerTxUrl,
} from "@/lib/format";
import { LoanPanel } from "@/components/mobile/loan-panel";
import { bandForScore } from "@/lib/loan-bands";
import { cn } from "@/lib/utils";
import type {
  Applicant,
  CreditDecision,
  FinancialProfile,
  OnChainTransaction,
} from "@/types";

const TONE = {
  good: { bg: "#E4F5E6", fg: "#2F8F52" },
  warn: { bg: "#FBF0DA", fg: "#B8862E" },
  bad: { bg: "#FBE4E4", fg: "#C24545" },
  info: { bg: "#DFEBFB", fg: "#3C6FCF" },
  prime: { bg: "#F6EFD4", fg: "#9C7B12" },
} as const;

export type MainTab = "portfolio" | "agent" | "report";
export type AgentStage = "idle" | "thinking" | "done";

export function MainScreen({
  tab,
  onTab,
  decision,
  financial,
  txs,
  agentStage,
  agentLog,
  onRunAgent,
  onDownload,
  onPrint,
  reportId,
  applicant,
  onSignOut,
  hasOpenLoan = false,
  allowsLongTerm = false,
  openRepayUsdc = null,
  openAmountDue = null,
  openLateFee = null,
  openDueAt = null,
  openDaysPastDue = 0,
  onLoanChange,
  onDisconnectWallet,
  onDeleteAccount,
}: {
  tab: MainTab;
  onTab: (tab: MainTab) => void;
  decision: CreditDecision;
  financial: FinancialProfile;
  txs: OnChainTransaction[];
  agentStage: AgentStage;
  agentLog: string[];
  onRunAgent: () => void;
  onDownload: () => void;
  onPrint: () => void;
  reportId: string;
  applicant: Applicant;
  onSignOut?: () => void;
  hasOpenLoan?: boolean;
  allowsLongTerm?: boolean;
  openRepayUsdc?: number | null;
  openAmountDue?: number | null;
  openLateFee?: number | null;
  openDueAt?: number | null;
  openDaysPastDue?: number;
  onLoanChange?: () => void;
  onDisconnectWallet?: () => void;
  onDeleteAccount?: () => void;
}) {
  const { address, connector } = useAccount();
  const connectors = useConnectors();
  const { connect, isPending } = useConnect();
  const [switcher, setSwitcher] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [accountNote, setAccountNote] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<OnChainTransaction | null>(
    null
  );

  const displayAddress = address
    ? shortenAddress(address)
    : shortenAddress(applicant.walletAddress);
  const band = bandForScore(decision.score);
  const tone = TONE[band.tone];
  const ceilingUsdc = usdcFromKes(band.ceilingKes);
  const avgUsdc =
    Math.round((financial.averageMonthlyVolumeKsh / 129.4) * 100) / 100;

  const totals = useMemo(() => {
    const totalIn = txs
      .filter((t) => t.direction === "in")
      .reduce((s, t) => s + t.amount, 0);
    const totalOut = txs
      .filter((t) => t.direction === "out")
      .reduce((s, t) => s + t.amount, 0);
    return { totalIn, totalOut };
  }, [txs]);

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-20 border-b border-hairline bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="font-heading text-sm font-extrabold tracking-[0.2em]">
              KREDOOF
            </span>
            <span className="hidden h-4 w-px bg-hairline sm:block" />
            <div className="hidden items-center gap-2 sm:flex">
              <Avatar initials={applicant.initials} active size={32} />
              <div>
                <div className="text-[11px] text-muted-foreground">
                  {applicant.name}
                </div>
                <div className="font-heading text-sm font-bold leading-tight">
                  {applicant.owner}
                </div>
              </div>
            </div>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setAccountNote(null);
                setSwitcher((v) => !v);
              }}
              className="font-heading flex items-center gap-2 rounded-xl border border-hairline bg-white px-3 py-2"
            >
              <Wallet size={14} className="text-mint-deep" />
              <span className="font-mono text-xs text-muted-foreground">
                {displayAddress}
              </span>
              <span className="hidden text-xs text-[#a9b0a2] sm:inline">
                Connected
              </span>
              <ChevronDown size={14} className="text-[#a9b0a2]" />
            </button>
          {switcher ? (
            <div className="fade-up absolute top-[calc(100%+6px)] right-0 z-10 w-[220px] rounded-[14px] border border-hairline bg-white p-2 shadow-[0_12px_28px_-10px_rgba(20,23,28,0.22)]">
              <div className="px-1.5 pb-1.5 text-[10px] tracking-wide text-[#a9b0a2] uppercase">
                Your account
              </div>
              {connectors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (hasOpenLoan) {
                      setAccountNote(
                        "Pay your loan first. Then you can change wallets."
                      );
                      return;
                    }
                    connect({ connector: c });
                    setAccountNote(null);
                    setSwitcher(false);
                  }}
                  className={cn(
                    "font-heading mb-0.5 flex w-full items-center justify-between rounded-[10px] px-2 py-2 text-left text-xs font-semibold text-mint-deep",
                    c.name === connector?.name ? "bg-mint" : "bg-transparent"
                  )}
                >
                  <span>{c.name}</span>
                </button>
              ))}
              {onDisconnectWallet ? (
                <button
                  type="button"
                  onClick={() => {
                    if (hasOpenLoan) {
                      setAccountNote(
                        "Pay your loan first. Then you can disconnect this wallet."
                      );
                      return;
                    }
                    setAccountNote(null);
                    setSwitcher(false);
                    onDisconnectWallet();
                  }}
                  className="font-heading mt-1 flex w-full items-center rounded-[10px] px-2 py-2 text-left text-xs font-semibold text-[#C24545]"
                >
                  Disconnect wallet
                </button>
              ) : null}
              {onDeleteAccount ? (
                <button
                  type="button"
                  onClick={() => {
                    if (hasOpenLoan) {
                      setAccountNote(
                        "Pay your loan first. Then you can delete this account."
                      );
                      return;
                    }
                    setAccountNote(null);
                    setSwitcher(false);
                    onDeleteAccount();
                  }}
                  className="font-heading flex w-full items-center rounded-[10px] px-2 py-2 text-left text-xs font-semibold text-[#C24545]"
                >
                  Delete account
                </button>
              ) : null}
              {onSignOut ? (
                <button
                  type="button"
                  onClick={() => {
                    setAccountNote(null);
                    setSwitcher(false);
                    onSignOut();
                  }}
                  className="font-heading mt-1 flex w-full items-center rounded-[10px] px-2 py-2 text-left text-xs font-semibold text-mint-deep"
                >
                  Sign out
                </button>
              ) : null}
              {accountNote ? (
                <p className="mt-1 px-2 py-1 text-[11px] leading-4 text-[#C24545]">
                  {accountNote}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <aside className="hidden w-52 shrink-0 md:block">
          <nav className="sticky top-24 space-y-1">
            {(
              [
                { id: "portfolio", icon: Wallet, label: "Overview" },
                { id: "agent", icon: Sparkles, label: "Review" },
                { id: "report", icon: BadgeCheck, label: "Documents" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onTab(item.id)}
                className={cn(
                  "font-heading flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold",
                  tab === item.id
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:bg-white"
                )}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 pb-24 md:pb-4">
        {tab === "portfolio" ? (
          <div className="fade-up grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-2">
            <div
              className="rounded-3xl px-6 py-6 sm:px-8 sm:py-8"
              style={{
                background:
                  "linear-gradient(135deg, #DDF3D6 0%, #8FD9A4 100%)",
              }}
            >
              <div className="text-sm text-[#215B36]/85">
                Your credit score
              </div>
              <div className="font-heading mt-1 text-5xl leading-[1.1] font-extrabold text-[#123A22] sm:text-6xl">
                {agentStage === "done" ? decision.score : "— · —"}
              </div>
              <div className="mt-2 text-sm text-[#215B36]/85">
                {applicant.sector} ·{" "}
                {financial.totalTransactions.toLocaleString("en-KE")} payments
                found
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/55 px-4 py-3">
                  <div className="text-xs text-[#215B36]">
                    Typical monthly activity
                  </div>
                  <div className="font-heading text-base font-bold text-[#123A22]">
                    {formatUsdc(avgUsdc)}
                  </div>
                  <div className="text-xs text-[#215B36]/75">
                    {financial.transactionVolumeLabel}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/55 px-4 py-3">
                  <div className="text-xs text-[#215B36]">Using this wallet</div>
                  <div className="font-heading text-base font-bold text-[#123A22]">
                    {financial.walletAgeMonths} months
                  </div>
                  <div className="text-xs text-[#215B36]/75">
                    Paid back on time
                  </div>
                </div>
              </div>
            </div>

            <PrimaryButton
              onClick={onRunAgent}
              disabled={agentStage === "thinking"}
              className="mt-4"
            >
              {agentStage === "done"
                ? "Review my payments again"
                : "Review my payments"}
            </PrimaryButton>
            </div>

            <div className="rounded-3xl border border-hairline bg-white p-5 sm:p-6 lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-heading text-lg font-bold">
                Your payments
              </span>
              <span className="text-sm text-[#a9b0a2]">
                Confirmed
              </span>
            </div>

            {txs.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTx(t)}
                className="flex w-full items-center justify-between py-3 text-left hover:bg-[#FAFBF9]"
                style={{
                  borderBottom:
                    i < txs.length - 1 ? "1px solid #E6EAE3" : "none",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{
                      background: t.direction === "in" ? "#DDF3D6" : "#FBE4E4",
                    }}
                  >
                    {t.direction === "in" ? (
                      <ArrowDownRight size={16} color="#3FA65C" />
                    ) : (
                      <ArrowUpRight size={16} color="#C24545" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {t.direction === "in" ? "Money in" : "Money out"}
                    </div>
                    <div className="font-mono text-xs text-[#a9b0a2]">
                      {formatDayMonth(t.timestamp)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="font-heading text-sm font-bold sm:text-base"
                    style={{
                      color: t.direction === "in" ? "#3FA65C" : "#C24545",
                    }}
                  >
                    {t.direction === "in" ? "+" : "−"}
                    {formatUsdc(t.amount)}
                  </div>
                  <div className="text-xs text-[#a9b0a2]">
                    {formatKesOfUsdc(t.amount)}
                  </div>
                </div>
              </button>
            ))}
            </div>
          </div>
        ) : null}

        {tab === "agent" ? (
          <div className="fade-up grid items-start gap-8 md:grid-cols-2">
            <div className="rounded-3xl border border-hairline bg-white px-6 py-8 text-center">
            <div className="font-heading mb-6 text-xl font-bold">
              Your credit review
            </div>
            <div className="flex justify-center">
              <Orb spinning={agentStage === "thinking"} size={148} />
            </div>
            {agentStage === "thinking" ? (
              <div className="mt-6 space-y-2">
                {agentLog.map((line) => (
                  <div
                    key={line}
                    className="fade-up text-sm text-muted-foreground"
                  >
                    {line}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-sm leading-6 text-muted-foreground">
                We’ll look at{" "}
                <strong className="text-foreground">
                  {applicant.name}
                </strong>
                ’s payments and tell you, in simple terms, if a loan looks like
                a fit.
              </p>
            )}
            </div>
            <div className="rounded-3xl border border-hairline bg-white p-6">
              {agentStage !== "done" ? (
                <>
                  <button
                    type="button"
                    onClick={onRunAgent}
                    className="mb-3 flex w-full items-center justify-between rounded-2xl border border-hairline bg-[#FAFBF9] px-4 py-4 text-left"
                  >
                    <span className="text-sm font-semibold text-mint-deep sm:text-base">
                      See if {applicant.name} can get a loan
                    </span>
                    <ChevronRight size={16} className="text-[#a9b0a2]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDiff((v) => !v)}
                    className="mb-3 flex w-full items-center justify-between rounded-2xl border border-hairline bg-[#FAFBF9] px-4 py-4"
                  >
                    <span className="text-sm font-semibold text-mint-deep sm:text-base">
                      Why we look at your payments
                    </span>
                    {showDiff ? (
                      <ChevronDown size={16} className="text-[#a9b0a2]" />
                    ) : (
                      <ChevronRight size={16} className="text-[#a9b0a2]" />
                    )}
                  </button>
                  {showDiff ? (
                    <div className="fade-up rounded-2xl bg-[#F4F7F3] px-4 py-4 text-sm leading-7 text-muted-foreground">
                      <p className="font-serif mb-2 text-base text-foreground italic">
                        Banks often ask for paper statements. We look at money
                        that already moved through your wallet instead.
                      </p>
                      •{" "}
                      <strong className="text-foreground">
                        Real payments
                      </strong>{" "}
                      — we use the payments themselves, not a typed-up
                      summary.
                      <br />•{" "}
                      <strong className="text-foreground">
                        It can change
                      </strong>{" "}
                      — as you keep sending and receiving money, your result
                      can improve.
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="fade-up">
                  <div
                    className="mb-4 rounded-2xl p-5"
                    style={{ background: tone.bg }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <ShieldCheck size={18} color={tone.fg} />
                      <span
                        className="font-heading text-base font-bold"
                        style={{ color: tone.fg }}
                      >
                        {band.tier}
                      </span>
                    </div>
                    <div className="font-heading text-2xl font-extrabold">
                      {formatUsdc(ceilingUsdc)}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {formatKesOfUsdc(ceilingUsdc)}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Your score is {decision.score} out of 850.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTab("report")}
                    className="font-heading flex w-full items-center justify-between rounded-2xl bg-primary px-4 py-3.5 text-sm font-bold text-white"
                  >
                    View your documents
                    <ChevronRight size={16} />
                  </button>
                  <LoanPanel
                    eligible={decision.recommendedLimitKsh > 0}
                    limitUsdc={usdcFromKes(decision.recommendedLimitKsh)}
                    allowsLongTerm={allowsLongTerm}
                    hasOpenLoan={hasOpenLoan}
                    openRepayUsdc={openRepayUsdc}
                    openAmountDue={openAmountDue}
                    openLateFee={openLateFee}
                    openDueAt={openDueAt}
                    openDaysPastDue={openDaysPastDue}
                    onLoanChange={onLoanChange}
                  />
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    This is a snapshot. Keep using your wallet for payments and
                    your score can change over time.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {tab === "report" ? (
          <div className="fade-up mx-auto max-w-3xl">
            {agentStage !== "done" ? (
              <div className="px-2.5 py-[50px] text-center">
                <BadgeCheck
                  size={30}
                  className="mx-auto mb-2.5 text-[#a9b0a2]"
                />
                <div className="mb-4 text-[13px] text-muted-foreground">
                  Run a review to unlock a simple document you can download
                  or print.
                </div>
                <PrimaryButton onClick={() => onTab("agent")}>
                  Go to review
                </PrimaryButton>
              </div>
            ) : (
              <>
                <div
                  id="kredoof-report-printable"
                  className="overflow-hidden rounded-[14px] border border-hairline"
                >
                  <div
                    className="flex items-start justify-between border-b-[3px] px-[18px] py-4"
                    style={{
                      background: "#0F2340",
                      borderBottomColor: "#C9A227",
                    }}
                  >
                    <div>
                      <div className="font-serif text-[13px] font-bold tracking-wide text-white">
                        YOUR KREDOOF SUMMARY
                      </div>
                      <div className="font-mono mt-1 text-[9.5px] text-[#C9A227]">
                        {reportId} · {applicant.location}
                      </div>
                    </div>
                    <div className="font-heading -rotate-3 rounded-md border-[1.5px] border-[#C9A227] px-2 py-1 text-center text-[9px] font-extrabold tracking-wide text-[#C9A227]">
                      {band.tier.toUpperCase()}
                    </div>
                  </div>
                  <div className="bg-[#FEFEFC] px-[18px] py-4">
                    {(
                      [
                        ["Name", applicant.name],
                        ["Work", applicant.sector],
                        ["Location", applicant.location],
                        ["Wallet", displayAddress],
                        ["Using this wallet", `${financial.walletAgeMonths} months`],
                      ] as const
                    ).map(([k, v]) => (
                      <div
                        key={k}
                        className="flex justify-between border-b border-hairline py-1.5 text-[11.5px]"
                      >
                        <span className="text-muted-foreground">{k}</span>
                        <span
                          className={cn(
                            "font-medium",
                            k === "Wallet" && "font-mono"
                          )}
                        >
                          {v}
                        </span>
                      </div>
                    ))}
                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <div className="text-[9.5px] tracking-wide text-[#a9b0a2] uppercase">
                          Your score
                        </div>
                        <div className="font-heading text-[30px] font-extrabold text-[#0F2340]">
                          {decision.score}{" "}
                          <span className="text-[11px] font-semibold text-[#a9b0a2]">
                            / 850
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-semibold">
                          {formatUsdc(ceilingUsdc)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatKesOfUsdc(ceilingUsdc)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-[18px] mb-1.5 text-[10px] tracking-wide text-[#a9b0a2] uppercase">
                      How we looked at your payments
                    </div>
                    {decision.methodology.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between py-1"
                      >
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-muted-foreground" />
                          <span className="text-[11px]">{f.label}</span>
                        </div>
                        <span className="text-[10.5px] font-semibold text-muted-foreground">
                          {f.scoreOutOf100 >= 90
                            ? "Excellent"
                            : f.scoreOutOf100 >= 75
                              ? "Strong"
                              : f.scoreOutOf100 >= 60
                                ? "Okay"
                                : "Needs work"}
                        </span>
                      </div>
                    ))}
                    <p className="font-mono mt-4 border-t border-hairline pt-2.5 text-[9px] leading-[1.6] text-[#a9b0a2]">
                      This summary is based on payments we could see in your
                      wallet. It is not a final loan offer. A lender still
                      confirms who you are before sending money. Reference{" "}
                      {reportId}. Money in {formatUsdc(totals.totalIn)} · money
                      out {formatUsdc(totals.totalOut)}.
                    </p>
                  </div>
                </div>
                <div className="mt-3.5 flex gap-2.5">
                  <button
                    type="button"
                    onClick={onDownload}
                    className="font-heading flex flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-[#0F2340] py-3 text-[12.5px] font-bold text-white"
                  >
                    <Download size={14} /> Download
                  </button>
                  <button
                    type="button"
                    onClick={onPrint}
                    className="font-heading flex flex-1 items-center justify-center gap-1.5 rounded-[14px] border border-[#0F2340] bg-white py-3 text-[12.5px] font-bold text-[#0F2340]"
                  >
                    <Printer size={14} /> Print
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-white/95 px-4 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around">
        {(
          [
            { id: "portfolio", icon: Wallet, label: "Overview" },
            { id: "agent", icon: Sparkles, label: "Review" },
            { id: "report", icon: BadgeCheck, label: "Documents" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onTab(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 text-[11px] font-semibold",
              tab === item.id ? "text-foreground" : "text-[#a9b0a2]"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-12 items-center justify-center rounded-xl",
                tab === item.id ? "bg-primary text-white" : "bg-transparent"
              )}
            >
              <item.icon size={17} />
            </span>
            {item.label}
          </button>
        ))}
        </div>
      </nav>

      <Sheet
        open={!!selectedTx}
        onOpenChange={(open) => {
          if (!open) setSelectedTx(null);
        }}
      >
        <SheetContent side="bottom" className="rounded-t-[24px]">
          {selectedTx ? (
            <>
              <SheetHeader>
                <SheetTitle>
                  {selectedTx.direction === "in" ? "Money in" : "Money out"}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-2 px-4 pb-6 text-[13px]">
                <p>
                  Sent from{" "}
                  <span className="font-mono">
                    {shortenAddress(selectedTx.from)}
                  </span>
                </p>
                <p>
                  Sent to{" "}
                  <span className="font-mono">
                    {shortenAddress(selectedTx.to)}
                  </span>
                </p>
                <p>
                  Amount{" "}
                  {formatTokenAmount(
                    selectedTx.direction === "in"
                      ? selectedTx.amount
                      : -selectedTx.amount,
                    selectedTx.asset
                  )}
                </p>
                <p>
                  When {formatIsoDate(selectedTx.timestamp)}
                </p>
                <p className="font-medium text-mint-deep">
                  ✓ Confirmed payment
                </p>
                <a
                  href={explorerTxUrl(selectedTx.hash)}
                  className="text-[12px] font-semibold text-mint-deep underline"
                >
                  View payment details
                </a>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
