import type { Metadata } from "next";
import {
  IBM_Plex_Mono,
  Inter,
  Plus_Jakarta_Sans,
  Spectral,
} from "next/font/google";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { AppProviders } from "@/components/providers/app-providers";
import { wagmiConfig } from "@/lib/wagmi";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";

const heading = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const serif = Spectral({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Kredoof — Got the proof? Get the credit.",
  description:
    "Turn verified blockchain transaction history into a credit profile lenders can understand.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const headerList = await headers();
  const initialState = cookieToInitialState(
    wagmiConfig,
    headerList.get("cookie")
  );

  return (
    <html
      lang="en"
      className={`${heading.variable} ${sans.variable} ${mono.variable} ${serif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AppProviders initialState={initialState}>{children}</AppProviders>
      </body>
    </html>
  );
}
