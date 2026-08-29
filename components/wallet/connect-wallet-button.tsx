"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";

export function ConnectWalletButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        aria-hidden
        className="h-9 w-[152px] rounded-md border border-border bg-muted/40"
      />
    );
  }

  return <ConnectButton chainStatus="icon" showBalance={false} />;
}
