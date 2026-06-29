/**
 * Centralna logika računovodstvenog režima: obrt (pojednostavljeno / KPR)
 * vs d.o.o. (dvojno knjigovodstvo).
 */

export type OrgType = "obrt" | "doo";

export type OrgFeature =
  | "kpr"
  | "kpr_auto_from_bank"
  | "owner_tax_regime"
  | "invoices"
  | "pdv"
  | "payroll"
  | "bank_statements"
  | "general_ledger";

export interface RegimeDefinition {
  label: string;
  shortLabel: string;
  accountingModel: string;
  description: string;
  incomePrinciple: string;
  yearlyReporting: string;
}

export const REGIME: Record<OrgType, RegimeDefinition> = {
  obrt: {
    label: "Obrt / samostalna djelatnost",
    shortLabel: "Obrt",
    accountingModel: "Pojednostavljeno knjigovodstvo (princip blagajne)",
    description:
      "Prihodi i rashodi po stvarnom prilivu i odlivu novca. Glavna evidencija je KPR-1041.",
    incomePrinciple: "Prihod nastaje kada novac stvarno uđe (gotovina / banka).",
    yearlyReporting: "Godišnja prijava dohotka (GPD, obrazac 2001).",
  },
  doo: {
    label: "Društvo s ograničenom odgovornošću",
    shortLabel: "d.o.o.",
    accountingModel: "Dvojno knjigovodstvo (kontni plan, dnevnik, glavna knjiga)",
    description:
      "Poslovanje se vodi po fakturisanom principu. KPR-1041 se ne koristi.",
    incomePrinciple:
      "Prihod nastaje pri izdavanju fakture, neovisno o uplati.",
    yearlyReporting:
      "Godišnji finansijski izvještaji (Bilans stanja, Bilans uspjeha) — FIA (FBiH) / APIF (RS).",
  },
};

/** Koje mogućnosti su dostupne po tipu organizacije */
const FEATURES_BY_TYPE: Record<OrgType, ReadonlySet<OrgFeature>> = {
  obrt: new Set([
    "kpr",
    "kpr_auto_from_bank",
    "owner_tax_regime",
    "invoices",
    "pdv",
    "payroll",
    "bank_statements",
  ]),
  doo: new Set([
    "invoices",
    "pdv",
    "payroll",
    "bank_statements",
    "general_ledger",
  ]),
};

export function normalizeOrgType(type: string | null | undefined): OrgType {
  return type === "doo" ? "doo" : "obrt";
}

export function getRegime(type: string | null | undefined): RegimeDefinition {
  return REGIME[normalizeOrgType(type)];
}

export function hasFeature(
  type: string | null | undefined,
  feature: OrgFeature
): boolean {
  return FEATURES_BY_TYPE[normalizeOrgType(type)].has(feature);
}

export function getSettingsNavLabel(type: string | null | undefined): string {
  return normalizeOrgType(type) === "obrt" ? "Postavke obrta" : "Postavke";
}

export const KPR_UNAVAILABLE_MESSAGE =
  "KPR-1041 važi samo za obrte i samostalne djelatnosti. d.o.o. vodi dvojno knjigovodstvo — koristite fakture, PDV evidencije i bankovne izvode.";

export function assertFeature(
  type: string | null | undefined,
  feature: OrgFeature
): { ok: true } | { ok: false; error: string } {
  if (hasFeature(type, feature)) return { ok: true };
  const regime = getRegime(type);
  if (feature === "kpr" || feature === "kpr_auto_from_bank") {
    return { ok: false, error: KPR_UNAVAILABLE_MESSAGE };
  }
  return {
    ok: false,
    error: `Ova funkcija nije dostupna za ${regime.shortLabel}.`,
  };
}

/** URL-ovi koji zahtijevaju određenu mogućnost */
export const ROUTE_FEATURES: { prefix: string; feature: OrgFeature }[] = [
  { prefix: "/kpr", feature: "kpr" },
];

export function routeRequiresFeature(pathname: string): OrgFeature | null {
  for (const { prefix, feature } of ROUTE_FEATURES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return feature;
    }
  }
  return null;
}
