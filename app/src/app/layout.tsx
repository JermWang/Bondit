import type { Metadata } from "next";
import { ClientLayout } from "./client-layout";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://bondit.lol"),
  title: "BondIt.lol — Agency-Based Token Launches",
  description: "Transparent Bundler v2 — Agency-Based Genesis + Liquidity Stewardship on Solana",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "BondIt.lol — Transparent Token Launchpad",
    description: "Launch tokens with deterministic Agency stewardship on Solana. Immutable charters, 99/1 fee splits, on-chain transparency.",
    images: ["/bondit-banner.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "BondIt.lol — Transparent Token Launchpad",
    description: "Launch tokens with deterministic Agency stewardship on Solana. Immutable charters, 99/1 fee splits, on-chain transparency.",
    images: ["/bondit-banner.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0A0A0F]">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
