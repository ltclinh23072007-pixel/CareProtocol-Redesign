import type { Metadata } from "next";
import "./globals.css";
import WalletContextProvider from "./providers/WalletContextProvider";

export const metadata: Metadata = {
  title: "CareProtocol — Phục hồi hậu phẫu",
  description:
    "Prototype theo dõi bài tập phục hồi hậu phẫu bằng MediaPipe trên trình duyệt và tùy chọn ghi nhận phiên trên Solana Devnet.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <WalletContextProvider>{children}</WalletContextProvider>
      </body>
    </html>
  );
}
