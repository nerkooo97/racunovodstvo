"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import OrgSwitcher from "./org-switcher";
import {
  IconDashboard,
  IconBuildingBank,
  IconMail,
  IconArrowsLeftRight,
  IconFileInvoice,
  IconUsers,
  IconBook,
  IconReceiptTax,
  IconForms,
  IconUserCheck,
  IconCalendarTime,
  IconWallet,
  IconCreditCard,
  IconSettings,
  IconCalculator,
  type Icon,
} from "@tabler/icons-react";

interface NavItem {
  title: string;
  url: string;
  icon: Icon;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    items: [
      { title: "Početna",   url: "/dashboard",  icon: IconDashboard },
    ],
  },
  {
    title: "Finansije",
    items: [
      { title: "Bankovni izvodi", url: "/bankovni-izvodi", icon: IconBuildingBank },
      { title: "Inbox",           url: "/inbox",           icon: IconMail },
      { title: "Transakcije",     url: "/transakcije",     icon: IconArrowsLeftRight },
      { title: "Fakture",         url: "/fakture",         icon: IconFileInvoice },
      { title: "Partneri",        url: "/partneri",        icon: IconUsers },
    ],
  },
  {
    title: "Evidencije",
    items: [
      { title: "KPR-1041",       url: "/kpr",     icon: IconBook },
      { title: "PDV evidencije", url: "/pdv",     icon: IconReceiptTax },
      { title: "Obrasci",        url: "/obrasci", icon: IconForms },
    ],
  },
  {
    title: "Zaposlenici",
    items: [
      { title: "Zaposlenici",    url: "/zaposlenici",    icon: IconUserCheck },
      { title: "Šihterica",      url: "/sihterica",      icon: IconCalendarTime },
      { title: "Obračuni plata", url: "/obracuni-plata", icon: IconWallet },
    ],
  },
  {
    title: "Račun",
    items: [
      { title: "Pretplata",      url: "/pretplata", icon: IconCreditCard },
      { title: "Postavke obrta", url: "/postavke",  icon: IconSettings },
    ],
  },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r bg-background min-h-full py-4 flex flex-col">
      {/* Logo + OrgSwitcher */}
      <div className="px-3 mb-4 space-y-3">
        <div className="flex items-center gap-2.5 px-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary shrink-0">
            <IconCalculator className="size-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm tracking-tight">Računovodstvo</span>
        </div>
        <OrgSwitcher />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 flex flex-col gap-4 overflow-y-auto">
        {NAV.map((section, idx) => (
          <div key={idx}>
            {section.title && (
              <p className="text-[10px] font-semibold text-muted-foreground/60 px-2 mb-1 tracking-widest uppercase">
                {section.title}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.url ||
                  (item.url !== "/dashboard" && pathname.startsWith(item.url + "/"));
                return (
                  <Link
                    key={item.url}
                    href={item.url}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "size-4 shrink-0",
                        isActive ? "text-primary-foreground" : "text-muted-foreground"
                      )}
                    />
                    <span className="truncate">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-2 pt-3 mt-2 border-t">
        <a
          href="https://poreznikalkulator.ba"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md hover:bg-accent transition-colors"
        >
          <span>Porezni kalkulator</span>
          <span className="ml-auto text-muted-foreground/50">↗</span>
        </a>
      </div>
    </aside>
  );
}
