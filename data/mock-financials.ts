import type { FinancialProfile } from "@/types";

export const mockFinancialProfile: FinancialProfile = {
  totalTransactions: 2430,
  transactionVolumeKsh: 6_100_000,
  transactionVolumeLabel: "KSh 6.1M equivalent",
  averageMonthlyVolumeKsh: 508_000,
  activeCounterparties: 84,
  onTimeRepaymentPercent: 100,
  walletAgeMonths: 19,
  monthlyVolume: [
    { month: "Sep", volumeKsh: 420_000 },
    { month: "Oct", volumeKsh: 465_000 },
    { month: "Nov", volumeKsh: 490_000 },
    { month: "Dec", volumeKsh: 510_000 },
    { month: "Jan", volumeKsh: 495_000 },
    { month: "Feb", volumeKsh: 530_000 },
    { month: "Mar", volumeKsh: 545_000 },
    { month: "Apr", volumeKsh: 520_000 },
    { month: "May", volumeKsh: 555_000 },
    { month: "Jun", volumeKsh: 540_000 },
    { month: "Jul", volumeKsh: 560_000 },
    { month: "Aug", volumeKsh: 470_000 },
  ],
  inflowsVsOutflows: [
    { month: "Mar", inflowsKsh: 310_000, outflowsKsh: 235_000 },
    { month: "Apr", inflowsKsh: 290_000, outflowsKsh: 230_000 },
    { month: "May", inflowsKsh: 325_000, outflowsKsh: 230_000 },
    { month: "Jun", inflowsKsh: 318_000, outflowsKsh: 222_000 },
    { month: "Jul", inflowsKsh: 340_000, outflowsKsh: 220_000 },
    { month: "Aug", inflowsKsh: 280_000, outflowsKsh: 190_000 },
  ],
  source: "mock",
};
