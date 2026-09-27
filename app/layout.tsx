import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "悦享月子中心 · 护理计划与家属探访平台",
  description: "产妇护理计划、家属探访与费用协同平台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
