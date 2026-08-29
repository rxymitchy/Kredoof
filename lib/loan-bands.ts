import type { LoanBand } from "@/types";

export const LOAN_BANDS: LoanBand[] = [
  {
    min: 300,
    max: 579,
    tier: "Not yet eligible",
    ceilingKes: 0,
    rate: "—",
    tone: "bad",
  },
  {
    min: 580,
    max: 669,
    tier: "Starter",
    ceilingKes: 50_000,
    rate: "18–22% p.a.",
    tone: "warn",
  },
  {
    min: 670,
    max: 739,
    tier: "Growth",
    ceilingKes: 250_000,
    rate: "15–18% p.a.",
    tone: "info",
  },
  {
    min: 740,
    max: 799,
    tier: "Established",
    ceilingKes: 750_000,
    rate: "12–15% p.a.",
    tone: "good",
  },
  {
    min: 800,
    max: 850,
    tier: "Prime",
    ceilingKes: 2_000_000,
    rate: "9–12% p.a.",
    tone: "prime",
  },
];

export function bandForScore(score: number): LoanBand {
  return LOAN_BANDS.find((band) => score >= band.min && score <= band.max) ?? LOAN_BANDS[0];
}
