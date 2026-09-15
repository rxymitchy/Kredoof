import { mockApplicant, mockTransactions } from "@/data";
import { explorerTxUrl, shortenAddress } from "@/lib/format";
import { loadEngineProfile } from "@/services/engine";
import type {
  DataSource,
  OnChainTransaction,
  TransactionListResult,
  WalletSummary,
} from "@/types";

let source: DataSource = "mock";

/**
 * Blockchain access layer. Uses the Kredoof API demo ledger when it is up;
 * otherwise the static Jua Kali sample transfers.
 */
export const blockchainService = {
  get source(): DataSource {
    return source;
  },

  async getWalletSummary(address?: string): Promise<WalletSummary> {
    const live = await loadEngineProfile();
    if (live) {
      source = "engine";
      if (address) {
        const resolved = address as `0x${string}`;
        return {
          ...live.walletSummary,
          wallet: {
            ...live.walletSummary.wallet,
            address: resolved,
            displayAddress: shortenAddress(resolved),
          },
        };
      }
      return live.walletSummary;
    }
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
    const live = await loadEngineProfile();
    if (live) {
      source = "engine";
      return live.transactions;
    }
    return {
      items: mockTransactions,
      totalCount: 2430,
      source: "mock",
    };
  },

  async getTransactionById(
    id: string
  ): Promise<OnChainTransaction | undefined> {
    const list = await this.getTransactions();
    return list.items.find((tx) => tx.id === id || tx.hash === id);
  },

  getExplorerUrl(hash: string): string {
    return explorerTxUrl(hash);
  },
};
