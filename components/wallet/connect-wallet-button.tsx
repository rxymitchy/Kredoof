"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ConnectWalletButton({
  className,
}: {
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        aria-hidden
        className={cn(
          "h-11 w-full rounded-full bg-mint-deep/40",
          className
        )}
      />
    );
  }

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        mounted: ready,
        openAccountModal,
        openChainModal,
        openConnectModal,
      }) => {
        const connected = ready && account && chain;
        return (
          <button
            type="button"
            onClick={
              !connected
                ? openConnectModal
                : chain.unsupported
                  ? openChainModal
                  : openAccountModal
            }
            className={cn(
              "inline-flex w-full items-center justify-center rounded-full bg-mint-deep px-4 py-3 text-sm font-medium text-white",
              className
            )}
          >
            {!connected
              ? "Connect Avalanche wallet"
              : chain.unsupported
                ? "Switch to Avalanche"
                : account.displayName}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
