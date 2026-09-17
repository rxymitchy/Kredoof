import { NextResponse } from "next/server";
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
  hasOpenLoan,
  hasRepaidLoan,
  getUserByEmail,
  newLoanId,
  recordLoan,
  updateLoan,
} from "@/lib/persist";
import { apiOrigin, getSession } from "@/lib/session";
import {
  DAILY_INTEREST_RATE,
  LONG_TERM_DAYS,
  SHORT_TERM_DAYS,
  allowsLongTerm,
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

export async function POST(request: Request) {
  const key = process.env.TREASURY_PRIVATE_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      {
        error:
          "Treasury key missing. TREASURY_PRIVATE_KEY must be set on the server.",
      },
      { status: 503 }
    );
  }
  const body = (await request.json()) as {
    to?: `0x${string}`;
    amountUsdc?: number;
    email?: string;
    termDays?: number;
  };
  if (!body.to || !body.amountUsdc || body.amountUsdc <= 0) {
    return NextResponse.json({ error: "Invalid draw request" }, { status: 400 });
  }
  const session = await getSession();
  if (session.wallet && session.wallet !== body.to.toLowerCase()) {
    return NextResponse.json({ error: "Wallet mismatch" }, { status: 403 });
  }
  if (
    await hasOpenLoan({
      email: session.email ?? body.email,
      wallet: body.to,
    })
  ) {
    return NextResponse.json(
      { error: "Pay your current loan first." },
      { status: 409 }
    );
  }
  const termDays =
    body.termDays === LONG_TERM_DAYS ? LONG_TERM_DAYS : SHORT_TERM_DAYS;
  if (termDays === LONG_TERM_DAYS) {
    const user = session.email ? await getUserByEmail(session.email) : null;
    const repaid = await hasRepaidLoan({
      email: session.email ?? body.email,
      wallet: body.to,
    });
    if (!allowsLongTerm(user?.lastScore ?? 0, repaid)) {
      return NextResponse.json(
        {
          error:
            "The 30-day option opens after a stronger score or after you pay a loan on time.",
        },
        { status: 403 }
      );
    }
  }
  const repayAmount = repaymentDue(body.amountUsdc, termDays);
  const pk = (key.startsWith("0x") ? key : `0x${key}`) as Hex;
  const account = privateKeyToAccount(pk);
  const client = createWalletClient({
    account,
    chain: avalanche,
    transport: http("https://api.avax.network/ext/bc/C/rpc"),
  });
  try {
    const hash = await client.writeContract({
      address: USDC_AVALANCHE,
      abi: ERC20_TRANSFER,
      functionName: "transfer",
      args: [body.to, parseUnits(body.amountUsdc.toFixed(6), 6)],
    });
    const opened = {
      id: newLoanId(),
      wallet: body.to.toLowerCase(),
      amount_usdc: body.amountUsdc,
      repay_usdc: repayAmount,
      term_days: termDays,
      daily_rate: DAILY_INTEREST_RATE,
      due_at: Date.now() + termDays * 24 * 60 * 60 * 1000,
      status: "drawn",
      disburse_tx: hash,
      created_at: Date.now(),
      email: session.email ?? body.email,
    };
    await recordLoan(opened).catch(() => null);
    await fetch(`${apiOrigin()}/api/loans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet: body.to,
        amount_usdc: body.amountUsdc,
        email: session.email ?? body.email,
      }),
    })
      .then(async (r) => {
        const loan = await r.json();
        if (loan?.id) {
          await fetch(`${apiOrigin()}/api/loans/${loan.id}/disbursed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tx_hash: hash }),
          });
          await updateLoan(opened.id, { id: loan.id }).catch(() => null);
        }
      })
      .catch(() => null);
    return NextResponse.json({ hash, loan: opened });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error:
          message.includes("insufficient") || message.includes("exceeds")
            ? "Treasury has no USDC (or no AVAX for gas). Send Avalanche USDC to the treasury wallet first."
            : message,
      },
      { status: 502 }
    );
  }
}
