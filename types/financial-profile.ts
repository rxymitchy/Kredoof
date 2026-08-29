export interface MonthlyVolumePoint {
  month: string;
  volumeKsh: number;
}

export interface FlowPoint {
  month: string;
  inflowsKsh: number;
  outflowsKsh: number;
}

export interface FinancialProfile {
  totalTransactions: number;
  transactionVolumeKsh: number;
  transactionVolumeLabel: string;
  averageMonthlyVolumeKsh: number;
  activeCounterparties: number;
  onTimeRepaymentPercent: number;
  walletAgeMonths: number;
  monthlyVolume: MonthlyVolumePoint[];
  inflowsVsOutflows: FlowPoint[];
  source: "mock";
}
