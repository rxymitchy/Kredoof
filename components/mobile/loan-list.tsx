"use client";

import { formatKesOfUsdc, formatPayBy, formatUsdt } from "@/lib/format";
import {
  DAILY_INTEREST_LABEL,
  LONG_TERM_DAYS,
  LONG_TERM_MIN_SCORE,
  SHORT_TERM_DAYS,
} from "@/lib/loan-terms";

export type DisplayLoan = {
  id: string;
  status: string;
  amount_usdc: number;
  repay_usdc?: number;
  interest_usdc?: number;
  net_usdc?: number;
  term_days?: number;
  due_at?: number | null;
  amount_due?: number;
  late_fee?: number;
  days_past_due?: number;
  borrowerName?: string | null;
};

function statusLabel(status: string) {
  const value = status.toLowerCase();
  if (value === "repaid") return "Paid";
  if (value === "drawn" || value === "disbursed" || value === "open") {
    return "Open";
  }
  return status;
}

function LoanCard({
  loan,
  side,
}: {
  loan: DisplayLoan;
  side: "borrower" | "lender";
}) {
  const term = loan.term_days || SHORT_TERM_DAYS;
  const due = formatPayBy(loan.due_at);
  const repay = loan.amount_due || loan.repay_usdc || loan.amount_usdc;
  const interest =
    loan.interest_usdc ??
    Math.max(0, (loan.repay_usdc ?? loan.amount_usdc) - loan.amount_usdc);
  const open = statusLabel(loan.status) === "Open";

  return (
    <div className="rounded-[1.5rem] border border-hairline bg-white px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {side === "lender"
              ? loan.borrowerName || "Funded loan"
              : "Loan received"}
          </p>
          <p className="mt-1 font-heading text-xl font-bold">
            {formatUsdt(loan.amount_usdc)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatKesOfUsdc(loan.amount_usdc)}
          </p>
        </div>
        <span className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          {statusLabel(loan.status)}
        </span>
      </div>
      <dl className="mt-4 grid gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Interest</dt>
          <dd>
            {DAILY_INTEREST_LABEL}
            {interest > 0 ? ` · ${formatUsdt(interest)}` : ""}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Term</dt>
          <dd>{term} days</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">
            {side === "lender" ? "They send back" : "Send back"}
          </dt>
          <dd>{formatUsdt(repay)}</dd>
        </div>
        {due ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Pay by</dt>
            <dd>{due}</dd>
          </div>
        ) : null}
      </dl>
      {open && (loan.days_past_due ?? 0) > 0 ? (
        <p className="mt-3 text-xs font-semibold text-[#C24545]">
          Past due
          {loan.late_fee && loan.late_fee > 0
            ? ` · late charge ${formatUsdt(loan.late_fee)}`
            : ""}
          .
        </p>
      ) : null}
    </div>
  );
}

export function BorrowerLoanSection({
  loans,
  allowsLongTerm,
}: {
  loans: DisplayLoan[];
  allowsLongTerm: boolean;
}) {
  return (
    <section>
      <h2 className="text-xl tracking-[-0.04em]">Loans you received</h2>
      <p className="mt-1 mb-3 text-sm text-muted-foreground">
        Interest is {DAILY_INTEREST_LABEL}. Pay back in {SHORT_TERM_DAYS} days,
        or {LONG_TERM_DAYS} days if your score is at least {LONG_TERM_MIN_SCORE}{" "}
        or you already repaid a loan.
        {allowsLongTerm
          ? " You can pick 30 days on a new loan."
          : " 30 days is locked until that trust is there."}
      </p>
      {loans.length === 0 ? (
        <p className="rounded-[1.5rem] border border-hairline bg-white px-5 py-6 text-sm text-muted-foreground">
          No loans yet. When a lender actually funds you, the amount and pay-by
          date show here.
        </p>
      ) : (
        <div className="grid gap-3">
          {loans.map((loan) => (
            <LoanCard key={loan.id} loan={loan} side="borrower" />
          ))}
        </div>
      )}
    </section>
  );
}

export function LenderLoanSection({ loans }: { loans: DisplayLoan[] }) {
  return (
    <section>
      <h2 className="text-xl tracking-[-0.04em]">Loans you funded</h2>
      <p className="mt-1 mb-3 text-sm text-muted-foreground">
        You earn {DAILY_INTEREST_LABEL}. Borrowers send USDT back in{" "}
        {SHORT_TERM_DAYS} days, or {LONG_TERM_DAYS} days if they have more
        trust (score {LONG_TERM_MIN_SCORE}+ or a repaid loan).
      </p>
      {loans.length === 0 ? (
        <p className="rounded-[1.5rem] border border-hairline bg-white px-5 py-6 text-sm text-muted-foreground">
          No funded loans yet. After you send USDT from a file, the loan,
          interest, and pay-by date show here.
        </p>
      ) : (
        <div className="grid gap-3">
          {loans.map((loan) => (
            <LoanCard key={loan.id} loan={loan} side="lender" />
          ))}
        </div>
      )}
    </section>
  );
}
