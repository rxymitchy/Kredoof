export const APPLICANT_WALLET =
  "0x7A3d4e8f12b90c45a67e81d93c4f00aabbcc91F2" as const;

export const KES_PER_USDC = 129.4;

export const NETWORK_LABEL = "Avalanche" as const;

export const AVALANCHE_CHAIN_ID = 43114;

export const AVALANCHE_EXPLORER_TX = "https://snowtrace.io/tx";

export const USDC_AVALANCHE =
  "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E" as const;

export const USDT_AVALANCHE =
  "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7" as const;

export const DASHBOARD_NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/transactions", label: "Transactions" },
  { href: "/dashboard/activity", label: "Financial Activity" },
  { href: "/dashboard/risk", label: "Risk Analysis" },
  { href: "/dashboard/decision", label: "Credit Decision" },
  { href: "/dashboard/report", label: "Credit Report" },
] as const;
