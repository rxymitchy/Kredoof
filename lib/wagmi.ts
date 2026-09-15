import { cookieStorage, createConfig, createStorage, http } from "wagmi";
import { avalanche } from "wagmi/chains";
import { coinbaseWallet, metaMask, walletConnect } from "wagmi/connectors";

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
        url: "https://kredoof.vercel.app",
      },
    }),
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
              url: "https://kredoof.vercel.app",
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
