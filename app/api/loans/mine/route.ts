import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getUserByEmail,
  hasOpenLoan,
  hasRepaidLoan,
  loansForAccount,
} from "@/lib/persist";
import { allowsLongTerm } from "@/lib/loan-terms";

export async function GET() {
  const session = await getSession();
  if (!session.signedIn && !session.email && !session.wallet) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }
  const user = session.email ? await getUserByEmail(session.email) : null;
  const loans = await loansForAccount({
    email: session.email,
    wallet: session.wallet ?? user?.wallet,
  });
  const open = await hasOpenLoan({
    email: session.email,
    wallet: session.wallet ?? user?.wallet,
  });
  const repaid = await hasRepaidLoan({
    email: session.email,
    wallet: session.wallet ?? user?.wallet,
  });
  const score = user?.lastScore ?? 0;
  return NextResponse.json({
    loans,
    hasOpenLoan: open,
    hasRepaidLoan: repaid,
    allowsLongTerm: allowsLongTerm(score, repaid),
    lastScore: score,
  });
}
