import type { Connector, CreateConnectorFn } from "wagmi";
import { injected } from "wagmi/connectors";

export const DISPLAY_WALLETS = [
  "MetaMask",
  "Core",
  "Trust Wallet",
] as const;

export type DisplayWallet = (typeof DISPLAY_WALLETS)[number];

/** Trust Wallet on WalletConnect Cloud so the QR opens Trust, not a generic list. */
export const TRUST_WALLETCONNECT_ID =
  "4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0";

export function coreWalletConnector(): CreateConnectorFn {
  return injected({
    shimDisconnect: true,
    target() {
      return {
        id: "coreWallet",
        name: "Core",
        provider(window) {
          if (!window) return undefined;
          const view = window as Window & {
            avalanche?: EthereumProvider;
            ethereum?: EthereumProvider;
          };
          if (view.avalanche) return view.avalanche;
          const ethereum = view.ethereum;
          if (!ethereum) return undefined;
          if (ethereum.isAvalanche) return ethereum;
          return ethereum.providers?.find(
            (item: EthereumProvider) => item.isAvalanche
          );
        },
      };
    },
  });
}

export function trustWalletConnector(): CreateConnectorFn {
  return injected({
    shimDisconnect: true,
    target() {
      return {
        id: "trustWallet",
        name: "Trust Wallet",
        provider(window) {
          if (!window) return undefined;
          const view = window as Window & {
            ethereum?: EthereumProvider;
            trustwallet?: EthereumProvider;
          };
          if (view.trustwallet) return view.trustwallet;
          const ethereum = view.ethereum;
          if (!ethereum) return undefined;
          if (ethereum.isTrust || ethereum.isTrustWallet) return ethereum;
          return ethereum.providers?.find(
            (item: EthereumProvider) => item.isTrust || item.isTrustWallet
          );
        },
      };
    },
  });
}

export function walletChoiceLabel(id: string, name: string): DisplayWallet | "" {
  const key = `${id} ${name}`.toLowerCase();
  if (key.includes("metamask")) return "MetaMask";
  if (id === "app.core" || id === "coreWallet" || name === "Core") return "Core";
  if (key.includes("core") && !key.includes("coreum")) return "Core";
  if (key.includes("trust")) return "Trust Wallet";
  if (key.includes("walletconnect") || key.includes("reown")) {
    return "Trust Wallet";
  }
  if (id === "injected" || name.toLowerCase() === "injected") return "";
  return "";
}

export function activeConnectorId(connector: unknown): string | null {
  if (
    connector &&
    typeof connector === "object" &&
    "id" in connector &&
    typeof (connector as { id: unknown }).id === "string"
  ) {
    return (connector as { id: string }).id;
  }
  return null;
}

export function listedWallets(connectors: readonly Connector[]) {
  return DISPLAY_WALLETS.map((label) => {
    const matches = connectors.filter(
      (item) => walletChoiceLabel(item.id, item.name) === label
    );
    if (!matches.length) return null;
    const connector =
      label === "Trust Wallet"
        ? matches.find((item) => item.id === "trustWallet") ?? matches[0]
        : label === "Core"
          ? matches.find((item) => item.id === "coreWallet" || item.id === "app.core") ??
            matches[0]
        : matches[0];
    return { label, connector, matches };
  }).filter(
    (row): row is { label: DisplayWallet; connector: Connector; matches: Connector[] } =>
      Boolean(row)
  );
}

export async function connectDisplayWallet(
  label: DisplayWallet,
  matches: Connector[],
  connectAsync: (args: { connector: Connector }) => Promise<unknown>
) {
  const order =
    label === "Trust Wallet"
      ? [
          ...matches.filter((item) => item.id === "trustWallet"),
          ...matches.filter((item) => item.id !== "trustWallet"),
        ]
      : label === "Core"
        ? [
            ...matches.filter(
              (item) => item.id === "coreWallet" || item.id === "app.core"
            ),
            ...matches.filter(
              (item) => item.id !== "coreWallet" && item.id !== "app.core"
            ),
          ]
        : matches;
  let lastError: unknown;
  for (const connector of order) {
    try {
      await connectAsync({ connector });
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(
        label === "Trust Wallet"
          ? "Open Trust Wallet, or install it, then try again."
          : label === "Core"
            ? "Open Core, or install it from core.app, then try again."
            : `Could not connect ${label}.`
      );
}

type EthereumProvider = {
  isTrust?: boolean;
  isTrustWallet?: boolean;
  isAvalanche?: boolean;
  providers?: EthereumProvider[];
  request?: (...args: unknown[]) => Promise<unknown>;
};
