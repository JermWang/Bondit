"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Home", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" },
  { href: "/live", label: "Live", icon: "M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" },
  { href: "/support", label: "Support", icon: "M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" },
  { href: "/chat", label: "Chat", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  { href: "/referral", label: "Referrals", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
  { href: "/terminal", label: "Terminal", icon: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
] as const;

type MoreItem = { label: string; icon: string; href?: string; action?: string };

const MORE_ITEMS: MoreItem[] = [
  {
    label: "CLI Tools",
    icon: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    href: "/cli",
  },
  {
    label: "Replay Intro",
    icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    action: "replay-intro",
  },
  {
    label: "Docs",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    href: "/more",
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  function handleAuxItem(item: MoreItem) {
    if ("action" in item && item.action === "replay-intro") {
      window.dispatchEvent(new Event("bondit:replay-intro"));
    }
  }

  return (
    <nav className="flex flex-col gap-1 flex-1">
      {NAV_LINKS.map((link) => {
        const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`sidebar-link ${active ? "sidebar-link-active" : ""}`}
          >
            <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d={link.icon} />
            </svg>
            <span>{link.label}</span>
          </Link>
        );
      })}

      {MORE_ITEMS.map((item) => {
        const active = !!item.href && (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)));

        if (item.href) {
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => handleAuxItem(item)}
              className={`sidebar-link ${active ? "sidebar-link-active" : ""}`}
            >
              <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              <span>{item.label}</span>
            </Link>
          );
        }

        return (
          <button
            key={item.label}
            onClick={() => handleAuxItem(item)}
            className="sidebar-link w-full"
          >
            <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d={item.icon} />
            </svg>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function LaunchActionLink({ className }: { className: string }) {
  const pathname = usePathname();
  const active = pathname.startsWith("/launch");

  return (
    <Link href="/launch" className={`${className} ${active ? "btn-wallet-active" : ""}`.trim()}>
      Create coin
    </Link>
  );
}
