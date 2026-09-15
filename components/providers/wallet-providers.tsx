import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { AppProviders } from "@/components/providers/app-providers";
import { wagmiConfig } from "@/lib/wagmi";
import "@rainbow-me/rainbowkit/styles.css";

export async function WalletProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const initialState = cookieToInitialState(
    wagmiConfig,
    headerList.get("cookie")
  );
  return <AppProviders initialState={initialState}>{children}</AppProviders>;
}
