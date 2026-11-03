import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getUserByEmail,
  hasOpenLoan,
  hasRepaidLoan,
  loansForAccount,
} from "@/lib/persist";
import { allowsLongTerm, amountDueNow, daysPastDue, isOpenLoanStatus, lateFeeOn } from "@/lib/loan-terms";

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
  const loansWithDue = loans.map((loan) => {
    const scheduled = loan.repay_usdc ?? loan.amount_usdc;
    const interest = Math.max(0, scheduled - loan.amount_usdc);
    const extras = {
      interest_usdc: interest,
      term_days: loan.term_days,
    };
    if (!isOpenLoanStatus(loan.status)) {
      return { ...loan, ...extras };
    }
    return {
      ...loan,
      ...extras,
      late_fee: lateFeeOn(scheduled, loan.due_at),
      amount_due: amountDueNow(scheduled, loan.due_at),
      days_past_due: daysPastDue(loan.due_at),
    };
  });
  const openLoan = loansWithDue.find((loan) => isOpenLoanStatus(loan.status));
  return NextResponse.json({
    loans: loansWithDue,
    hasOpenLoan: open,
    hasRepaidLoan: repaid,
    allowsLongTerm: allowsLongTerm(score, repaid),
    lastScore: score,
    openLoan: openLoan ?? null,
  });
}
