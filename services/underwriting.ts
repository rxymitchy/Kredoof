import {
  mockApplicant,
  mockContinuousUnderwriting,
  mockCreditDecision,
  mockCreditReport,
  mockFinancialProfile,
  mockPricing,
  mockRiskAnalysis,
} from "@/data";
import { loadEngineProfile } from "@/services/engine";
import type {
  Applicant,
  ContinuousUnderwritingVision,
  CreditDecision,
  CreditReport,
  DataSource,
  FinancialProfile,
  PricingModel,
  RiskAnalysis,
} from "@/types";

let source: DataSource = "mock";

/**
 * Underwriting API layer. Uses the Kredoof API when NEXT_PUBLIC_API_URL is set
 * and reachable; otherwise the local mock profile.
 */
export const underwritingService = {
  get source(): DataSource {
    return source;
  },

  async getApplicant(): Promise<Applicant> {
    const live = await loadEngineProfile();
    if (live) {
      source = "engine";
      return live.applicant;
    }
    return mockApplicant;
  },

  async getFinancialProfile(): Promise<FinancialProfile> {
    const live = await loadEngineProfile();
    if (live) {
      source = "engine";
      return live.financial;
    }
    return mockFinancialProfile;
  },

  async getRiskAnalysis(): Promise<RiskAnalysis> {
    const live = await loadEngineProfile();
    if (live) {
      source = "engine";
      return live.risk;
    }
    return mockRiskAnalysis;
  },

  async getCreditDecision(): Promise<CreditDecision> {
    const live = await loadEngineProfile();
    if (live) {
      source = "engine";
      return live.decision;
    }
    return mockCreditDecision;
  },

  async getCreditReport(): Promise<CreditReport> {
    const live = await loadEngineProfile();
    if (live) {
      source = "engine";
      return live.report;
    }
    return mockCreditReport;
  },

  async getContinuousUnderwritingVision(): Promise<ContinuousUnderwritingVision> {
    const live = await loadEngineProfile();
    if (live) {
      source = "engine";
      return live.continuous;
    }
    return mockContinuousUnderwriting;
  },

  async getPricing(): Promise<PricingModel> {
    const live = await loadEngineProfile();
    if (live) {
      source = "engine";
      return live.pricing;
    }
    return mockPricing;
  },
};
