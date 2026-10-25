"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneShell } from "@/components/mobile/phone-shell";
import { PrimaryButton } from "@/components/mobile/ui";
import { formatKsh, formatKesOfUsdc, formatUsdt, usdtFromKes } from "@/lib/format";
import { DAILY_INTEREST_LABEL, LEAD_FEE_KES, SHORT_TERM_DAYS } from "@/lib/loan-terms";
import type { MarketplaceFile } from "@/lib/marketplace-file";

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
    <div className="rounded-2xl border border-hairline bg-white px-5 py-4">
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
              ? "Put in KSh first"
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
              ? "Put in more KSh"
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

export function LenderDeskScreen() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState<MarketplaceFile[]>([]);
  const [mine, setMine] = useState<MarketplaceFile[]>([]);
  const [floatKes, setFloatKes] = useState(0);
  const [putIn, setPutIn] = useState("1000");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    return Promise.all([
      fetch("/api/lender/leads"),
      fetch("/api/lender/cash"),
    ])
      .then(async ([leadsRes, cashRes]) => {
        const data = await leadsRes.json().catch(() => ({}));
        const cash = await cashRes.json().catch(() => ({}));
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
        }
        setError(null);
      })
      .catch(() => setError("Could not load files"));
  }, [router]);

  useEffect(() => {
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

  async function addMoney() {
    const kes = Math.round(Number(putIn));
    setAdding(true);
    setError(null);
    const res = await fetch("/api/lender/cash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kes }),
    });
    const data = await res.json().catch(() => ({}));
    setAdding(false);
    if (!res.ok) {
      setError(data.error ?? "Could not add money");
      return;
    }
    setFloatKes(Number(data.kes) || 0);
    setPutIn("");
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.push("/");
    router.refresh();
  }

  if (!ready) return null;

  return (
    <PhoneShell>
      <div className="max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Lender desk
        </p>
        <h1 className="font-heading mt-2 text-3xl font-extrabold text-foreground sm:text-4xl">
          Qualified files
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
          Borrowers who qualify land here. Put KSh on this desk first. Taking a file
          costs {formatKsh(LEAD_FEE_KES)}. Funding takes the listed shillings from your
          float, and the borrower gets USDT on Avalanche. You are not a licensed lender
          through Kredoof.
        </p>
        {error ? <p className="mt-4 text-sm text-[#C24545]">{error}</p> : null}
      </div>

      <section className="mt-8 rounded-2xl border border-hairline bg-white px-5 py-5">
        <h2 className="font-heading text-lg font-bold">Your money</h2>
        <p className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">
          {formatKsh(floatKes)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {floatKes > 0
            ? `That is about ${formatUsdt(usdtFromKes(floatKes))} we can send for you.`
            : "Nothing on the desk yet. Add at least KSh 100."}
        </p>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            void addMoney();
          }}
        >
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-[14px] border border-hairline px-3.5 py-3">
            <span className="shrink-0 text-sm text-muted-foreground">KSh</span>
            <input
              value={putIn}
              onChange={(event) => setPutIn(event.target.value)}
              inputMode="numeric"
              placeholder="1000"
              aria-label="Amount in Kenyan shillings"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <PrimaryButton
            type="submit"
            disabled={adding}
            className="sm:w-auto sm:px-6"
          >
            {adding ? "Adding…" : "Put in KSh"}
          </PrimaryButton>
        </form>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          This is your desk float, not an M-Pesa pull yet. Record the shillings you are
          putting in. Kredoof sends the matching USDT to the borrower from treasury.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-lg font-bold">Open marketplace</h2>
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

      <section className="mt-10">
        <h2 className="font-heading text-lg font-bold">Your exclusive files</h2>
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

      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-8 text-sm font-semibold text-mint-deep"
      >
        Sign out
      </button>
    </PhoneShell>
  );
}
