import { KES_PER_USDC } from "@/lib/constants";

export const DAILY_INTEREST_RATE = 0.0006;
export const DAILY_INTEREST_LABEL = "0.06% a day";
export const SHORT_TERM_DAYS = 16;
export const LONG_TERM_DAYS = 30;
export const LONG_TERM_MIN_SCORE = 740;

/** Taken from the borrower when money is sent, not to check a score. */
export const APP_FEE_KES = 100;
export const ORIGINATION_RATE = 0.01;

/** No late fee for this many calendar days after the due date. */
export const GRACE_DAYS_AFTER_DUE = 5;
/** One-time late fee after grace, as a share of the scheduled repayment. */
export const LATE_FEE_ONCE_RATE = 0.01;
/** Extra late charge per full week after the first late fee. */
export const LATE_WEEKLY_RATE = 0.005;

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function appFeeUsdc(): number {
  return round6(APP_FEE_KES / KES_PER_USDC);
}

export function originationFee(principal: number): number {
  return round6(principal * ORIGINATION_RATE);
}

export function netDisbursed(principal: number): number {
  return round6(
    Math.max(0.01, principal - originationFee(principal) - appFeeUsdc())
  );
}

export function repaymentDue(principal: number, days: number): number {
  return round6(principal * (1 + DAILY_INTEREST_RATE * days));
}

export function interestAmount(principal: number, days: number): number {
  return round6(repaymentDue(principal, days) - principal);
}

export function daysPastDue(dueAt: number | undefined, now = Date.now()): number {
  if (!dueAt) return 0;
  return Math.max(0, Math.floor((now - dueAt) / (24 * 60 * 60 * 1000)));
}

export function lateFeeOn(scheduledRepay: number, dueAt?: number, now = Date.now()): number {
  const lateDays = daysPastDue(dueAt, now);
  if (lateDays <= GRACE_DAYS_AFTER_DUE) return 0;
  const daysAfterGrace = lateDays - GRACE_DAYS_AFTER_DUE;
  const once = scheduledRepay * LATE_FEE_ONCE_RATE;
  const extraWeeks = Math.floor(Math.max(0, daysAfterGrace - 1) / 7);
  const weekly = scheduledRepay * LATE_WEEKLY_RATE * extraWeeks;
  const fee = round6(once + weekly);
  return Math.min(fee, scheduledRepay);
}

export function amountDueNow(scheduledRepay: number, dueAt?: number, now = Date.now()): number {
  return round6(scheduledRepay + lateFeeOn(scheduledRepay, dueAt, now));
}

export function allowsLongTerm(score: number, hasRepaidLoan: boolean): boolean {
  return score >= LONG_TERM_MIN_SCORE || hasRepaidLoan;
}

export function isOpenLoanStatus(status: string | undefined): boolean {
  const value = (status ?? "").toLowerCase();
  return value === "drawn" || value === "disbursed" || value === "open";
}
