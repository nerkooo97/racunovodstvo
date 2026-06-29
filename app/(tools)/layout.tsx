import type { ReactNode } from "react";
import Link from "next/link";

export default function ToolsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-semibold text-sm">
            Računovodstvo
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Link href="/preracun-plate" className="hover:text-foreground">Preračun plate</Link>
            <Link href="/pdv-kalkulator" className="hover:text-foreground">PDV kalkulator</Link>
            <Link href="/amortizacija" className="hover:text-foreground">Amortizacija</Link>
            <Link href="/ams" className="hover:text-foreground">AMS</Link>
            <Link href="/ugovor-o-djelu" className="hover:text-foreground">Ugovor o djelu</Link>
            <Link href="/ugovor-o-radu" className="hover:text-foreground">Ugovor o radu</Link>
            <Link href="/ugovor-o-pozajmici" className="hover:text-foreground">Pozajmica</Link>
            <Link href="/spr" className="hover:text-foreground">SPR-1053</Link>
            <Link href="/gpd" className="hover:text-foreground">GPD-1051</Link>
            <Link href="/zo3" className="hover:text-foreground">ZO-3</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
