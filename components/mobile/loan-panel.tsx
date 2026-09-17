"use client";

import { parseUnits } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { useMemo, useState } from "react";
import { PrimaryButton } from "@/components/mobile/ui";
import { USDC_AVALANCHE, KREDOOF_TREASURY } from "@/lib/constants";
import { explorerTxUrl, formatUsdc } from "@/lib/format";
import {
  DAILY_INTEREST_LABEL,
  LONG_TERM_DAYS,
  SHORT_TERM_DAYS,
  interestAmount,
  repaymentDue,
} from "@/lib/loan-terms";
import { cn } from "@/lib/utils";

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

const treasury = KREDOOF_TREASURY;

export function LoanPanel({
  eligible,
  limitUsdc,
  allowsLongTerm,
  hasOpenLoan,
  openRepayUsdc,
  onLoanChange,
}: {
  eligible: boolean;
  limitUsdc: number;
  allowsLongTerm: boolean;
  hasOpenLoan: boolean;
  openRepayUsdc?: number | null;
  onLoanChange?: () => void;
}) {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [status, setStatus] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [termDays, setTermDays] = useState(SHORT_TERM_DAYS);
  const amount = Math.max(1, Math.round(limitUsdc * 100) / 100);
  const due = useMemo(
    () => repaymentDue(amount, termDays),
    [amount, termDays]
  );
  const interest = useMemo(
    () => interestAmount(amount, termDays),
    [amount, termDays]
  );
  const repayAmount = openRepayUsdc && openRepayUsdc > 0 ? openRepayUsdc : due;

  async function draw() {
    setStatus(null);
    const res = await fetch("/api/loans/disburse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: address, amountUsdc: amount, termDays }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error ?? "We could not send the loan right now.");
      return;
    }
    setHash(data.hash);
    setStatus(
      `The loan is on its way. Pay ${formatUsdc(data.loan?.repay_usdc ?? due)} within ${termDays} days.`
    );
    onLoanChange?.();
  }

  async function repay() {
    if (!treasury) {
      setStatus("Repay is not set up yet.");
      return;
    }
    if (!address) {
      setStatus("Connect the same wallet you used for the review.");
      return;
    }
    setStatus(null);
    const tx = await writeContractAsync({
      address: USDC_AVALANCHE,
      abi: ERC20_TRANSFER,
      functionName: "transfer",
      args: [treasury, parseUnits(repayAmount.toFixed(6), 6)],
    });
    setHash(tx);
    await fetch("/api/loans/repay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash: tx }),
    }).catch(() => null);
    setStatus("Your repayment has been sent, including the daily interest.");
    onLoanChange?.();
  }

  if (!eligible || amount <= 0) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        This wallet does not qualify for a loan right now.
      </p>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-hairline bg-[#FAFBF9] p-4 text-left">
      <div className="font-heading text-sm font-bold">Your loan</div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Interest is {DAILY_INTEREST_LABEL} (simple). You pay back more than you
        borrow. Pick 16 days, or 30 days once we trust this wallet more.
      </p>
      <div className="mt-3 text-sm font-semibold">Up to {formatUsdc(amount)}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTermDays(SHORT_TERM_DAYS)}
          disabled={hasOpenLoan}
          className={cn(
            "rounded-xl border px-3 py-3 text-left text-xs font-semibold",
            termDays === SHORT_TERM_DAYS
              ? "border-mint-deep bg-mint"
              : "border-hairline bg-white"
          )}
        >
          Pay in 16 days
          <div className="mt-1 font-normal text-muted-foreground">
            Pay back {formatUsdc(repaymentDue(amount, SHORT_TERM_DAYS))}
          </div>
        </button>
        <button
          type="button"
          onClick={() => {
            if (allowsLongTerm) setTermDays(LONG_TERM_DAYS);
          }}
          disabled={hasOpenLoan || !allowsLongTerm}
          className={cn(
            "rounded-xl border px-3 py-3 text-left text-xs font-semibold disabled:opacity-50",
            termDays === LONG_TERM_DAYS
              ? "border-mint-deep bg-mint"
              : "border-hairline bg-white"
          )}
        >
          Pay in 30 days
          <div className="mt-1 font-normal text-muted-foreground">
            {allowsLongTerm
              ? `Pay back ${formatUsdc(repaymentDue(amount, LONG_TERM_DAYS))}`
              : "Unlocks after a paid loan or a stronger score"}
          </div>
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Interest for {termDays} days: {formatUsdc(interest)}. Total to send back:{" "}
        {formatUsdc(due)}.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <PrimaryButton
          onClick={draw}
          disabled={isPending || !address || hasOpenLoan}
        >
          Get the loan
        </PrimaryButton>
        <button
          type="button"
          onClick={repay}
          disabled={isPending || !address || !hasOpenLoan}
          className="font-heading rounded-2xl border border-hairline px-4 py-3 text-sm font-bold"
        >
          Pay it back
        </button>
      </div>
      {status ? (
        <p className="mt-3 text-xs text-muted-foreground">{status}</p>
      ) : null}
      {hash ? (
        <a
          className="mt-2 inline-block text-[11px] font-semibold text-mint-deep"
          href={explorerTxUrl(hash)}
          target="_blank"
          rel="noreferrer"
        >
          See this payment
        </a>
      ) : null}
    </div>
  );
}
