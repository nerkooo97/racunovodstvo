"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import OrgSwitcher from "./org-switcher";
import {
  LayoutDashboard,
  Landmark,
  Mail,
  ArrowLeftRight,
  FileText,
  Users2,
  BookOpen,
  ClipboardList,
  FormInput,
  UserCheck,
  CalendarClock,
  Wallet,
  CreditCard,
  Settings,
  type LucideIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "Početna", icon: LayoutDashboard },
    ],
  },
  {
    title: "Finansije",
    items: [
      { href: "/bankovni-izvodi", label: "Bankovni izvodi", icon: Landmark },
      { href: "/inbox",           label: "Inbox",           icon: Mail },
      { href: "/transakcije",     label: "Transakcije",     icon: ArrowLeftRight },
      { href: "/fakture",         label: "Fakture",         icon: FileText },
      { href: "/partneri",        label: "Partneri",        icon: Users2 },
    ],
  },
  {
    title: "Evidencije",
    items: [
      { href: "/kpr",     label: "KPR-1041",      icon: BookOpen },
      { href: "/pdv",     label: "PDV evidencije", icon: ClipboardList },
      { href: "/obrasci", label: "Obrasci",        icon: FormInput },
    ],
  },
  {
    title: "Zaposlenici",
    items: [
      { href: "/zaposlenici",     label: "Zaposlenici",    icon: UserCheck },
      { href: "/sihterica",       label: "Šihterica",      icon: CalendarClock },
      { href: "/obracuni-plata",  label: "Obračuni plata", icon: Wallet },
    ],
  },
  {
    title: "Račun",
    items: [
      { href: "/pretplata", label: "Pretplata",      icon: CreditCard },
      { href: "/postavke",  label: "Postavke obrta", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="w-56 shrink-0 border-r bg-background/95 min-h-full py-3 flex flex-col">
        <div className="px-3 mb-3">
          <OrgSwitcher />
        </div>

        <nav className="flex-1 px-2 flex flex-col gap-4 overflow-y-auto">
          {NAV.map((section, idx) => (
            <div key={idx}>
              {section.title && (
                <p className="text-[10px] font-semibold text-muted-foreground/70 px-2 mb-1 tracking-widest uppercase">
                  {section.title}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")) ||
                    (item.href !== "/dashboard" && pathname === item.href);
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}
                        >
                          <item.icon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              isActive ? "text-primary-foreground" : "text-muted-foreground"
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
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
            <span className="ml-auto">↗</span>
          </a>
        </div>
      </aside>
    </TooltipProvider>
  );
}
