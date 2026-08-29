import { AVALANCHE_EXPLORER_TX, KES_PER_USDC } from "./constants";

export function shortenAddress(address: string, chars = 3): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 2 + chars)}...${address.slice(-chars)}`;
}

export function shortenHash(hash: string): string {
  if (hash.length < 12) return hash;
  return `${hash.slice(0, 5)}...${hash.slice(-3)}`;
}

export function formatKsh(amount: number): string {
  return `KES ${new Intl.NumberFormat("en-KE").format(amount)}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-KE").format(value);
}

export function formatUsdc(amount: number): string {
  return `${amount.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USDC`;
}

export function formatKesOfUsdc(usdc: number): string {
  return `≈ KES ${Math.round(usdc * KES_PER_USDC).toLocaleString("en-KE")}`;
}

export function formatTokenAmount(amount: number, asset: string): string {
  const sign = amount > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(amount)} ${asset}`;
}

export function formatIsoDate(iso: string): string {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatDayMonth(iso: string): string {
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
  }).format(new Date(iso));
}

export function formatDateLong(iso?: string): string {
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(iso ? new Date(iso) : new Date("2026-08-29"));
}

export function explorerTxUrl(hash: string): string {
  return `${AVALANCHE_EXPLORER_TX}/${hash}`;
}

export function usdcFromKes(kes: number): number {
  return Math.round((kes / KES_PER_USDC) * 100) / 100;
}
