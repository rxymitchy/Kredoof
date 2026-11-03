"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider, type State } from "wagmi";
import { TooltipProvider } from "@/components/ui/tooltip";
import { wagmiConfig } from "@/lib/wagmi";

export function AppProviders({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: State;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
