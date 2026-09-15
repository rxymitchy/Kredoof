import { WalletProviders } from "@/components/providers/wallet-providers";

export default function OnboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WalletProviders>{children}</WalletProviders>;
}
