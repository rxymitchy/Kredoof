import { NextResponse } from "next/server";
import {
  hasOpenLoan,
  hasRepaidLoan,
  getUserByEmail,
} from "@/lib/persist";
import { parseAccountRole } from "@/lib/account-role";
import { apiOrigin, readActiveSession } from "@/lib/session";
import { usdtFromKes } from "@/lib/format";
import { bandForScore } from "@/lib/loan-bands";
import { clientKey, retryAfterSeconds, tooSoon } from "@/lib/rate-limit";
import {
  LONG_TERM_DAYS,
  SHORT_TERM_DAYS,
  allowsLongTerm,
} from "@/lib/loan-terms";
import { disburseFromTreasury, treasuryErrorMessage } from "@/lib/treasury-disburse";

export async function POST(request: Request) {
  const wait = await tooSoon(clientKey(request, "draw"), 8, 10 * 60 * 1000);
  if (wait > 0) {
    return NextResponse.json(
      { error: "Too many draw attempts. Wait a minute." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds(wait)) } }
    );
  }
  const session = await readActiveSession();
  if (!session.signedIn || !session.email || !session.wallet) {
    return NextResponse.json({ error: "Sign in and connect your wallet first" }, { status: 401 });
  }
  if (parseAccountRole(session.role) === "lender") {
    return NextResponse.json(
      { error: "Lenders fund from the desk, not this draw." },
      { status: 403 }
    );
  }
  const body = (await request.json()) as {
    to?: `0x${string}`;
    amountUsdc?: number;
    termDays?: number;
  };
  if (!body.to || !body.amountUsdc || body.amountUsdc <= 0) {
    return NextResponse.json({ error: "Invalid draw request" }, { status: 400 });
  }
  if (session.wallet !== body.to.toLowerCase()) {
    return NextResponse.json({ error: "Wallet mismatch" }, { status: 403 });
  }
  const user = await getUserByEmail(session.email);
  const ceiling = usdtFromKes(bandForScore(user?.lastScore ?? 0).ceilingKes);
  if (ceiling <= 0 || body.amountUsdc > ceiling + 0.01) {
    return NextResponse.json(
      { error: "That amount is above what your profile allows." },
      { status: 403 }
    );
  }
  if (
    await hasOpenLoan({
      email: session.email,
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
    const repaid = await hasRepaidLoan({
      email: session.email,
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
      borrowerEmail: session.email,
    });
    await fetch(`${apiOrigin()}/api/loans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet: body.to,
        amount_usdc: body.amountUsdc,
        email: session.email,
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
