import { WalletProviders } from "@/components/providers/wallet-providers";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WalletProviders>{children}</WalletProviders>;
}
