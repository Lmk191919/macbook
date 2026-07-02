import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "知底装修报价",
  description: "Renovation quotation workspace",
};

type AppShellProps = Readonly<{ children: ReactNode }>;

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="focus-ring site-brand" href="/">
          知底装修报价
        </Link>
      </header>
      {children}
    </div>
  );
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
