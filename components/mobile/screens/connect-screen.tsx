"use client";

import { CheckCircle2, Loader2, Wallet } from "lucide-react";
import { useMemo } from "react";
import { useAccount, useConnect, useConnectors } from "wagmi";
import { PhoneShell } from "@/components/mobile/phone-shell";
import { PrimaryButton } from "@/components/mobile/ui";
import { shortenAddress } from "@/lib/format";
import { walletConnectEnabled } from "@/lib/wagmi";

const WANTED = [
  { match: "metamask", label: "MetaMask" },
  { match: "coinbase", label: "Coinbase Wallet" },
  { match: "walletconnect", label: "WalletConnect" },
  { match: "rabby", label: "Rabby Wallet" },
];

export function ConnectScreen({ onContinue }: { onContinue: () => void }) {
  const { address, isConnected, connector } = useAccount();
  const connectors = useConnectors();
  const { connect, isPending, variables } = useConnect();

  const buttons = useMemo(() => {
    return WANTED.map((wanted) => {
      const found = connectors.find((c) =>
        c.name.toLowerCase().includes(wanted.match)
      );
      return { ...wanted, connector: found };
    });
  }, [connectors]);

  return (
    <PhoneShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">
          Link your financial history
        </h1>
        <p className="mt-3 mb-8 max-w-xl text-base leading-7 text-muted-foreground">
          Connect an Avalanche-ready wallet so Kredoof can read verified on-chain
          activity — no statements or documents required.
        </p>

        <div className="mb-6 rounded-3xl border border-hairline bg-white p-6 sm:p-8">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-mint">
            <Wallet size={17} className="text-mint-deep" />
          </div>
          <div>
            <div className="font-heading text-sm font-bold">Connect wallet</div>
            <div className="text-[11.5px] text-muted-foreground">
              MetaMask, Coinbase, Rabby, WalletConnect
            </div>
          </div>
        </div>

        {isConnected && address ? (
          <>
            <div className="flex items-center justify-between rounded-xl bg-[#FAFBF9] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-mint-deep" />
                <div>
                  <div className="text-xs font-semibold">
                    {connector?.name ?? "Connected"}
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {shortenAddress(address)}
                  </span>
                </div>
              </div>
              <span className="rounded-lg bg-[#DFF0FB] px-2 py-0.5 text-[10.5px] text-muted-foreground">
                Avalanche
              </span>
            </div>
            <div className="mt-3 rounded-xl bg-[#FAFBF9] px-3 py-3">
              <div className="font-heading text-[13px] font-bold">
                Let&apos;s see what your wallet says.
              </div>
              <p className="mt-1 text-[11.5px] leading-5 text-muted-foreground">
                Kredoof will review on-chain activity to understand financial
                behavior. This demo uses a mock Avalanche ledger for Jua Kali
                Leather Works until live indexing is connected.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  Transactions{" "}
                  <span className="font-semibold text-foreground">2,430</span>
                </div>
                <div>
                  Assets{" "}
                  <span className="font-semibold text-foreground">
                    USDC / USDT
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {buttons.map((item) => {
              const pending = Boolean(
                isPending &&
                  item.connector &&
                  variables?.connector &&
                  "id" in variables.connector &&
                  variables.connector.id === item.connector.id
              );
              const wcBlocked =
                item.match === "walletconnect" && !walletConnectEnabled;
              return (
                <button
                  key={item.label}
                  type="button"
                  disabled={isPending || !item.connector || wcBlocked}
                  onClick={() => {
                    if (item.connector) connect({ connector: item.connector });
                  }}
                  className="font-heading flex items-center justify-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-4 text-sm font-semibold disabled:opacity-60"
                >
                  {pending ? (
                    <Loader2 size={13} className="animate-spin text-mint-deep" />
                  ) : (
                    <Wallet size={13} className="text-mint-deep" />
                  )}
                  {pending
                    ? "Connecting…"
                    : wcBlocked
                      ? "WalletConnect"
                      : item.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p className="mb-6 text-sm leading-6 text-muted-foreground">
        No bank statements, M-Pesa statements, or business documents. The
        core Kredoof experience starts from the wallet. Ledger data in this
        demo is a mock Avalanche sample until live indexing is connected.
      </p>

      <PrimaryButton onClick={onContinue} disabled={!isConnected} className="sm:w-auto sm:px-8">
        {isConnected
          ? "Analyze my wallet"
          : "Connect a wallet to continue"}
      </PrimaryButton>
      <button
        type="button"
        onClick={onContinue}
        className="mt-4 block text-sm text-muted-foreground"
      >
        Preview with sample Avalanche ledger
      </button>
      </div>
    </PhoneShell>
  );
}
