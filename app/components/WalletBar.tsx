"use client";

import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { Check, WalletCards } from "lucide-react";

const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (module) => module.BaseWalletMultiButton
    ),
  { ssr: false }
);

const walletLabels = {
  "change-wallet": "Đổi ví",
  connecting: "Đang kết nối…",
  "copy-address": "Sao chép địa chỉ",
  copied: "Đã sao chép",
  disconnect: "Ngắt kết nối",
  "has-wallet": "Kết nối ví",
  "no-wallet": "Kết nối ví",
} as const;

export default function WalletBar() {
  const { connected, publicKey } = useWallet();
  return (
    <div className="wallet-control" aria-label="Ví Solana Devnet">
      {connected && publicKey ? (
        <span className="wallet-connected-label">
          <Check size={14} aria-hidden="true" />
          <span>Đã kết nối</span>
        </span>
      ) : (
        <span className="wallet-prompt"><WalletCards size={15} aria-hidden="true" /> Ví chưa kết nối</span>
      )}
      <WalletMultiButton
        labels={walletLabels}
        className="wallet-button"
      />
    </div>
  );
}
