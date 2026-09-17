"use client";

import { parseUnits } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { useState } from "react";
import { PrimaryButton } from "@/components/mobile/ui";
import { USDC_AVALANCHE, KREDOOF_TREASURY } from "@/lib/constants";
import { explorerTxUrl } from "@/lib/format";

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
}: {
  eligible: boolean;
  limitUsdc: number;
}) {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [status, setStatus] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const amount = Math.max(1, Math.round(limitUsdc * 100) / 100);

  async function draw() {
    setStatus(null);
    const res = await fetch("/api/loans/disburse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: address, amountUsdc: amount }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error ?? "We could not send the loan right now.");
      return;
    }
    setHash(data.hash);
    setStatus("The loan money is on its way to your wallet.");
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
      args: [treasury, parseUnits(amount.toFixed(6), 6)],
    });
    setHash(tx);
    setStatus("Your repayment has been sent.");
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
        You can take up to {amount} in your wallet. We send the money to you.
        When you are ready, send the same amount back.
      </p>
      <div className="mt-3 text-sm font-semibold">Up to {amount}</div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <PrimaryButton onClick={draw} disabled={isPending || !address}>
          Get the loan
        </PrimaryButton>
        <button
          type="button"
          onClick={repay}
          disabled={isPending || !address}
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
