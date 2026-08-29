import type { FactorRating, RiskLevel } from "./risk";

export type CreditStatus = "established" | "prime" | "building";

export interface ScoreFactor {
  id: string;
  label: string;
  weightPercent: number;
  scoreOutOf100: number;
}

export type LoanBandTone = "bad" | "warn" | "info" | "good" | "prime";

export interface LoanBand {
  min: number;
  max: number;
  tier: string;
  ceilingKes: number;
  rate: string;
  tone: LoanBandTone;
}

export interface DecisionRationale {
  label: string;
  rating: FactorRating;
}

export interface CreditDecision {
  score: number;
  scoreMax: number;
  status: CreditStatus;
  statusLabel: string;
  risk: RiskLevel;
  riskLabel: string;
  recommendedLimitKsh: number;
  recommendedLimitLabel: string;
  rationale: DecisionRationale[];
  methodology: ScoreFactor[];
  source: "mock";
}

export interface ContinuousUnderwritingVision {
  currentStatus: string;
  currentLimitLabel: string;
  nextMilestoneStatus: string;
  nextMilestoneLimitLabel: string;
  isVisionPreview: true;
}

export interface CreditReport {
  title: "KREDOOF CREDIT REPORT";
  applicantName: string;
  sector: string;
  location: string;
  walletDisplay: string;
  network: "Avalanche";
  score: number;
  scoreMax: number;
  riskLabel: string;
  recommendedLimitLabel: string;
  basis: string;
  disclaimer: string;
  source: "mock";
}

export interface PricingModel {
  assessmentFeeRangeKsh: string;
  successFeePercent: number;
}
