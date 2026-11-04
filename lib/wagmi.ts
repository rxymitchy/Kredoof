import { cookieStorage, createConfig, createStorage, http } from "wagmi";
import { avalanche } from "wagmi/chains";
import { metaMask, walletConnect } from "wagmi/connectors";
import {
  TRUST_WALLETCONNECT_ID,
  coreWalletConnector,
  trustWalletConnector,
} from "@/lib/wallets";

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ?? "";

const hasWalletConnectProjectId =
  /^[a-f0-9]{32}$/i.test(walletConnectProjectId) &&
  walletConnectProjectId !== "0".repeat(32);

export const wagmiConfig = createConfig({
  chains: [avalanche],
  connectors: [
    metaMask({
      dappMetadata: {
        name: "Kredoof",
        url: "https://kredoof.com",
      },
    }),
    coreWalletConnector(),
    trustWalletConnector(),
    ...(hasWalletConnectProjectId
      ? [
          walletConnect({
            projectId: walletConnectProjectId,
            showQrModal: true,
            qrModalOptions: {
              explorerRecommendedWalletIds: [TRUST_WALLETCONNECT_ID],
              explorerExcludedWalletIds: "ALL",
            },
            metadata: {
              name: "Kredoof",
              description: "See if your payments can support a loan.",
              url: "https://kredoof.com",
              icons: ["https://kredoof.com/brand/kredoof-logo.png"],
            },
          }),
        ]
      : []),
  ],
  transports: {
    [avalanche.id]: http(),
  },
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
});

export const walletConnectEnabled = hasWalletConnectProjectId;
