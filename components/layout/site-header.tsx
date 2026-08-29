"use client";

import Link from "next/link";
import { AddressDisplay } from "@/components/kredoof/address-display";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import { useAccount } from "wagmi";
import { avalanche } from "wagmi/chains";
import { shortenAddress } from "@/lib/format";

export function SiteHeader() {
  const { address, isConnected, chainId } = useAccount();
  const connectedOnAvalanche = isConnected && chainId === avalanche.id;

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background/90 px-6 backdrop-blur">
      <Link href="/" className="text-sm font-semibold tracking-[0.22em]">
        KREDOOF
      </Link>
      <div className="flex items-center gap-4">
        {connectedOnAvalanche && address ? (
          <div className="hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-400">
              Connected
            </span>
            <AddressDisplay address={shortenAddress(address)} />
            <span className="rounded-md border border-border px-2 py-1">
              Avalanche
            </span>
          </div>
        ) : null}
        <ConnectWalletButton />
      </div>
    </header>
  );
}
