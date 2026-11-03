"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { parseUnits } from "viem";
import {
  useAccount,
  useChainId,
  useConnect,
  useConnectors,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { avalanche } from "wagmi/chains";
import {
  ArrowDownToLine,
  Files,
  Loader2,
  LogOut,
  Settings,
  Smartphone,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";
import { LenderDemoVideo } from "@/components/mobile/lender-demo-video";
import { Avatar, PrimaryButton } from "@/components/mobile/ui";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BrandMark } from "@/components/brand/mark";
import { AVALANCHE_CHAIN_ID, KREDOOF_TREASURY, USDT_AVALANCHE } from "@/lib/constants";
import { formatKsh, formatKesOfUsdc, formatUsdt, shortenAddress, usdtFromKes } from "@/lib/format";
import { hello } from "@/lib/greet";
import { DAILY_INTEREST_LABEL, LEAD_FEE_KES, SHORT_TERM_DAYS } from "@/lib/loan-terms";
import { cn } from "@/lib/utils";
import {
  activeConnectorId,
  connectDisplayWallet,
  listedWallets,
} from "@/lib/wallets";
import type { MarketplaceFile } from "@/lib/marketplace-file";
import type { DepositMethod } from "@/lib/persist";

type Tab = "home" | "wallet" | "files" | "profile" | "settings";
type MethodInfo = {
  id: DepositMethod;
  label: string;
  hint: string;
  available: boolean;
};
type DepositRow = {
  id: string;
  kes: number;
  method: DepositMethod;
  status: string;
  createdAt: number;
};
type Profile = {
  email: string;
  phone: string;
  name: string;
  firstName: string;
  lastName: string;
  totpEnabled: boolean;
};

const ERC20_TRANSFER = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

const NAV: { id: Tab; label: string; icon: typeof Wallet }[] = [
  { id: "home", label: "Home", icon: Sparkles },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "files", label: "Files", icon: Files },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "settings", label: "Settings", icon: Settings },
];

function FileCard({
  file,
  mine,
  busyId,
  floatKes,
  onClaim,
  onFund,
}: {
  file: MarketplaceFile;
  mine: boolean;
  busyId: string | null;
  floatKes: number;
  onClaim: (id: string) => void;
  onFund: (id: string) => void;
}) {
  const amount = usdtFromKes(file.limit_kes ?? 0);
  const kes = file.limit_kes ?? 0;
  return (
    <div className="rounded-[1.5rem] border border-hairline bg-white/80 px-5 py-5 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-heading text-sm font-bold text-foreground">
            {mine && file.borrowerName ? file.borrowerName : "Qualified file"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Score {file.score ?? "—"} · you put in {formatKsh(kes)}
            {amount > 0 ? ` · they get ${formatUsdt(amount)}` : ""}
          </p>
          {mine && file.wallet ? (
            <p className="font-mono mt-1 text-[11px] text-muted-foreground">{file.wallet}</p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Wallet is shown after you take the file.
            </p>
          )}
        </div>
        <span className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          {file.status}
        </span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        You think in shillings. The borrower receives USDT on Avalanche at the listed
        rate. Exclusive file: {formatKsh(file.fee_kes || LEAD_FEE_KES)}. Daily interest{" "}
        {DAILY_INTEREST_LABEL} goes to you. Kredoof takes 1% only when you fund.
      </p>
      {!mine ? (
        <PrimaryButton
          className="mt-4 sm:w-auto sm:px-6"
          disabled={busyId === file.id || floatKes < LEAD_FEE_KES}
          onClick={() => onClaim(file.id)}
        >
          {busyId === file.id
            ? "Please wait…"
            : floatKes < LEAD_FEE_KES
              ? "Deposit first"
              : `Take file · ${formatKsh(LEAD_FEE_KES)}`}
        </PrimaryButton>
      ) : file.status === "funded" ? (
        <p className="mt-4 text-sm font-semibold text-[#123A22]">Funded</p>
      ) : (
        <PrimaryButton
          className="mt-4 sm:w-auto sm:px-6"
          disabled={busyId === file.id || floatKes < kes}
          onClick={() => onFund(file.id)}
        >
          {busyId === file.id
            ? "Please wait…"
            : floatKes < kes
              ? "Deposit more first"
              : `Send ${formatKsh(kes)} as USDT`}
        </PrimaryButton>
      )}
      {mine && amount > 0 && file.status !== "funded" ? (
        <p className="mt-2 text-xs text-muted-foreground">
          We convert your {formatKsh(kes)} to {formatUsdt(amount)} and send it. Borrower
          receives that minus 1%, and repays USDT over {SHORT_TERM_DAYS} days
          ({formatKesOfUsdc(amount)}).
        </p>
      ) : null}
    </div>
  );
}

function methodIcon(id: DepositMethod) {
  return id === "mpesa" ? Smartphone : Wallet;
}

function methodLabel(id: DepositMethod) {
  if (id === "mpesa") return "M-Pesa";
  if (id === "avalanche") return "Avalanche";
  return id;
}

export function LenderDeskScreen() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const connectors = useConnectors();
  const { connectAsync, isPending: isConnecting, variables } = useConnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { writeContractAsync, isPending: isSending } = useWriteContract();
  const [walletPicker, setWalletPicker] = useState(false);
  const walletChoices = useMemo(() => listedWallets(connectors), [connectors]);
  const [tab, setTab] = useState<Tab>("home");
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState<MarketplaceFile[]>([]);
  const [mine, setMine] = useState<MarketplaceFile[]>([]);
  const [floatKes, setFloatKes] = useState(0);
  const [methods, setMethods] = useState<MethodInfo[]>([]);
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositKes, setDepositKes] = useState("1000");
  const [depositMethod, setDepositMethod] = useState<DepositMethod>("avalanche");
  const [depositing, setDepositing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    return Promise.all([
      fetch("/api/lender/leads"),
      fetch("/api/lender/deposit"),
      fetch("/api/account/profile"),
    ])
      .then(async ([leadsRes, cashRes, profileRes]) => {
        const data = await leadsRes.json().catch(() => ({}));
        const cash = await cashRes.json().catch(() => ({}));
        const account = await profileRes.json().catch(() => ({}));
        if (leadsRes.status === 401 || cashRes.status === 401) {
          router.replace("/onboard?step=signin&as=lender");
          return;
        }
        if (leadsRes.status === 403 || cashRes.status === 403) {
          router.replace("/onboard?step=connect");
          return;
        }
        if (!leadsRes.ok) {
          setError(data.error ?? "Could not load files");
          return;
        }
        setOpen(data.open ?? []);
        setMine(data.mine ?? []);
        if (cashRes.ok && typeof cash.kes === "number") {
          setFloatKes(cash.kes);
          setMethods(cash.methods ?? []);
          setDeposits(cash.deposits ?? []);
          if (cash.phone) setPhone(cash.phone);
        }
        if (profileRes.ok && account.email) {
          setProfile(account);
          setFirstName(account.firstName ?? "");
          setLastName(account.lastName ?? "");
          setPhone(account.phone ?? "");
        }
        setError(null);
      })
      .catch(() => setError("Could not load your desk"));
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("deposit") === "ok") {
      setNotice("Payment received. Your wallet is updated.");
      setTab("wallet");
    }
    if (params.get("deposit") === "cancel") {
      setError("Deposit was cancelled. Nothing was added.");
      setTab("wallet");
    }
    void load().finally(() => setReady(true));
  }, [load]);

  async function claim(id: string) {
    setBusyId(id);
    setError(null);
    const res = await fetch("/api/lender/leads/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(data.error ?? "Could not take that file");
      return;
    }
    await load();
  }

  async function fund(id: string) {
    setBusyId(id);
    setError(null);
    const res = await fetch("/api/lender/leads/fund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(data.error ?? "Could not fund that file");
      return;
    }
    await load();
  }

  async function startDeposit() {
    const kes = Math.round(Number(depositKes));
    setDepositing(true);
    setError(null);
    setNotice(null);
    try {
      let hash: string | undefined;
      if (depositMethod === "avalanche") {
        if (!address || !isConnected) {
          throw new Error("Connect an Avalanche wallet first");
        }
        if (chainId !== AVALANCHE_CHAIN_ID) {
          await switchChain({ chainId: avalanche.id });
        }
        const usdt = usdtFromKes(kes);
        hash = await writeContractAsync({
          address: USDT_AVALANCHE,
          abi: ERC20_TRANSFER,
          functionName: "transfer",
          args: [KREDOOF_TREASURY, parseUnits(usdt.toFixed(6), 6)],
        });
      }
      const res = await fetch("/api/lender/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kes, method: depositMethod, phone, hash }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Could not start the deposit");
      }
      setDepositOpen(false);
      setNotice(
        data.message ??
          (depositMethod === "avalanche"
            ? "USDT received. Your wallet is updated."
            : "Check your phone to finish the payment.")
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the deposit");
    } finally {
      setDepositing(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    setError(null);
    setNotice(null);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, phone }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save");
      return;
    }
    setProfile(data);
    setNotice("Profile saved.");
  }

  async function savePassword() {
    setSaving(true);
    setError(null);
    setNotice(null);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, nextPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Could not change password");
      return;
    }
    setCurrentPassword("");
    setNextPassword("");
    setNotice("Password updated.");
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.push("/");
    router.refresh();
  }

  async function deleteAccount() {
    if (!window.confirm("Delete this account? This cannot be undone.")) return;
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not delete this account");
      return;
    }
    await signOut();
  }

  if (!ready) return null;

  const hi = hello(profile?.name);
  const initials = `${firstName[0] ?? "K"}${lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-20 border-b border-hairline bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-[15px] font-medium tracking-[-0.04em]">
              <BrandMark size={20} />
              Kredoof
            </span>
            <span className="hidden h-4 w-px bg-hairline sm:block" />
            <div className="hidden items-center gap-2 sm:flex">
              <Avatar initials={initials} active size={32} />
              <div>
                <div className="text-[11px] text-muted-foreground">{hi}</div>
                <div className="text-sm font-medium leading-tight">
                  {profile?.name || "Lender"}
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDepositOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-mint-deep px-3.5 py-2 text-sm font-medium text-white"
          >
            <ArrowDownToLine size={16} />
            Deposit
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
                onClick={() => {
                  setTab(item.id);
                  setError(null);
                }}
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
            <button
              type="button"
              onClick={() => void signOut()}
              className="font-heading mt-4 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#C24545] hover:bg-white"
            >
              <LogOut size={16} />
              Log out
            </button>
          </nav>
        </aside>

        <div className="min-w-0 flex-1 pb-32 md:pb-4">
          {error ? <p className="mb-4 text-sm text-[#C24545]">{error}</p> : null}
          {notice ? <p className="mb-4 text-sm text-mint-deep">{notice}</p> : null}

          {tab === "home" ? (
            <div className="fade-up mb-8 grid gap-6">
              <div>
                <p className="text-sm text-mint-deep md:hidden">{hi}</p>
                <h1 className="display mt-1 text-[clamp(1.9rem,4vw,2.8rem)]">
                  {hi}
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  You put in shillings, pick a qualified file, and send USDT.
                  Sample clips are marked Sample. Wallet and Files stay real.
                </p>
              </div>
              <ol className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    "Open Wallet and deposit with M-Pesa or Avalanche USDT. The balance is only money that arrived.",
                    `Take a qualified file. That exclusive look costs ${formatKsh(LEAD_FEE_KES)} from your float.`,
                    "Fund from your float. The borrower receives USDT on Avalanche. You keep daily interest.",
                    "Kredoof takes 1% only when you fund. Repayment comes back as USDT when they actually pay.",
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
              <div className="flex flex-wrap gap-3">
                <PrimaryButton
                  className="sm:w-auto sm:px-8"
                  onClick={() => setDepositOpen(true)}
                >
                  Deposit
                </PrimaryButton>
                <button
                  type="button"
                  onClick={() => setTab("files")}
                  className="rounded-full border border-hairline px-5 py-3 text-sm font-semibold"
                >
                  Open Files
                </button>
              </div>
              <div>
                <h2 className="text-xl tracking-[-0.04em]">Your side, in a clip</h2>
                <p className="mt-1 mb-3 text-sm text-muted-foreground">
                  This is a demo of a lender desk. It is not your float or a live
                  borrower.
                </p>
                <LenderDemoVideo />
              </div>
            </div>
          ) : null}

          {tab === "wallet" ? (
            <div className="fade-up grid gap-6">
              <div>
                <p className="text-sm text-mint-deep md:hidden">{hi}</p>
                <h1 className="display mt-1 text-[clamp(1.9rem,4vw,2.8rem)]">Wallet</h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  This balance is only money that actually arrived. It is not a number you type in.
                </p>
              </div>
              <section className="rounded-[1.6rem] border border-hairline bg-white px-6 py-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-sm text-muted-foreground">Available</h2>
                    <p className="display mt-2 text-4xl text-mint-deep sm:text-5xl">
                      {formatKsh(floatKes)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {floatKes > 0
                        ? `About ${formatUsdt(usdtFromKes(floatKes))} we can send for you.`
                        : "Empty until a deposit clears."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDepositOpen(true)}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mint-deep text-white"
                    aria-label="Deposit"
                  >
                    <ArrowDownToLine size={22} />
                  </button>
                </div>
              </section>
              <section>
                <h2 className="text-xl tracking-[-0.04em]">Deposits</h2>
                <div className="mt-3 grid gap-2">
                  {deposits.length === 0 ? (
                    <p className="rounded-2xl border border-hairline bg-white px-5 py-6 text-sm text-muted-foreground">
                      No deposits yet. Use the deposit icon to pay with M-Pesa or an Avalanche wallet.
                    </p>
                  ) : (
                    deposits.map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center justify-between rounded-2xl border border-hairline bg-white px-5 py-4"
                      >
                        <div>
                          <p className="text-sm font-semibold">{formatKsh(row.kes)}</p>
                          <p className="text-xs text-muted-foreground">
                            {methodLabel(row.method)}
                          </p>
                        </div>
                        <span className="text-xs font-semibold tracking-[0.06em] uppercase text-muted-foreground">
                          {row.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          ) : null}

          {tab === "files" ? (
            <div className="fade-up grid gap-8">
              <div>
                <p className="text-sm text-mint-deep">Qualified vendors</p>
                <h1 className="display mt-1 text-[clamp(1.9rem,4vw,2.8rem)]">
                  Files
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  Borrowers who qualify land here. Taking a file costs {formatKsh(LEAD_FEE_KES)}
                  from your wallet. Funding takes the listed shillings, and they get USDT.
                </p>
              </div>
              <section>
                <h2 className="text-xl tracking-[-0.04em]">Open marketplace</h2>
                <div className="mt-3 grid gap-3">
                  {open.length === 0 ? (
                    <p className="rounded-2xl border border-hairline bg-white px-5 py-6 text-sm text-muted-foreground">
                      No open files yet. They appear when a borrower connects a wallet and qualifies.
                    </p>
                  ) : (
                    open.map((file) => (
                      <FileCard
                        key={file.id}
                        file={file}
                        mine={false}
                        busyId={busyId}
                        floatKes={floatKes}
                        onClaim={(id) => void claim(id)}
                        onFund={(id) => void fund(id)}
                      />
                    ))
                  )}
                </div>
              </section>
              <section>
                <h2 className="text-xl tracking-[-0.04em]">Your exclusive files</h2>
                <div className="mt-3 grid gap-3">
                  {mine.length === 0 ? (
                    <p className="rounded-2xl border border-hairline bg-white px-5 py-6 text-sm text-muted-foreground">
                      Files you take show up here with the borrower name and wallet so you can fund.
                    </p>
                  ) : (
                    mine.map((file) => (
                      <FileCard
                        key={file.id}
                        file={file}
                        mine
                        busyId={busyId}
                        floatKes={floatKes}
                        onClaim={(id) => void claim(id)}
                        onFund={(id) => void fund(id)}
                      />
                    ))
                  )}
                </div>
              </section>
            </div>
          ) : null}

          {tab === "profile" ? (
            <div className="fade-up max-w-lg">
              <h1 className="display text-[clamp(1.9rem,4vw,2.8rem)]">Profile</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                How we greet you, and the number M-Pesa uses.
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
                  Password, authenticator, and leaving the account.
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
                    ? "An authenticator app is on. If the name in the app is old, scan the QR again so it shows Kredoof : your email."
                    : "Optional extra lock when you sign in."}
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/onboard?step=totp-setup")}
                  className="mt-3 text-sm font-semibold text-mint-deep"
                >
                  {profile?.totpEnabled
                    ? "Update the name in your app"
                    : "Set up authenticator"}
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setTab("home")}
                  className="text-left text-sm font-semibold text-mint-deep"
                >
                  How lending works is on Home
                </button>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="text-left text-sm font-semibold text-mint-deep"
                >
                  Log out
                </button>
                <button
                  type="button"
                  onClick={() => void deleteAccount()}
                  className="text-left text-sm font-semibold text-[#C24545]"
                >
                  Delete account
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-white/95 px-4 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl px-1.5 py-1.5 text-[10px] font-semibold sm:px-3 sm:text-[11px]",
                tab === item.id ? "text-foreground" : "text-[#a9b0a2]"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-10 items-center justify-center rounded-xl sm:w-12",
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
        open={depositOpen}
        onOpenChange={(open) => {
          setDepositOpen(open);
          if (!open) setWalletPicker(false);
        }}
      >
        <SheetContent side="bottom" className="rounded-t-[24px]">
          <SheetHeader>
            <SheetTitle>Deposit</SheetTitle>
          </SheetHeader>
          <form
            className="space-y-4 px-4 pb-8"
            onSubmit={(event) => {
              event.preventDefault();
              void startDeposit();
            }}
          >
            <label className="flex items-center gap-2 rounded-full border border-hairline bg-canvas px-4 py-3">
              <span className="shrink-0 text-sm text-muted-foreground">KSh</span>
              <input
                value={depositKes}
                onChange={(event) => setDepositKes(event.target.value)}
                inputMode="numeric"
                aria-label="Amount in Kenyan shillings"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            <div className="grid gap-2">
              {(methods.length
                ? methods.filter(
                    (method) => method.id === "mpesa" || method.id === "avalanche"
                  )
                : [
                    {
                      id: "avalanche" as const,
                      label: "Avalanche wallet",
                      hint: "Send USDT from MetaMask, Core, or Trust Wallet.",
                      available: true,
                    },
                    {
                      id: "mpesa" as const,
                      label: "M-Pesa",
                      hint: "Pay from your phone.",
                      available: false,
                    },
                  ]
              ).map((method) => {
                const Icon = methodIcon(method.id);
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setDepositMethod(method.id)}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border px-4 py-3 text-left",
                      depositMethod === method.id
                        ? "border-mint-deep bg-mint text-mint-deep"
                        : "border-hairline bg-white/70"
                    )}
                  >
                    <span className="mt-0.5 text-mint-deep">
                      <Icon size={18} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{method.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {method.hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {depositMethod === "avalanche" ? (
              <div className="grid gap-2">
                {isConnected && address ? (
                  <p className="text-xs text-muted-foreground">
                    Connected {shortenAddress(address)}
                    {chainId !== AVALANCHE_CHAIN_ID
                      ? " · switch this wallet to Avalanche"
                      : " · Send USDT next. Avalanche has to confirm before we add it."}
                  </p>
                ) : walletPicker ? (
                  <>
                    <p className="text-xs font-semibold text-foreground">
                      Choose a wallet
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {walletChoices.map((item) => {
                        const pending = Boolean(
                          isConnecting &&
                            variables?.connector &&
                            "id" in variables.connector &&
                            item.matches.some(
                              (match) =>
                                match.id ===
                                activeConnectorId(variables.connector)
                            )
                        );
                        return (
                          <button
                            key={item.label}
                            type="button"
                            disabled={isConnecting}
                            onClick={() => {
                              void connectDisplayWallet(
                                item.label,
                                item.matches,
                                connectAsync
                              ).catch((err) =>
                                setError(
                                  err instanceof Error
                                    ? err.message
                                    : "Could not connect that wallet."
                                )
                              );
                            }}
                            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-mint-deep px-3 py-3 text-sm font-medium text-white disabled:opacity-55"
                          >
                            {pending ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Wallet size={14} />
                            )}
                            {pending ? "Connecting…" : item.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      MetaMask, Core, or Trust Wallet will open so you can approve. Then send USDT.
                    </p>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setWalletPicker(true)}
                      className="inline-flex w-full items-center justify-center rounded-full bg-mint-deep px-4 py-3 text-sm font-medium text-white"
                    >
                      Connect Avalanche wallet
                    </button>
                    <p className="text-xs text-muted-foreground">
                      Next you pick MetaMask, Core, or Trust Wallet, then we send USDT on Avalanche.
                    </p>
                  </>
                )}
              </div>
            ) : null}
            <PrimaryButton
              type="submit"
              disabled={depositing || isSending || isSwitching}
            >
              {depositing || isSending
                ? "Sending…"
                : depositMethod === "avalanche"
                  ? "Send USDT"
                  : "Continue"}
            </PrimaryButton>
            <p className="text-xs leading-5 text-muted-foreground">
              Your wallet only goes up after M-Pesa or Avalanche confirms the money. We
              do not type numbers onto the balance.
            </p>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
