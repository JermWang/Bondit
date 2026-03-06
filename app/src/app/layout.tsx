import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import { GlobalSearch } from "@/components/global-search";
import { LaunchActionLink, SidebarNav } from "@/components/shell-nav";
import { WalletControls } from "@/components/wallet-controls";
import { CopyContractButton } from "@/components/copy-contract";
import { AppWalletProvider } from "@/components/wallet-provider";
import { IntroModal } from "@/components/intro-modal";

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
    shortcut: "/favicon-48.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    url: "https://bondit.lol",
    title: "BondIt.lol — Agency-Based Token Launches",
    description: "Launch tokens with deterministic Agency stewardship on Solana. Immutable charters, 99/1 fee splits, on-chain transparency.",
    siteName: "BondIt.lol",
    images: [
      {
        url: "/bondit-banner.png",
        width: 1200,
        height: 630,
        alt: "BondIt.lol — Agency-Based Token Launches on Solana",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@bonditlol",
    creator: "@bonditlol",
    title: "BondIt.lol — Agency-Based Token Launches",
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
        <AppWalletProvider>
          {/* Aura background system */}
          <div className="aura-bg" aria-hidden="true">
            <div className="aura-1" />
            <div className="aura-2" />
            <div className="aura-3" />
            <div className="aura-4" />
            <div className="aura-5" />
            <div className="aura-6" />
          </div>

          <div className="relative z-10 flex min-h-screen">
            {/* ── Sidebar ── */}
            <aside className="sidebar">
              <Link href="/" className="flex items-center px-3 mb-3 group">
                <Image
                  src="/logo-transparent.png"
                  alt="BondIt.lol"
                  width={160}
                  height={44}
                  className="object-contain transition-opacity duration-200 group-hover:opacity-90"
                  priority
                />
              </Link>

              <div className="flex items-center justify-center gap-1 mb-6">
                <CopyContractButton />
                <a
                  href="https://x.com/bondit_lol"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-[30px] h-[30px] rounded-lg transition-all duration-300 hover:bg-[#A9FF00]/10 hover:shadow-[0_0_12px_rgba(169,255,0,0.2)]"
                  title="Follow us on X"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#A9FF00">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </div>

              <SidebarNav />

              <Link href="/launch" className="sidebar-cta">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Launch Token
              </Link>
            </aside>

            {/* ── Main content ── */}
            <div className="flex-1 ml-[220px] flex flex-col min-h-screen overflow-x-hidden" style={{ maxWidth: "calc(100vw - 220px)" }}>
              <header className="glass-nav sticky top-0 z-50">
                <div className="px-6 lg:px-8">
                  <div className="flex items-center justify-between h-[56px] gap-4">
                    <Suspense fallback={<div className="flex-1 max-w-[480px]" />}>
                      <GlobalSearch />
                    </Suspense>

                    <div className="flex items-center gap-3">
                      <LaunchActionLink className="btn-wallet hidden sm:inline-flex" />
                      <WalletControls />
                    </div>
                  </div>
                </div>
              </header>

              <main className="flex-1">{children}</main>
              <IntroModal />

              {/* Bottom glow accent */}
              <div className="h-px bg-gradient-to-r from-transparent via-[#A9FF00]/20 to-transparent" />
            </div>
          </div>
        </AppWalletProvider>
      </body>
    </html>
  );
}
