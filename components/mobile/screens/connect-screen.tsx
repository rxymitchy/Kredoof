"use client";

import { CheckCircle2, Loader2, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import {
  useAccount,
  useChainId,
  useConnect,
  useConnectors,
  useSignMessage,
  useSwitchChain,
} from "wagmi";
import { avalanche } from "wagmi/chains";
import { PhoneShell } from "@/components/mobile/phone-shell";
import { PrimaryButton } from "@/components/mobile/ui";
import { AVALANCHE_CHAIN_ID } from "@/lib/constants";
import { shortenAddress } from "@/lib/format";

export function ConnectScreen({
  onContinue,
  onDemo,
  onSignOut,
}: {
  onContinue: () => void;
  onDemo: () => void;
  onSignOut?: () => void;
}) {
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const connectors = useConnectors();
  const { connect, isPending, variables } = useConnect();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const onAvalanche = chainId === AVALANCHE_CHAIN_ID;

  const buttons = useMemo(() => {
    const seen = new Set<string>();
    return connectors.filter((item) => {
      const key = item.id.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [connectors]);

  const names = buttons.map((item) => item.name).join(", ");

  return (
    <PhoneShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">
          Connect wallet
        </h1>
        <p className="mt-3 mb-8 max-w-xl text-base leading-7 text-muted-foreground">
          Use an Avalanche C-Chain wallet, then sign a message so we can score
          your USDC/USDT history.
        </p>

        <div className="mb-6 rounded-3xl border border-hairline bg-white p-6 sm:p-8">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-mint">
              <Wallet size={17} className="text-mint-deep" />
            </div>
            <div>
              <div className="font-heading text-sm font-bold">Avalanche wallet</div>
              <div className="text-[11.5px] text-muted-foreground">
                {names || "Choose a wallet"}
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
                <span className="rounded-lg bg-mint px-2 py-0.5 text-[10.5px] text-accent-foreground">
                  {onAvalanche ? "Avalanche" : `Chain ${chainId}`}
                </span>
              </div>
              {!onAvalanche ? (
                <button
                  type="button"
                  onClick={() => switchChain({ chainId: avalanche.id })}
                  className="font-heading mt-3 w-full rounded-xl border border-hairline py-3 text-sm font-bold"
                >
                  {isSwitching ? "Switching…" : "Switch to Avalanche"}
                </button>
              ) : (
                <p className="mt-3 text-[11.5px] leading-5 text-muted-foreground">
                  Sign to confirm you own this address. Kredoof then reads
                  Avalanche USDC/USDT transfers and scores them.
                </p>
              )}
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {buttons.map((item) => {
                const pending = Boolean(
                  isPending &&
                    variables?.connector &&
                    "id" in variables.connector &&
                    variables.connector.id === item.id
                );
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isPending}
                    onClick={() => connect({ connector: item })}
                    className="font-heading flex items-center justify-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-4 text-sm font-semibold disabled:opacity-60"
                  >
                    {pending ? (
                      <Loader2 size={13} className="animate-spin text-mint-deep" />
                    ) : (
                      <Wallet size={13} className="text-mint-deep" />
                    )}
                    {pending ? "Connecting…" : item.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error ? <p className="mb-3 text-sm text-[#C24545]">{error}</p> : null}

        <PrimaryButton
          onClick={async () => {
            if (!address) return;
            if (!onAvalanche) {
              setError("Switch to Avalanche C-Chain first");
              return;
            }
            setError(null);
            try {
              const nonceRes = await fetch("/api/auth/nonce");
              const { nonce } = await nonceRes.json();
              const message = [
                "Kredoof wants you to sign in with your Avalanche account:",
                address,
                "",
                `Nonce: ${nonce}`,
              ].join("\n");
              const signature = await signMessageAsync({ message });
              const verify = await fetch("/api/auth/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address, signature }),
              });
              if (!verify.ok) {
                setError("Signature did not verify");
                return;
              }
              setSigned(true);
              onContinue();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Sign-in failed");
            }
          }}
          disabled={!isConnected || isSigning || !onAvalanche}
          className="sm:w-auto sm:px-8"
        >
          {isSigning
            ? "Check your wallet…"
            : isConnected
              ? signed
                ? "Analyze my wallet"
                : "Sign and analyze my wallet"
              : "Connect a wallet to continue"}
        </PrimaryButton>

        <button
          type="button"
          onClick={() => setShowHelp((open) => !open)}
          className="mt-5 block text-sm font-semibold text-mint-deep"
        >
          {showHelp ? "Hide wallet guide" : "Don’t have a wallet?"}
        </button>
        {showHelp ? (
          <div className="mt-3 overflow-hidden rounded-2xl border border-hairline bg-white">
            <div className="aspect-video w-full bg-black">
              <iframe
                title="Getting started with MetaMask"
                src="https://www.youtube.com/embed/GNPz-Dv5BjM"
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p className="px-4 py-3 text-xs leading-5 text-muted-foreground">
              Install MetaMask from metamask.io, then add Avalanche C-Chain
              (network 43114) before you connect here.
            </p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onDemo}
          className="mt-4 block text-sm text-muted-foreground"
        >
          Preview with sample Avalanche ledger
        </button>
        {onSignOut ? (
          <button
            type="button"
            onClick={onSignOut}
            className="mt-4 block text-sm text-muted-foreground"
          >
            Sign out
          </button>
        ) : null}
      </div>
    </PhoneShell>
  );
}
