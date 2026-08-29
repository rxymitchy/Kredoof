import {
  mockApplicant,
  mockContinuousUnderwriting,
  mockCreditDecision,
  mockCreditReport,
  mockFinancialProfile,
  mockPricing,
  mockRiskAnalysis,
} from "@/data";
import type {
  Applicant,
  ContinuousUnderwritingVision,
  CreditDecision,
  CreditReport,
  FinancialProfile,
  PricingModel,
  RiskAnalysis,
} from "@/types";

const delay = (ms = 160) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Underwriting API layer. Mock until the credit engine is available.
 * Keep all scoring/risk calls here so the dashboard can stay presentation-only.
 */
export const underwritingService = {
  source: "mock" as const,

  async getApplicant(): Promise<Applicant> {
    await delay();
    return mockApplicant;
  },

  async getFinancialProfile(): Promise<FinancialProfile> {
    await delay();
    return mockFinancialProfile;
  },

  async getRiskAnalysis(): Promise<RiskAnalysis> {
    await delay();
    return mockRiskAnalysis;
  },

  async getCreditDecision(): Promise<CreditDecision> {
    await delay();
    return mockCreditDecision;
  },

  async getCreditReport(): Promise<CreditReport> {
    await delay();
    return mockCreditReport;
  },

  async getContinuousUnderwritingVision(): Promise<ContinuousUnderwritingVision> {
    await delay();
    return mockContinuousUnderwriting;
  },

  async getPricing(): Promise<PricingModel> {
    await delay();
    return mockPricing;
  },
};
