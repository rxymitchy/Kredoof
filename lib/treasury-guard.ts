import { isAddress, getAddress } from "viem";
import { KREDOOF_TREASURY } from "@/lib/constants";

const ZERO = "0x0000000000000000000000000000000000000000";
const spentByDay = new Map<string, number>();

function maxPerSend(): number {
  const raw = Number(process.env.TREASURY_MAX_USDT);
  return Number.isFinite(raw) && raw > 0 ? raw : 20_000;
}

function maxPerDay(): number {
  const raw = Number(process.env.TREASURY_DAILY_USDT);
  return Number.isFinite(raw) && raw > 0 ? raw : 80_000;
}

export function treasuryPaused(): boolean {
  const flag = process.env.TREASURY_PAUSED?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

export function assertSafeDisbursement(to: string, amountUsdt: number): `0x${string}` {
  if (treasuryPaused()) {
    throw new Error("Treasury is paused. No USDT will be sent.");
  }
  if (!Number.isFinite(amountUsdt) || amountUsdt <= 0) {
    throw new Error("Invalid amount");
  }
  if (amountUsdt > maxPerSend()) {
    throw new Error("That amount is above the treasury send limit.");
  }
  if (!isAddress(to)) {
    throw new Error("That wallet address is not valid.");
  }
  const checksum = getAddress(to);
  const lower = checksum.toLowerCase();
  if (lower === ZERO) {
    throw new Error("Cannot send to the zero address.");
  }
  if (isAddress(KREDOOF_TREASURY) && lower === KREDOOF_TREASURY.toLowerCase()) {
    throw new Error("Treasury cannot send to itself.");
  }
  const day = new Date().toISOString().slice(0, 10);
  const used = spentByDay.get(day) ?? 0;
  if (used + amountUsdt > maxPerDay()) {
    throw new Error("Treasury daily send limit reached.");
  }
  spentByDay.set(day, used + amountUsdt);
  return checksum;
}

export function undoTreasurySpend(amountUsdt: number): void {
  const day = new Date().toISOString().slice(0, 10);
  const used = spentByDay.get(day) ?? 0;
  spentByDay.set(day, Math.max(0, used - amountUsdt));
}
