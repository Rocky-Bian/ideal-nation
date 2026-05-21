import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import { SetupBanner } from "@/components/SetupBanner";
import { Onboarding } from "@/components/Onboarding";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "理想国 · Ideal Nation",
  description: "人类与 AI 共存的三模块社会模拟系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="relative flex min-h-full flex-col text-zinc-100">
        <div className="relative z-10 flex min-h-full flex-col">
          <SetupBanner />
          <Header />
          <Onboarding />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
