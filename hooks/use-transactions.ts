"use client";

import { useEffect, useState } from "react";
import { blockchainService } from "@/services/blockchain";
import type { TransactionListResult } from "@/types";

export function useTransactions(enabled = true) {
  const [data, setData] = useState<TransactionListResult | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    let active = true;
    blockchainService.getTransactions().then((result) => {
      if (active) {
        setData(result);
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [enabled]);

  return { data, isLoading, source: blockchainService.source };
}
