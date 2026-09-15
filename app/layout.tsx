import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tool Compass AI｜编辑部工具图鉴",
  description: "按真实任务发现值得使用的 AI 工具",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
