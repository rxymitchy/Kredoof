export type NetworkId = "avalanche";

export interface ConnectedWallet {
  address: `0x${string}`;
  network: NetworkId;
  networkLabel: "Avalanche";
  displayAddress: string;
}

export interface WalletSummary {
  wallet: ConnectedWallet;
  transactionCount: number;
  assets: string[];
  walletAgeMonths: number;
}
