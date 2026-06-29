import type { ReactNode } from "react";
import Link from "next/link";

export default function OrganizationsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b h-14 flex items-center px-6">
        <Link href="/" className="font-semibold text-sm tracking-tight">
          Računovodstvo
        </Link>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10">{children}</main>
    </div>
  );
}
