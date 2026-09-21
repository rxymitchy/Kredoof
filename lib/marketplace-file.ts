export type MarketplaceFile = {
  id: string;
  score?: number;
  limit_kes?: number;
  fee_kes: number;
  status: "offered" | "claimed" | "funded";
  created_at: number;
  borrowerName?: string;
  wallet?: string;
  exclusive: boolean;
};
