import type { Icon } from "@tabler/icons-react";
import {
  IconDashboard,
  IconBuildingBank,
  IconMail,
  IconArrowsLeftRight,
  IconFileInvoice,
  IconFileImport,
  IconUsers,
  IconBook,
  IconReceiptTax,
  IconForms,
  IconUserCheck,
  IconCalendarTime,
  IconWallet,
  IconCreditCard,
  IconSettings,
  IconFolder,
  IconReportAnalytics,
  IconPackage,
  IconLayoutList,
  IconAddressBook,
  IconCalendarStats,
  IconCalculator,
} from "@tabler/icons-react";
import {
  getSettingsNavLabel,
  hasFeature,
  normalizeOrgType,
  type OrgFeature,
  type OrgType,
} from "./regime";

export interface NavItemConfig {
  title: string;
  url: string;
  icon: Icon;
  feature?: OrgFeature;
  /** Dinamički naslov (npr. Postavke obrta vs Postavke) */
  dynamicTitle?: (type: OrgType) => string;
}

export interface NavSectionConfig {
  title?: string;
  /** Označava kojoj vrsti organizacije sekcija pripada — za vizualni prikaz u sidebaru */
  orgType?: "obrt" | "doo";
  items: NavItemConfig[];
}

export const NAV_SECTIONS: NavSectionConfig[] = [
  // ─── Zajedničke sekcije ─────────────────────────────────────────────────────
  {
    items: [{ title: "Početna", url: "/dashboard", icon: IconDashboard }],
  },
  {
    title: "Finansije",
    items: [
      { title: "Bankovni izvodi", url: "/bankovni-izvodi", icon: IconBuildingBank },
      { title: "Inbox", url: "/inbox", icon: IconMail },
      { title: "Transakcije", url: "/transakcije", icon: IconArrowsLeftRight },
      { title: "Fakture", url: "/fakture", icon: IconFileInvoice },
      {
        title: "Primljene fakture",
        url: "/primljene-fakture",
        icon: IconFileImport,
        feature: "received_invoices",
      },
      { title: "Partneri", url: "/partneri", icon: IconUsers },
    ],
  },
  {
    title: "Dokumenti",
    items: [
      { title: "Evidencija dokumenata", url: "/dokumenti", icon: IconFolder },
    ],
  },
  {
    title: "Evidencije",
    items: [
      { title: "Računovodstvo", url: "/racunovodstvo", icon: IconReportAnalytics },
      { title: "PDV evidencije", url: "/pdv", icon: IconReceiptTax },
      { title: "Dugotrajna imovina", url: "/dugotrajnaimovina", icon: IconPackage, feature: "fixed_assets" },
      { title: "EPO-1044", url: "/epo", icon: IconArrowsLeftRight, feature: "received_invoices" },
      { title: "Obrasci", url: "/obrasci", icon: IconForms },
    ],
  },

  // ─── Obrt — specifične evidencije (vidljive samo za obrt) ────────────────────
  {
    title: "Obrt — Knjige",
    orgType: "obrt",
    items: [
      { title: "KPR-1041", url: "/kpr", icon: IconBook, feature: "kpr" },
      { title: "KP-1042", url: "/kp", icon: IconLayoutList, feature: "kp" },
    ],
  },

  // ─── DOO — Glavna knjiga (vidljiva samo za d.o.o.) ──────────────────────────
  {
    title: "Glavna knjiga",
    orgType: "doo",
    items: [
      { title: "Kontni plan", url: "/knjigovodstvo/kontni-plan", icon: IconBook, feature: "general_ledger" },
      { title: "Dnevnik", url: "/knjigovodstvo/dnevnik", icon: IconFileInvoice, feature: "general_ledger" },
      { title: "Bruto bilans", url: "/knjigovodstvo/bruto-bilans", icon: IconReportAnalytics, feature: "general_ledger" },
      { title: "Saldakonti", url: "/saldakonti", icon: IconAddressBook, feature: "general_ledger" },
      { title: "Finansijski izvještaji", url: "/knjigovodstvo/finansijski-izvjestaji", icon: IconReportAnalytics, feature: "general_ledger" },
      { title: "Usklađivanje (PDV ↔ GK)", url: "/knjigovodstvo/uskladjivanje", icon: IconArrowsLeftRight, feature: "general_ledger" },
      { title: "Zaključak godine", url: "/zakljucak-godine", icon: IconCalendarStats, feature: "general_ledger" },
    ],
  },

  // ─── Zajedničke sekcije ─────────────────────────────────────────────────────
  {
    title: "Zaposlenici",
    items: [
      { title: "Zaposlenici", url: "/zaposlenici", icon: IconUserCheck },
      { title: "Šihterica", url: "/sihterica", icon: IconCalendarTime },
      { title: "Obračuni plata", url: "/obracuni-plata", icon: IconWallet },
    ],
  },
  {
    title: "Račun",
    items: [
      { title: "Pretplata", url: "/pretplata", icon: IconCreditCard },
      {
        title: "Postavke",
        url: "/postavke",
        icon: IconSettings,
        dynamicTitle: getSettingsNavLabel,
      },
    ],
  },
];

export function getVisibleNavSections(orgType: string | null | undefined) {
  const type = normalizeOrgType(orgType);

  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items
      .filter((item) => !item.feature || hasFeature(type, item.feature))
      .map((item) => ({
        ...item,
        title: item.dynamicTitle ? item.dynamicTitle(type) : item.title,
      })),
  })).filter((section) => section.items.length > 0);
}
