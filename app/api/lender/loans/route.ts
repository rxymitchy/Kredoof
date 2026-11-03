import { NextResponse } from "next/server";
import { requireLender } from "@/lib/lender-auth";
import { loansForLender } from "@/lib/persist";
import {
  amountDueNow,
  daysPastDue,
  interestAmount,
  isOpenLoanStatus,
  lateFeeOn,
  DAILY_INTEREST_RATE,
  SHORT_TERM_DAYS,
} from "@/lib/loan-terms";

export async function GET() {
  const gate = await requireLender();
  if (gate.error) return gate.error;
  const rows = await loansForLender(gate.email!);
  const loans = rows.map((loan) => {
    const term = loan.term_days || SHORT_TERM_DAYS;
    const principal = loan.amount_usdc;
    const scheduled = loan.repay_usdc ?? principal;
    const open = isOpenLoanStatus(loan.status);
    return {
      id: loan.id,
      status: loan.status,
      borrowerName: loan.borrowerName ?? null,
      amount_usdc: principal,
      repay_usdc: scheduled,
      interest_usdc: loan.repay_usdc
        ? Math.max(0, scheduled - principal)
        : interestAmount(principal, term),
      term_days: term,
      daily_rate: loan.daily_rate ?? DAILY_INTEREST_RATE,
      due_at: loan.due_at ?? null,
      late_fee: open ? lateFeeOn(scheduled, loan.due_at) : 0,
      amount_due: open ? amountDueNow(scheduled, loan.due_at) : scheduled,
      days_past_due: open ? daysPastDue(loan.due_at) : 0,
    };
  });
  return NextResponse.json({ loans });
}
