import {
  createWalletClient,
  http,
  parseUnits,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalanche } from "viem/chains";
import { USDC_AVALANCHE } from "@/lib/constants";
import {
  markLeadFunded,
  newLoanId,
  recordLoan,
  updateLoan,
  type StoredLoan,
} from "@/lib/persist";
import {
  DAILY_INTEREST_RATE,
  netDisbursed,
  originationFee,
  repaymentDue,
} from "@/lib/loan-terms";

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

export async function disburseFromTreasury(input: {
  to: `0x${string}`;
  amountUsdc: number;
  termDays: number;
  borrowerEmail?: string | null;
  leadId?: string | null;
}): Promise<{ hash: Hex; loan: StoredLoan }> {
  const key = process.env.TREASURY_PRIVATE_KEY?.trim();
  if (!key) {
    throw new Error(
      "Treasury key missing. TREASURY_PRIVATE_KEY must be set on the server."
    );
  }
  const repayAmount = repaymentDue(input.amountUsdc, input.termDays);
  const sent = netDisbursed(input.amountUsdc);
  const origination = originationFee(input.amountUsdc);
  const pk = (key.startsWith("0x") ? key : `0x${key}`) as Hex;
  const account = privateKeyToAccount(pk);
  const client = createWalletClient({
    account,
    chain: avalanche,
    transport: http("https://api.avax.network/ext/bc/C/rpc"),
  });
  const hash = await client.writeContract({
    address: USDC_AVALANCHE,
    abi: ERC20_TRANSFER,
    functionName: "transfer",
    args: [input.to, parseUnits(sent.toFixed(6), 6)],
  });
  const loan: StoredLoan = {
    id: newLoanId(),
    wallet: input.to.toLowerCase(),
    amount_usdc: input.amountUsdc,
    net_usdc: sent,
    origination_usdc: origination,
    app_fee_usdc: 0,
    lead_id: input.leadId ?? null,
    repay_usdc: repayAmount,
    term_days: input.termDays,
    daily_rate: DAILY_INTEREST_RATE,
    due_at: Date.now() + input.termDays * 24 * 60 * 60 * 1000,
    status: "drawn",
    disburse_tx: hash,
    created_at: Date.now(),
    email: input.borrowerEmail ?? null,
  };
  await recordLoan(loan).catch(() => null);
  const lead = await markLeadFunded({
    email: input.borrowerEmail,
    wallet: input.to,
    loanId: loan.id,
    leadId: input.leadId,
  }).catch(() => null);
  if (lead && !loan.lead_id) {
    loan.lead_id = lead.id;
    await updateLoan(loan.id, { lead_id: lead.id }).catch(() => null);
  }
  return { hash, loan };
}

export function treasuryErrorMessage(err: unknown): { error: string; status: number } {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("TREASURY_PRIVATE_KEY") || message.includes("Treasury key")) {
    return { error: message, status: 503 };
  }
  if (message.includes("insufficient") || message.includes("exceeds")) {
    return {
      error:
        "Treasury has no USDC (or no AVAX for gas). Send Avalanche USDC to the treasury wallet first.",
      status: 502,
    };
  }
  return { error: message, status: 502 };
}
