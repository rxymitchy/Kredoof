/** Sample wallet used when someone opens the demo result without connecting. */
export const APPLICANT_WALLET =
  "0x7A3d4e8f12b90c45a67e81d93c4f00aabbcc91F2" as const;

/** Display rate only. Not a live FX feed. */
export const KES_PER_USDC = 129.4;

export const NETWORK_LABEL = "Avalanche" as const;

export const AVALANCHE_CHAIN_ID = 43114;

export const AVALANCHE_EXPLORER_TX = "https://snowtrace.io/tx";

export const USDC_AVALANCHE =
  "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E" as const;

export const USDT_AVALANCHE =
  "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7" as const;

/** Public treasury address. The private key lives only in env, never in this file. */
export const KREDOOF_TREASURY =
  (process.env.NEXT_PUBLIC_TREASURY_ADDRESS as `0x${string}` | undefined) ??
  "0xF48AFA3d8443752630B6BB9cFEA5fA68199402f7";

export const DASHBOARD_NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/transactions", label: "Payments" },
  { href: "/dashboard/activity", label: "How money moves" },
  { href: "/dashboard/risk", label: "Warning signs" },
  { href: "/dashboard/decision", label: "Loan result" },
  { href: "/dashboard/report", label: "Documents" },
] as const;
