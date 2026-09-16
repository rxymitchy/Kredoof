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
    { label: "How often you get paid", rating: "strong" },
    { label: "Steady money in and out", rating: "strong" },
    { label: "Paying back on time", rating: "excellent" },
    { label: "Different people you pay", rating: "good" },
    { label: "Warning signs", rating: "low" },
  ],
  methodology: [
    {
      id: "wallet-age",
      label: "How long you have used this wallet",
      weightPercent: 15,
      scoreOutOf100: 79,
    },
    {
      id: "volume",
      label: "How often money moves",
      weightPercent: 25,
      scoreOutOf100: 88,
    },
    {
      id: "cash-flow",
      label: "Steady money in and out",
      weightPercent: 20,
      scoreOutOf100: 84,
    },
    {
      id: "repayment",
      label: "Paying back on time",
      weightPercent: 20,
      scoreOutOf100: 100,
    },
    {
      id: "counterparties",
      label: "Different people you pay",
      weightPercent: 10,
      scoreOutOf100: 72,
    },
    {
      id: "risk-activity",
      label: "Returned or disputed payments",
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
    { id: "cash-flow", label: "Steady money in and out", rating: "strong" },
    { id: "repayment", label: "Paying back on time", rating: "excellent" },
    { id: "diversity", label: "Different people you pay", rating: "good" },
    { id: "concentration", label: "Too much money from one place", rating: "low" },
    { id: "suspicious", label: "Unusual payments", rating: "low" },
    { id: "circular", label: "Money sent in a circle", rating: "low" },
  ],
  source: "mock",
  disclaimer:
    "These indicators are mock results for the prototype. They do not represent live fraud detection.",
};

export const mockCreditReport: CreditReport = {
  title: "YOUR KREDOOF SUMMARY",
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
    "This summary is based on payments we could see in your wallet.",
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
