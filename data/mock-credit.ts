import type {
  ContinuousUnderwritingVision,
  CreditDecision,
  CreditReport,
  PricingModel,
  RiskAnalysis,
} from "@/types";
import { mockApplicant } from "./mock-applicant";

export const mockCreditDecision: CreditDecision = {
  score: 742,
  scoreMax: 850,
  status: "established",
  statusLabel: "Established",
  risk: "medium-low",
  riskLabel: "Medium-Low",
  recommendedLimitKsh: 750_000,
  recommendedLimitLabel: "KSh 750,000",
  rationale: [
    { label: "Transaction Activity", rating: "strong" },
    { label: "Cash Flow Consistency", rating: "strong" },
    { label: "Repayment History", rating: "excellent" },
    { label: "Counterparty Diversity", rating: "good" },
    { label: "Risk Indicators", rating: "low" },
  ],
  methodology: [
    {
      id: "wallet-age",
      label: "Wallet age & continuity",
      weightPercent: 15,
      scoreOutOf100: 79,
    },
    {
      id: "volume",
      label: "Transaction volume & frequency",
      weightPercent: 25,
      scoreOutOf100: 88,
    },
    {
      id: "cash-flow",
      label: "Cash-flow consistency",
      weightPercent: 20,
      scoreOutOf100: 84,
    },
    {
      id: "repayment",
      label: "On-chain repayment history",
      weightPercent: 20,
      scoreOutOf100: 100,
    },
    {
      id: "counterparties",
      label: "Counterparty diversity",
      weightPercent: 10,
      scoreOutOf100: 72,
    },
    {
      id: "risk-activity",
      label: "Dispute / reversal / risk activity",
      weightPercent: 10,
      scoreOutOf100: 94,
    },
  ],
  source: "mock",
};

export const mockRiskAnalysis: RiskAnalysis = {
  overall: "medium-low",
  overallLabel: "Medium-Low",
  factors: [
    { id: "cash-flow", label: "Cash Flow Consistency", rating: "strong" },
    { id: "repayment", label: "Repayment History", rating: "excellent" },
    { id: "diversity", label: "Counterparty Diversity", rating: "good" },
    { id: "concentration", label: "Transaction Concentration", rating: "low" },
    { id: "suspicious", label: "Suspicious Activity", rating: "low" },
    { id: "circular", label: "Circular Transaction Risk", rating: "low" },
  ],
  source: "mock",
  disclaimer:
    "These indicators are mock results for the prototype. They do not represent live fraud detection.",
};

export const mockCreditReport: CreditReport = {
  title: "KREDOOF CREDIT REPORT",
  applicantName: mockApplicant.name,
  sector: mockApplicant.sector,
  location: mockApplicant.location,
  walletDisplay: "0x7A3...91F2",
  network: "Avalanche",
  score: 742,
  scoreMax: 850,
  riskLabel: "Medium-Low",
  recommendedLimitLabel: "KSh 750,000",
  basis:
    "This decision is based on verified on-chain transaction activity analyzed by Kredoof.",
  disclaimer:
    "Kredoof provides credit decision support. Final KYC, lending approval and disbursement remain the responsibility of the lender.",
  source: "mock",
};

export const mockContinuousUnderwriting: ContinuousUnderwritingVision = {
  currentStatus: "Established",
  currentLimitLabel: "KSh 750,000",
  nextMilestoneStatus: "Prime",
  nextMilestoneLimitLabel: "KSh 2,000,000",
  isVisionPreview: true,
};

export const mockPricing: PricingModel = {
  assessmentFeeRangeKsh: "KSh 50–150",
  successFeePercent: 1,
};
