import { WalletProviders } from "@/components/providers/wallet-providers";

export default function LendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WalletProviders>{children}</WalletProviders>;
}
