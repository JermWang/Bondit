"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    setValue(searchParams.get("q") ?? "");
  }, [searchParams]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams(searchParams.toString());
    const nextValue = value.trim();

    if (nextValue) {
      params.set("q", nextValue);
    } else {
      params.delete("q");
    }

    const query = params.toString();
    const href = query ? `/?${query}` : "/";

    if (pathname === "/" && href === "/") {
      router.replace(href);
      return;
    }

    router.push(href);
  }

  return (
    <form onSubmit={handleSubmit} className="relative flex-1 max-w-[480px]">
      <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4E5168]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search launches or tickers"
        className="glass-input w-full pl-10 pr-16 py-2.5 text-[13px]"
      />
      <button
        type="submit"
        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1"
        aria-label="Search launches"
      >
        <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-[#4E5168] bg-white/[0.05] rounded border border-white/[0.08]">⌘</kbd>
        <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-[#4E5168] bg-white/[0.05] rounded border border-white/[0.08]">K</kbd>
      </button>
    </form>
  );
}
