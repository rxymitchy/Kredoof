import { cookieStorage, createConfig, createStorage, http } from "wagmi";
import { avalanche } from "wagmi/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ?? "";

const hasWalletConnectProjectId =
  /^[a-f0-9]{32}$/i.test(walletConnectProjectId) &&
  walletConnectProjectId !== "0".repeat(32);

/**
 * Injected wallets (MetaMask, Rabby, others) work without WalletConnect Cloud.
 * WalletConnect is only registered when a real Reown project ID is provided,
 * so local demo does not call cloud.reown.com with a placeholder ID.
 */
export const wagmiConfig = createConfig({
  chains: [avalanche],
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({
      appName: "Kredoof",
      preference: "all",
    }),
    ...(hasWalletConnectProjectId
      ? [
          walletConnect({
            projectId: walletConnectProjectId,
            showQrModal: true,
            metadata: {
              name: "Kredoof",
              description:
                "Credit underwriting from verified on-chain transaction activity.",
              url: "http://localhost:3000",
              icons: [],
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
