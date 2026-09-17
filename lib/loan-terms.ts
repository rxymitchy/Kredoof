export const DAILY_INTEREST_RATE = 0.0006;
export const DAILY_INTEREST_LABEL = "0.06% a day";
export const SHORT_TERM_DAYS = 16;
export const LONG_TERM_DAYS = 30;
export const LONG_TERM_MIN_SCORE = 740;

export function repaymentDue(principal: number, days: number): number {
  return (
    Math.round(principal * (1 + DAILY_INTEREST_RATE * days) * 1_000_000) /
    1_000_000
  );
}

export function interestAmount(principal: number, days: number): number {
  return (
    Math.round((repaymentDue(principal, days) - principal) * 1_000_000) /
    1_000_000
  );
}

export function allowsLongTerm(score: number, hasRepaidLoan: boolean): boolean {
  return score >= LONG_TERM_MIN_SCORE || hasRepaidLoan;
}

export function isOpenLoanStatus(status: string | undefined): boolean {
  const value = (status ?? "").toLowerCase();
  return value === "drawn" || value === "disbursed" || value === "open";
}
