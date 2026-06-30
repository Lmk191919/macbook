import Link from "next/link";
import type { ReactNode } from "react";

export default function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="app-workspace">
      <header className="app-topbar">
        <div>
          <p className="app-topbar__eyebrow">知底装修报价</p>
          <h1>团队工作台</h1>
        </div>
        <nav className="app-nav" aria-label="主导航">
          <Link className="focus-ring" href="/quotes">
            报价记录
          </Link>
          <Link className="focus-ring" href="/catalog">
            项目库
          </Link>
        </nav>
      </header>
      <div className="app-workspace__content">{children}</div>
    </div>
  );
}
