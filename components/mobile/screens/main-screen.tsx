"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Loader2,
  LogOut,
  Printer,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useAccount,
  useChainId,
  useConnect,
  useConnectors,
  useSwitchChain,
} from "wagmi";
import { avalanche } from "wagmi/chains";
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
  formatUsdt,
  shortenAddress,
  usdcFromKes,
  explorerTxUrl,
} from "@/lib/format";
import { FlowChart } from "@/components/dashboard/flow-chart";
import { ScoreRing } from "@/components/dashboard/score-ring";
import { BrandMark } from "@/components/brand/mark";
import { LoanPanel } from "@/components/mobile/loan-panel";
import {
  BorrowerLoanSection,
  type DisplayLoan,
} from "@/components/mobile/loan-list";
import { SampleDemoVideo } from "@/components/mobile/sample-demo-video";
import { AVALANCHE_CHAIN_ID } from "@/lib/constants";
import {
  activeConnectorId,
  connectDisplayWallet,
  listedWallets,
} from "@/lib/wallets";
import { hello } from "@/lib/greet";
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

export type MainTab = "wallet" | "home" | "loans" | "profile" | "settings";
export type HomePane = "credit" | "review" | "docs";
export type AgentStage = "idle" | "thinking" | "done";

type Profile = {
  email: string;
  phone: string;
  name: string;
  firstName: string;
  lastName: string;
  totpEnabled: boolean;
};

const NAV: { id: MainTab; label: string; icon: typeof Wallet }[] = [
  { id: "home", label: "Home", icon: Sparkles },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "loans", label: "Loans", icon: Banknote },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "settings", label: "Settings", icon: Settings },
];

export function MainScreen({
  tab,
  onTab,
  homePane = "credit",
  onHomePane,
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
  loans = [],
  onLoanChange,
  onDisconnectWallet,
  onDeleteAccount,
  hasLiveData = false,
  txsLoading = false,
}: {
  tab: MainTab;
  onTab: (tab: MainTab) => void;
  homePane?: HomePane;
  onHomePane?: (pane: HomePane) => void;
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
  loans?: DisplayLoan[];
  onLoanChange?: () => void;
  onDisconnectWallet?: () => void;
  onDeleteAccount?: () => void;
  hasLiveData?: boolean;
  txsLoading?: boolean;
}) {
  const router = useRouter();
  const { address, connector, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const connectors = useConnectors();
  const { connectAsync, isPending, variables } = useConnect();
  const [showDiff, setShowDiff] = useState(false);
  const [accountNote, setAccountNote] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<OnChainTransaction | null>(
    null
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [hi, setHi] = useState("Hello");
  const onAvalanche = chainId === AVALANCHE_CHAIN_ID;
  const walletChoices = useMemo(() => listedWallets(connectors), [connectors]);

  useEffect(() => {
    setHi(hello(profile?.name));
  }, [profile?.name]);

  useEffect(() => {
    fetch("/api/account/profile")
      .then((res) => res.json())
      .then((account) => {
        if (!account?.email) return;
        setProfile(account);
        setFirstName(account.firstName ?? "");
        setLastName(account.lastName ?? "");
        setPhone(account.phone ?? "");
      })
      .catch(() => null);
  }, []);

  async function saveProfile() {
    setSaving(true);
    setAccountNote(null);
    setNotice(null);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, phone }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setAccountNote(data.error ?? "Could not save");
      return;
    }
    setProfile(data);
    setNotice("Profile saved.");
  }

  async function savePassword() {
    setSaving(true);
    setAccountNote(null);
    setNotice(null);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, nextPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setAccountNote(data.error ?? "Could not change password");
      return;
    }
    setCurrentPassword("");
    setNextPassword("");
    setNotice("Password updated.");
  }

  function goHome(pane: HomePane) {
    onTab("home");
    onHomePane?.(pane);
  }

  const displayAddress = address ? shortenAddress(address) : "Not connected";
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
            <span className="flex items-center">
              <BrandMark size={36} />
            </span>
            <span className="hidden h-4 w-px bg-hairline sm:block" />
            <div className="hidden items-center gap-2 sm:flex">
              <Avatar
                initials={
                  `${firstName[0] ?? (hasLiveData ? applicant.initials[0] : "K") ?? "K"}${lastName[0] ?? ""}`.toUpperCase()
                }
                active
                size={32}
              />
              <div>
                <div className="text-[11px] text-muted-foreground">
                  {hi}
                </div>
                <div className="text-sm font-medium leading-tight">
                  {profile?.name || (hasLiveData ? applicant.name : "") || "Your account"}
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onTab("wallet")}
            className="inline-flex items-center gap-2 rounded-full bg-mint-deep px-3.5 py-2 text-sm font-medium text-white"
          >
            <Wallet size={16} />
            {isConnected ? displayAddress : "Wallet"}
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <aside className="hidden w-52 shrink-0 md:block">
          <nav className="sticky top-24 space-y-1">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onTab(item.id)}
                className={cn(
                  "font-heading flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold",
                  tab === item.id
                    ? "bg-mint-deep text-white"
                    : "text-muted-foreground hover:bg-white"
                )}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
            {onSignOut ? (
              <button
                type="button"
                onClick={() => onSignOut()}
                className="font-heading mt-4 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#C24545] hover:bg-white"
              >
                <LogOut size={16} />
                Log out
              </button>
            ) : null}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 pb-32 md:pb-4">
        {accountNote ? (
          <p className="mb-4 text-sm text-[#C24545]">{accountNote}</p>
        ) : null}
        {notice ? <p className="mb-4 text-sm text-mint-deep">{notice}</p> : null}

        {tab === "wallet" ? (
          <div className="fade-up mb-8 grid gap-6">
            <div>
              <p className="text-sm text-mint-deep md:hidden">{hi}</p>
              <h1 className="display mt-1 text-[clamp(1.9rem,4vw,2.8rem)]">
                Wallet
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Connect an Avalanche wallet so we can read the money that already
                moved. That is what your score is based on.
              </p>
            </div>
            <section className="rounded-[1.6rem] border border-hairline bg-white px-6 py-6">
              {isConnected && address ? (
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-sm text-muted-foreground">Connected</h2>
                    <p className="font-mono mt-2 text-lg">{displayAddress}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {connector?.name ?? "Wallet"} ·{" "}
                      {onAvalanche ? "Avalanche" : "Wrong network"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {!onAvalanche ? (
                      <PrimaryButton
                        className="sm:w-auto sm:px-6"
                        onClick={() => switchChain({ chainId: avalanche.id })}
                      >
                        {isSwitching ? "Switching…" : "Switch to Avalanche"}
                      </PrimaryButton>
                    ) : null}
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
                          onDisconnectWallet();
                        }}
                        className="text-sm font-semibold text-[#C24545]"
                      >
                        Disconnect
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {walletChoices.map((item) => {
                    const pending = Boolean(
                      isPending &&
                        variables?.connector &&
                        "id" in variables.connector &&
                        item.matches.some(
                          (match) =>
                            match.id === activeConnectorId(variables.connector)
                        )
                    );
                    return (
                      <button
                        key={item.label}
                        type="button"
                        disabled={isPending || hasOpenLoan}
                        onClick={() => {
                          if (hasOpenLoan) {
                            setAccountNote(
                              "Pay your loan first. Then you can change wallets."
                            );
                            return;
                          }
                          void connectDisplayWallet(
                            item.label,
                            item.matches,
                            connectAsync
                          ).catch((err) =>
                            setAccountNote(
                              err instanceof Error
                                ? err.message
                                : "Could not connect that wallet."
                            )
                          );
                        }}
                        className="font-heading flex items-center justify-center gap-1.5 rounded-xl bg-mint-deep px-3 py-4 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {pending ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Wallet size={13} />
                        )}
                        {pending ? "Connecting…" : item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
            <section>
              <h2 className="text-xl tracking-[-0.04em]">Payments on this wallet</h2>
              <div className="mt-3 rounded-[1.6rem] border border-hairline bg-white p-5">
                {!isConnected ? (
                  <p className="text-sm text-muted-foreground">
                    Connect MetaMask, Core, or Trust Wallet to see real Avalanche
                    USDT and USDC payments. We do not show sample money here.
                  </p>
                ) : txsLoading ? (
                  <p className="text-sm text-muted-foreground">
                    Reading this wallet on Avalanche…
                  </p>
                ) : txs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No USDT or USDC payments on Avalanche for this wallet yet.
                  </p>
                ) : (
                  txs.map((t, i) => (
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
                            background:
                              t.direction === "in" ? "#DDF3D6" : "#FBE4E4",
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
                          {t.amount.toLocaleString("en-KE", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          {t.asset}
                        </div>
                        <div className="text-xs text-[#a9b0a2]">
                          {formatKesOfUsdc(t.amount)}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>
          </div>
        ) : null}

        {tab === "loans" ? (
          <div className="fade-up mb-8 grid gap-6">
            <div>
              <p className="text-sm text-mint-deep md:hidden">{hi}</p>
              <h1 className="display mt-1 text-[clamp(1.9rem,4vw,2.8rem)]">
                Loans
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Amounts and pay-by dates only show after a lender actually funds
                you. The Home clip is a sample.
              </p>
            </div>
            <BorrowerLoanSection loans={loans} allowsLongTerm={allowsLongTerm} />
            {hasLiveData ? (
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
            ) : null}
          </div>
        ) : null}

        {tab === "home" ? (
          <div className="fade-up grid gap-6">
            <div>
              <p className="text-sm text-mint-deep md:hidden">{hi}</p>
              <h1 className="display mt-1 text-[clamp(1.9rem,4vw,2.8rem)]">
                {hi}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Watch how it works, then connect a real wallet. Sample clips are
                marked Sample. Your money only appears under Wallet. Funded
                loans live under Loans.
              </p>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  "Open Wallet and connect MetaMask, Core, or Trust on Avalanche.",
                  "Approve in the app so we know the wallet is yours.",
                  "We read USDT and USDC that actually moved on the chain.",
                  "If that checks out, a lender can fund you. Pay back in 16 days, or 30 days with more trust. Interest is 0.06% a day.",
                ] as const
              ).map((step, i) => (
                <li
                  key={step}
                  className="rounded-[1.4rem] border border-hairline bg-white px-4 py-4 text-sm leading-6 text-muted-foreground"
                >
                  <span className="font-mono text-[10px] tracking-[0.14em] text-mint-deep">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-2 text-foreground">{step}</p>
                </li>
              ))}
            </ol>
            <PrimaryButton className="sm:w-auto sm:px-8" onClick={() => onTab("wallet")}>
              {isConnected ? "Open Wallet" : "Connect a wallet"}
            </PrimaryButton>
            <div>
              <h2 className="text-xl tracking-[-0.04em]">Sample walkthrough</h2>
              <p className="mt-1 mb-3 text-sm text-muted-foreground">
                This is a demo video of what payments look like. It is not your
                account.
              </p>
              <SampleDemoVideo />
            </div>
            <div>
              <h2 className="text-xl tracking-[-0.04em]">Set up a wallet</h2>
              <p className="mt-1 mb-3 text-sm text-muted-foreground">
                Install MetaMask, then come back to Wallet and tap MetaMask. Core
                is at core.app. Trust is in the app store.
              </p>
              <div className="overflow-hidden rounded-[1.6rem] border border-hairline bg-white">
                <div className="aspect-video w-full bg-black">
                  <iframe
                    title="Getting started with MetaMask"
                    src="https://www.youtube.com/embed/GNPz-Dv5BjM"
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>
            {hasLiveData ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    { id: "credit", label: "Credit" },
                    { id: "review", label: "Review" },
                    { id: "docs", label: "Documents" },
                  ] as const
                ).map((pane) => (
                  <button
                    key={pane.id}
                    type="button"
                    onClick={() => goHome(pane.id)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-semibold",
                      homePane === pane.id
                        ? "bg-mint-deep text-white"
                        : "border border-hairline text-muted-foreground"
                    )}
                  >
                    {pane.label}
                  </button>
                ))}
              </div>
            ) : null}
          {hasLiveData && homePane === "credit" ? (
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-2">
            <div className="rounded-[1.6rem] border border-hairline bg-white px-6 py-6 sm:px-7 sm:py-7">
              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  <ScoreRing
                    score={decision.score}
                    ready={agentStage === "done"}
                    size={132}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="display text-3xl leading-none">
                      {agentStage === "done" ? decision.score : "—"}
                    </span>
                    <span className="mt-1 text-[10px] text-muted-foreground">of 850</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-mint-deep">Your score</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {agentStage === "done"
                      ? `${band.tier}. You can draw up to ${formatUsdt(ceilingUsdc)}.`
                      : "Review your payments and we’ll write this in plain words."}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-canvas px-4 py-3">
                  <div className="text-xs text-muted-foreground">Typical month</div>
                  <div className="mt-1 text-sm font-medium">{formatUsdc(avgUsdc)}</div>
                </div>
                <div className="rounded-2xl bg-canvas px-4 py-3">
                  <div className="text-xs text-muted-foreground">Wallet age</div>
                  <div className="mt-1 text-sm font-medium">
                    {financial.walletAgeMonths} months
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-[1.6rem] border border-hairline bg-white p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Money in</span>
                <span>Money out</span>
              </div>
              <FlowChart points={financial.inflowsVsOutflows ?? []} />
            </div>

            <PrimaryButton
              onClick={onRunAgent}
              disabled={agentStage === "thinking"}
              className="mt-4"
            >
              {agentStage === "done"
                ? "Look at my payments again"
                : "Look at my payments"}
            </PrimaryButton>
            </div>

            <div className="rounded-[1.6rem] border border-hairline bg-white p-5 sm:p-6 lg:col-span-3">
              <p className="text-lg tracking-[-0.03em]">Your credit</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Payments for this wallet live under Wallet. This page is the
                score from money we could confirm on Avalanche.
              </p>
              <button
                type="button"
                onClick={() => onTab("wallet")}
                className="mt-4 text-sm font-semibold text-mint-deep"
              >
                Open Wallet
              </button>
            </div>
          </div>
        ) : null}

        {hasLiveData && homePane === "review" ? (
          <div className="fade-up grid items-start gap-8 md:grid-cols-2">
            <div className="rounded-3xl border border-hairline bg-white px-6 py-8 text-center">
            <div className="mb-6 text-xl tracking-[-0.03em]">
              We’re reading the money
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
                      {formatUsdt(ceilingUsdc)}
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
                    onClick={() => goHome("docs")}
                    className="flex w-full items-center justify-between rounded-full bg-mint-deep px-4 py-3.5 text-sm font-medium text-white"
                  >
                    View your documents
                    <ChevronRight size={16} />
                  </button>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    This is a snapshot. Keep using your wallet for payments and
                    your score can change over time.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {hasLiveData && homePane === "docs" ? (
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
                <PrimaryButton onClick={() => goHome("review")}>
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
                          {formatUsdt(ceilingUsdc)}
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
                    className="font-heading flex flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-mint-deep py-3 text-[12.5px] font-bold text-white"
                  >
                    <Download size={14} /> Download
                  </button>
                  <button
                    type="button"
                    onClick={onPrint}
                    className="font-heading flex flex-1 items-center justify-center gap-1.5 rounded-[14px] border border-mint-deep bg-white py-3 text-[12.5px] font-bold text-mint-deep"
                  >
                    <Printer size={14} /> Print
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}
        </div>
        ) : null}

        {tab === "profile" ? (
          <div className="fade-up max-w-lg">
            <h1 className="display text-[clamp(1.9rem,4vw,2.8rem)]">Profile</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              How we greet you, and the number we can reach you on.
            </p>
            <form
              className="mt-6 grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void saveProfile();
              }}
            >
              <label className="grid gap-1 text-sm">
                First name
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="rounded-2xl border border-hairline bg-white px-4 py-3 outline-none"
                />
              </label>
              <label className="grid gap-1 text-sm">
                Last name
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="rounded-2xl border border-hairline bg-white px-4 py-3 outline-none"
                />
              </label>
              <label className="grid gap-1 text-sm">
                Email
                <input
                  value={profile?.email ?? ""}
                  readOnly
                  className="rounded-2xl border border-hairline bg-canvas px-4 py-3 text-muted-foreground outline-none"
                />
              </label>
              <label className="grid gap-1 text-sm">
                Mobile
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="rounded-2xl border border-hairline bg-white px-4 py-3 outline-none"
                />
              </label>
              <PrimaryButton type="submit" disabled={saving} className="sm:w-auto sm:px-6">
                {saving ? "Saving…" : "Save"}
              </PrimaryButton>
            </form>
          </div>
        ) : null}

        {tab === "settings" ? (
          <div className="fade-up max-w-lg grid gap-8">
            <div>
              <h1 className="display text-[clamp(1.9rem,4vw,2.8rem)]">Settings</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Password, authenticator, a sample walkthrough, and leaving the account.
              </p>
            </div>
            <form
              className="grid gap-4 rounded-[1.5rem] border border-hairline bg-white px-5 py-5"
              onSubmit={(event) => {
                event.preventDefault();
                void savePassword();
              }}
            >
              <h2 className="text-sm font-semibold">Password</h2>
              <label className="grid gap-1 text-sm">
                Current
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="rounded-2xl border border-hairline bg-canvas px-4 py-3 outline-none"
                />
              </label>
              <label className="grid gap-1 text-sm">
                New
                <input
                  type="password"
                  value={nextPassword}
                  onChange={(event) => setNextPassword(event.target.value)}
                  className="rounded-2xl border border-hairline bg-canvas px-4 py-3 outline-none"
                />
              </label>
              <PrimaryButton type="submit" disabled={saving} className="sm:w-auto sm:px-6">
                {saving ? "Saving…" : "Update password"}
              </PrimaryButton>
            </form>
            <div className="rounded-[1.5rem] border border-hairline bg-white px-5 py-5">
              <h2 className="text-sm font-semibold">Authenticator</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {profile?.totpEnabled
                  ? "An authenticator app is on. Old names in the app cannot be renamed. Turn it off, delete the old entry on your phone, then add it again as Kredoof : your email."
                  : "Optional extra lock when you sign in."}
              </p>
              {profile?.totpEnabled ? (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Turn off the authenticator? You can set it up again next."
                      )
                    ) {
                      return;
                    }
                    void (async () => {
                      const res = await fetch("/api/auth/totp/disable", {
                        method: "POST",
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        setNotice(null);
                        setAccountNote(
                          data.error ?? "Could not turn off the authenticator."
                        );
                        return;
                      }
                      setProfile((current) =>
                        current ? { ...current, totpEnabled: false } : current
                      );
                      router.push("/onboard?step=totp-setup");
                    })();
                  }}
                  className="mt-3 text-sm font-semibold text-[#C24545]"
                >
                  Turn off and set up again
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push("/onboard?step=totp-setup")}
                  className="mt-3 text-sm font-semibold text-mint-deep"
                >
                  Set up authenticator
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => onTab("home")}
              className="text-left text-sm font-semibold text-mint-deep"
            >
              Wallet setup videos are on Home
            </button>
            <button
              type="button"
              onClick={() => router.push("/how")}
              className="text-left text-sm font-semibold text-mint-deep"
            >
              How Kredoof works
            </button>
            <div className="flex flex-col gap-3">
              {onSignOut ? (
                <button
                  type="button"
                  onClick={() => onSignOut()}
                  className="text-left text-sm font-semibold text-mint-deep"
                >
                  Log out
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
                    onDeleteAccount();
                  }}
                  className="text-left text-sm font-semibold text-[#C24545]"
                >
                  Delete account
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-white/95 px-2 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onTab(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl px-1.5 py-1.5 text-[11px] font-semibold",
              tab === item.id ? "text-foreground" : "text-[#a9b0a2]"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-10 items-center justify-center rounded-xl",
                tab === item.id ? "bg-mint-deep text-white" : "bg-transparent"
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
