"use client";

import { useEffect, useState } from "react";
import { blockchainService } from "@/services/blockchain";
import type { WalletSummary } from "@/types";

export function useWalletSummary() {
  const [data, setData] = useState<WalletSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    blockchainService.getWalletSummary().then((summary) => {
      if (active) {
        setData(summary);
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return { data, isLoading, source: blockchainService.source };
}
