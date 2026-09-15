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
      setStatus(data.error ?? "Could not send USDC from the treasury");
      return;
    }
    setHash(data.hash);
    setStatus("Loan USDC sent from the Kredoof treasury.");
  }

  async function repay() {
    if (!treasury) {
      setStatus("Set NEXT_PUBLIC_TREASURY_ADDRESS to repay on-chain.");
      return;
    }
    if (!address) {
      setStatus("Connect the same wallet that was underwritten.");
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
    setStatus("Repayment sent on Avalanche.");
  }

  if (!eligible || amount <= 0) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        This wallet is not eligible to draw a USDC loan from the current policy.
      </p>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-hairline bg-[#FAFBF9] p-4 text-left">
      <div className="font-heading text-sm font-bold">USDC loan</div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Draw sends USDC from the Kredoof treasury ({treasury.slice(0, 6)}…
        {treasury.slice(-4)}) on Avalanche. Fund that address with USDC for
        draws to succeed. Repay sends USDC from your wallet back to it.
      </p>
      <div className="mt-3 text-sm font-semibold">{amount} USDC line</div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <PrimaryButton onClick={draw} disabled={isPending || !address}>
          Draw loan
        </PrimaryButton>
        <button
          type="button"
          onClick={repay}
          disabled={isPending || !address}
          className="font-heading rounded-2xl border border-hairline px-4 py-3 text-sm font-bold"
        >
          Repay in USDC
        </button>
      </div>
      {status ? (
        <p className="mt-3 text-xs text-muted-foreground">{status}</p>
      ) : null}
      {hash ? (
        <a
          className="mt-2 inline-block font-mono text-[11px] text-mint-deep"
          href={explorerTxUrl(hash)}
          target="_blank"
          rel="noreferrer"
        >
          View on Snowtrace
        </a>
      ) : null}
    </div>
  );
}
