export type RiskLevel = "low" | "medium-low" | "medium" | "high";

export type FactorRating = "excellent" | "strong" | "good" | "low" | "medium";

export interface RiskFactor {
  id: string;
  label: string;
  rating: FactorRating;
}

export interface RiskAnalysis {
  overall: RiskLevel;
  overallLabel: string;
  factors: RiskFactor[];
  /** Prototype uses mock analysis. Replace with the underwriting engine. */
  source: "mock";
  disclaimer: string;
}
