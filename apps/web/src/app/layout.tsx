import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";

const notoSans = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "Gemini 2.5 Pro搭載 建設AIセカンドオピニオン",
  description:
    "見積もりと図面に潜むコストと安全リスクを可視化するAI診断サービス。契約前の不安を専門家とAIの二段構えで解決します。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${notoSans.className} antialiased`}>{children}</body>
    </html>
  );
}
