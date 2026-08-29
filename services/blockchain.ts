import { mockApplicant, mockTransactions } from "@/data";
import { explorerTxUrl } from "@/lib/format";
import { shortenAddress } from "@/lib/format";
import type {
  OnChainTransaction,
  TransactionListResult,
  WalletSummary,
} from "@/types";

const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Blockchain access layer. Currently backed by mock Avalanche transfers.
 * Swap the implementations here (not in UI components) for live RPC/indexer data.
 */
export const blockchainService = {
  source: "mock" as const,

  async getWalletSummary(address?: string): Promise<WalletSummary> {
    await delay();
    const resolved = (address ?? mockApplicant.walletAddress) as `0x${string}`;
    return {
      wallet: {
        address: resolved,
        network: "avalanche",
        networkLabel: "Avalanche",
        displayAddress: shortenAddress(resolved),
      },
      transactionCount: 2430,
      assets: ["USDC", "USDT"],
      walletAgeMonths: 19,
    };
  },

  async getTransactions(): Promise<TransactionListResult> {
    await delay();
    return {
      items: mockTransactions,
      totalCount: 2430,
      source: "mock",
    };
  },

  async getTransactionById(
    id: string
  ): Promise<OnChainTransaction | undefined> {
    await delay();
    return mockTransactions.find((tx) => tx.id === id || tx.hash === id);
  },

  getExplorerUrl(hash: string): string {
    return explorerTxUrl(hash);
  },
};
