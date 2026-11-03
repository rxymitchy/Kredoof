import type { Metadata } from "next";
import { IBM_Plex_Mono, Outfit, Spectral } from "next/font/google";
import { SessionKeepAlive } from "@/components/session-keep-alive";
import "./globals.css";

const sans = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

const serif = Spectral({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kredoof — Got the proof? Get the credit.",
  description:
    "Show the money that already moved in your wallet. Get a simple credit result, or lend to a business that qualified.",
  icons: {
    icon: "/brand/kredoof-logo.png",
    apple: "/brand/kredoof-logo.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${serif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <SessionKeepAlive />
        {children}
      </body>
    </html>
  );
}
