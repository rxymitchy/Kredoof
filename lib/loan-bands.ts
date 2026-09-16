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
    rate: "About 18–22% a year",
    tone: "warn",
  },
  {
    min: 670,
    max: 739,
    tier: "Growth",
    ceilingKes: 250_000,
    rate: "About 15–18% a year",
    tone: "info",
  },
  {
    min: 740,
    max: 799,
    tier: "Established",
    ceilingKes: 750_000,
    rate: "About 12–15% a year",
    tone: "good",
  },
  {
    min: 800,
    max: 850,
    tier: "Prime",
    ceilingKes: 2_000_000,
    rate: "About 9–12% a year",
    tone: "prime",
  },
];

export function bandForScore(score: number): LoanBand {
  return LOAN_BANDS.find((band) => score >= band.min && score <= band.max) ?? LOAN_BANDS[0];
}
