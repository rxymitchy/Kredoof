import { NextResponse } from "next/server";
import {
  hasOpenLoan,
  hasRepaidLoan,
  getUserByEmail,
} from "@/lib/persist";
import { apiOrigin, getSession } from "@/lib/session";
import {
  LONG_TERM_DAYS,
  SHORT_TERM_DAYS,
  allowsLongTerm,
} from "@/lib/loan-terms";
import { disburseFromTreasury, treasuryErrorMessage } from "@/lib/treasury-disburse";

export async function POST(request: Request) {
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
  try {
    const { hash, loan } = await disburseFromTreasury({
      to: body.to,
      amountUsdc: body.amountUsdc,
      termDays,
      borrowerEmail: session.email ?? body.email,
    });
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
        const recorded = await r.json();
        if (recorded?.id) {
          await fetch(`${apiOrigin()}/api/loans/${recorded.id}/disbursed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tx_hash: hash }),
          });
        }
      })
      .catch(() => null);
    return NextResponse.json({ hash, loan });
  } catch (err) {
    const { error, status } = treasuryErrorMessage(err);
    return NextResponse.json({ error }, { status });
  }
}
