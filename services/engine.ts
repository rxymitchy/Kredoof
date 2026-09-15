import type {
  Applicant,
  ContinuousUnderwritingVision,
  CreditDecision,
  CreditReport,
  DataSource,
  FinancialProfile,
  PricingModel,
  RiskAnalysis,
  TransactionListResult,
  WalletSummary,
} from "@/types";

export interface EngineProfile {
  applicant: Applicant;
  financial: FinancialProfile;
  decision: CreditDecision;
  risk: RiskAnalysis;
  report: CreditReport;
  pricing: PricingModel;
  continuous: ContinuousUnderwritingVision;
  walletSummary: WalletSummary;
  transactions: TransactionListResult;
  source: DataSource;
}

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

let inflight: Promise<EngineProfile | null> | null = null;

export function apiBaseUrl(): string {
  return BASE;
}

export function loadEngineProfile(): Promise<EngineProfile | null> {
  if (!BASE) return Promise.resolve(null);
  if (!inflight) {
    inflight = fetch(`${BASE}/api/kredoof/profile`, {
      signal: AbortSignal.timeout(2500),
    })
      .then((res) => (res.ok ? (res.json() as Promise<EngineProfile>) : null))
      .catch(() => null);
  }
  return inflight;
}
