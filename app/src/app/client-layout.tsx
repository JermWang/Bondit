"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AppWalletProvider } from "../components/wallet-provider";
import { WalletControls } from "../components/wallet-controls";
import { GlobalSearch } from "../components/global-search";
import { LaunchActionLink, SidebarNav } from "../components/shell-nav";
import { IntroModal } from "../components/intro-modal";

export function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
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
        {/* ── Mobile Sidebar Overlay ── */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* ── Sidebar ── */}
        <aside className={`sidebar ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 transition-transform duration-300 ease-out z-[70] fixed lg:sticky top-0 h-screen overflow-y-auto`}>
          <div className="flex items-center justify-between px-3 mb-3">
            <Link href="/" className="flex items-center group">
              <Image
                src="/logo-transparent.png"
                alt="BondIt.lol"
                width={160}
                height={44}
                className="object-contain transition-opacity duration-200 group-hover:opacity-90"
                priority
              />
            </Link>
            {/* Mobile close button */}
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 text-[#56566A] hover:text-[#F1F1F4] hover:bg-white/[0.06] rounded-lg transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div className="flex items-center justify-center gap-1 mb-6">
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

          <Link href="/launch" className="sidebar-cta mt-auto mb-4">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Launch Token
          </Link>
        </aside>

        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden w-full max-w-full lg:max-w-[calc(100vw-220px)]">
          <header className="glass-nav sticky top-0 z-50">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-[56px] gap-3 sm:gap-4">
                {/* Hamburger Menu (Mobile Only) */}
                <button 
                  onClick={() => setMobileMenuOpen(true)}
                  className="lg:hidden p-2 -ml-2 text-[#8B8FA3] hover:text-[#F1F1F4] transition-colors"
                  aria-label="Open menu"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M4 6h16M4 12h16M4 18h16"/>
                  </svg>
                </button>

                <Suspense fallback={<div className="flex-1 max-w-[480px]" />}>
                  <GlobalSearch />
                </Suspense>

                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <LaunchActionLink className="btn-wallet hidden sm:inline-flex" />
                  <WalletControls />
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 w-full overflow-x-hidden">{children}</main>
          <IntroModal />

          {/* Bottom glow accent */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#A9FF00]/20 to-transparent flex-shrink-0" />
        </div>
      </div>
    </AppWalletProvider>
  );
}
