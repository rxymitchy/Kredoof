"use client";

import { parseUnits } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { useMemo, useState } from "react";
import { PrimaryButton } from "@/components/mobile/ui";
import { USDC_AVALANCHE, KREDOOF_TREASURY } from "@/lib/constants";
import { explorerTxUrl, formatUsdc } from "@/lib/format";
import {
  LONG_TERM_DAYS,
  SHORT_TERM_DAYS,
  netDisbursed,
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

function payByLabel(dueAt?: number | null) {
  if (!dueAt) return null;
  return new Date(dueAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function LoanPanel({
  eligible,
  limitUsdc,
  allowsLongTerm,
  hasOpenLoan,
  openRepayUsdc,
  openAmountDue,
  openLateFee,
  openDueAt,
  openDaysPastDue = 0,
  onLoanChange,
}: {
  eligible: boolean;
  limitUsdc: number;
  allowsLongTerm: boolean;
  hasOpenLoan: boolean;
  openRepayUsdc?: number | null;
  openAmountDue?: number | null;
  openLateFee?: number | null;
  openDueAt?: number | null;
  openDaysPastDue?: number;
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
  const received = useMemo(() => netDisbursed(amount), [amount]);
  const dueDate = payByLabel(openDueAt);
  const repayAmount =
    hasOpenLoan && openAmountDue && openAmountDue > 0
      ? openAmountDue
      : hasOpenLoan && openRepayUsdc && openRepayUsdc > 0
        ? openRepayUsdc
        : due;

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
    const got = data.loan?.net_usdc ?? received;
    const pay = data.loan?.repay_usdc ?? due;
    setStatus(
      `You will receive ${formatUsdc(got)}. Send back ${formatUsdc(pay)} in ${termDays} days.`
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
    setStatus("Your repayment has been sent.");
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
      <div className="mt-3 text-sm font-semibold">
        Approved up to {formatUsdc(amount)}
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        You receive {formatUsdc(received)}. A lender can also pick up this file
        on the lender desk. Send back the amount we show you, on time.
      </p>
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
            Send back {formatUsdc(repaymentDue(amount, SHORT_TERM_DAYS))}
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
              ? `Send back ${formatUsdc(repaymentDue(amount, LONG_TERM_DAYS))}`
              : "Unlocks after a paid loan or a stronger score"}
          </div>
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Send back {formatUsdc(hasOpenLoan ? repayAmount : due)}
        {hasOpenLoan && dueDate ? ` by ${dueDate}` : ` in ${termDays} days`}.
      </p>
      {hasOpenLoan && openDaysPastDue > 0 ? (
        <p className="mt-2 text-xs font-semibold text-[#C24545]">
          {dueDate
            ? `This was due ${dueDate}. Pay today.`
            : "This loan is past due. Pay today."}
          {openLateFee && openLateFee > 0
            ? ` A late charge of ${formatUsdc(openLateFee)} has been added. Send ${formatUsdc(repayAmount)}.`
            : ""}
        </p>
      ) : null}
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
