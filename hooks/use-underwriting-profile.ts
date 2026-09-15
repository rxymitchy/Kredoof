"use client";

import { useEffect, useState } from "react";
import { underwritingService } from "@/services/underwriting";
import type {
  Applicant,
  CreditDecision,
  FinancialProfile,
  PricingModel,
  RiskAnalysis,
} from "@/types";

export function useUnderwritingProfile(enabled = true) {
  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [financial, setFinancial] = useState<FinancialProfile | null>(null);
  const [decision, setDecision] = useState<CreditDecision | null>(null);
  const [risk, setRisk] = useState<RiskAnalysis | null>(null);
  const [pricing, setPricing] = useState<PricingModel | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    let active = true;
    Promise.all([
      underwritingService.getApplicant(),
      underwritingService.getFinancialProfile(),
      underwritingService.getCreditDecision(),
      underwritingService.getRiskAnalysis(),
      underwritingService.getPricing(),
    ]).then(([nextApplicant, nextFinancial, nextDecision, nextRisk, nextPricing]) => {
      if (!active) return;
      setApplicant(nextApplicant);
      setFinancial(nextFinancial);
      setDecision(nextDecision);
      setRisk(nextRisk);
      setPricing(nextPricing);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [enabled]);

  return {
    applicant,
    financial,
    decision,
    risk,
    pricing,
    isLoading,
    source: underwritingService.source,
  };
}
