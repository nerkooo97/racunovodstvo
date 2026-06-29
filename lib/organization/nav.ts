import type { Icon } from "@tabler/icons-react";
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
  IconFolder,
  IconReportAnalytics,
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
  items: NavItemConfig[];
}

export const NAV_SECTIONS: NavSectionConfig[] = [
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
      {
        title: "Računovodstvo",
        url: "/racunovodstvo",
        icon: IconReportAnalytics,
      },
      {
        title: "KPR-1041",
        url: "/kpr",
        icon: IconBook,
        feature: "kpr",
      },
      { title: "PDV evidencije", url: "/pdv", icon: IconReceiptTax },
      { title: "Obrasci", url: "/obrasci", icon: IconForms },
    ],
  },
  {
    title: "Glavna knjiga",
    items: [
      {
        title: "Kontni plan",
        url: "/knjigovodstvo/kontni-plan",
        icon: IconBook,
        feature: "general_ledger",
      },
      {
        title: "Dnevnik",
        url: "/knjigovodstvo/dnevnik",
        icon: IconFileInvoice,
        feature: "general_ledger",
      },
      {
        title: "Bruto bilans",
        url: "/knjigovodstvo/bruto-bilans",
        icon: IconReportAnalytics,
        feature: "general_ledger",
      },
      {
        title: "Finansijski izvještaji",
        url: "/knjigovodstvo/finansijski-izvjestaji",
        icon: IconReportAnalytics,
        feature: "general_ledger",
      },
      {
        title: "Usklađivanje (PDV ↔ GK)",
        url: "/knjigovodstvo/uskladjivanje",
        icon: IconArrowsLeftRight,
        feature: "general_ledger",
      },
    ],
  },
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
