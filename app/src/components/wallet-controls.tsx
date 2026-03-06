"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

function shortenAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function WalletControls() {
  const { connected, publicKey } = useWallet();

  return (
    <div className="flex items-center gap-3">
      {connected && publicKey ? (
        <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[12px] text-[#8B8FA3]">
          <span className="w-2 h-2 rounded-full bg-[#00FFB2] shadow-[0_0_6px_rgba(0,255,178,0.4)]" />
          <span className="font-mono">{shortenAddress(publicKey.toBase58())}</span>
        </div>
      ) : null}
      <WalletMultiButton className="bondit-wallet-button" />
    </div>
  );
}
