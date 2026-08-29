export type TokenAsset = "USDC" | "USDT";

export type VerificationStatus = "verified" | "unverified";

export type TransactionDirection = "in" | "out";

export interface OnChainTransaction {
  id: string;
  hash: `0x${string}`;
  timestamp: string;
  from: `0x${string}`;
  to: `0x${string}`;
  asset: TokenAsset;
  amount: number;
  direction: TransactionDirection;
  network: "Avalanche";
  verificationStatus: VerificationStatus;
}

export interface TransactionListResult {
  items: OnChainTransaction[];
  totalCount: number;
  source: "mock";
}
