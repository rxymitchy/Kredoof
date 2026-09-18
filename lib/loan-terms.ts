import { KES_PER_USDC } from "@/lib/constants";

/** Interest paid to the funder, not a Kredoof take. 0.0006 = 0.06% per day. */
export const DAILY_INTEREST_RATE = 0.0006;
export const DAILY_INTEREST_LABEL = "0.06% a day";
export const SHORT_TERM_DAYS = 16;
export const LONG_TERM_DAYS = 30;
/** 30-day term only if score is at least this, or they already repaid a loan. */
export const LONG_TERM_MIN_SCORE = 740;

/** Lender pays this for an exclusive qualified borrower file. Not taken from the borrower. */
export const LEAD_FEE_KES = 100;
/** @deprecated Use LEAD_FEE_KES. Kept so older records still read. */
export const APP_FEE_KES = LEAD_FEE_KES;
/** Taken from the funded loan amount when the lender actually sends money. */
export const ORIGINATION_RATE = 0.01;

/** No late fee for this many calendar days after the due date. */
export const GRACE_DAYS_AFTER_DUE = 5;
/** One-time late fee after grace, as a share of the scheduled repayment. */
export const LATE_FEE_ONCE_RATE = 0.01;
/** Extra late charge per full week after the first late fee. */
export const LATE_WEEKLY_RATE = 0.005;

/** USDC-style 6 decimal places. */
function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function leadFeeUsdc(): number {
  return round6(LEAD_FEE_KES / KES_PER_USDC);
}

export function appFeeUsdc(): number {
  return leadFeeUsdc();
}

export function originationFee(principal: number): number {
  return round6(principal * ORIGINATION_RATE);
}

/** What the borrower actually receives. They still repay the full principal + daily interest. */
export function netDisbursed(principal: number): number {
  return round6(Math.max(0.01, principal - originationFee(principal)));
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
  if (lateDays <= GRACE_DAYS_AFTER_DUE) return 0; // UI does not advertise this window.
  const daysAfterGrace = lateDays - GRACE_DAYS_AFTER_DUE;
  const once = scheduledRepay * LATE_FEE_ONCE_RATE;
  const extraWeeks = Math.floor(Math.max(0, daysAfterGrace - 1) / 7);
  const weekly = scheduledRepay * LATE_WEEKLY_RATE * extraWeeks;
  const fee = round6(once + weekly);
  return Math.min(fee, scheduledRepay); // never more than the scheduled repayment
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
