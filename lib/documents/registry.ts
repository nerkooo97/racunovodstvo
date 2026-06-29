import { EMPLOYEE_CONTRACT_TEMPLATES } from "@/lib/contracts/templates";

export type DocumentCategory =
  | "radnik"
  | "partner"
  | "finansije"
  | "interni"
  | "general";

export interface DocumentTypeDefinition {
  id: string;
  label: string;
  category: DocumentCategory;
  numberPrefix?: string;
  autoNumber?: boolean;
}

export const DOCUMENT_CATEGORIES: Record<
  DocumentCategory,
  { label: string; description: string }
> = {
  radnik: {
    label: "Radnici",
    description: "Ugovori, rješenja i sporazumi za zaposlenike",
  },
  partner: {
    label: "Partneri",
    description: "Ugovori i dokumenti vezanih za poslovne partnere",
  },
  finansije: {
    label: "Finansije",
    description: "Fakture, potvrde, interni finansijski dokumenti",
  },
  interni: {
    label: "Interni",
    description: "Pravilnici, odluke i interna dokumentacija",
  },
  general: {
    label: "Ostalo",
    description: "Ručno uploadovani i ostali dokumenti",
  },
};

const TEMPLATE_PREFIX: Record<string, string> = {
  "ugovor-o-radu": "UR",
  "sporazumni-otkaz": "SO",
  "godisnji-odmor": "GO",
  "godisnji-odmor-nepuni": "GO",
  "placeno-odsustvo": "PO",
  "neplaceno-odsustvo": "NP",
  pripravnost: "PR",
  "otkaz-ekonomski": "OT",
  "otkaz-obaveze": "OT",
  "otkaz-ponuda-novog": "OT",
};

const RADNIK_TYPES: DocumentTypeDefinition[] = EMPLOYEE_CONTRACT_TEMPLATES.map(
  (t) => ({
    id: t.id,
    label: t.label,
    category: "radnik" as const,
    numberPrefix: TEMPLATE_PREFIX[t.id],
    autoNumber: true,
  })
);

const CUSTOM_TYPES: DocumentTypeDefinition[] = [
  {
    id: "partner-ugovor",
    label: "Ugovor sa partnerom",
    category: "partner",
    numberPrefix: "UP",
    autoNumber: true,
  },
  {
    id: "interni-pravilnik",
    label: "Interni pravilnik",
    category: "interni",
    numberPrefix: "PRV",
    autoNumber: true,
  },
  {
    id: "upload",
    label: "Ručni upload",
    category: "general",
    autoNumber: false,
  },
];

export const DOCUMENT_TYPES: DocumentTypeDefinition[] = [
  ...RADNIK_TYPES,
  ...CUSTOM_TYPES,
];

export function getDocumentType(id: string): DocumentTypeDefinition | undefined {
  return DOCUMENT_TYPES.find((t) => t.id === id);
}

export function getDocumentTypesByCategory(
  category: DocumentCategory
): DocumentTypeDefinition[] {
  return DOCUMENT_TYPES.filter((t) => t.category === category);
}

export function getCategoryLabel(category: string): string {
  return DOCUMENT_CATEGORIES[category as DocumentCategory]?.label ?? category;
}

export function resolveDocumentType(
  documentType: string,
  fallbackLabel?: string
): DocumentTypeDefinition {
  return (
    getDocumentType(documentType) ?? {
      id: documentType,
      label: fallbackLabel ?? documentType,
      category: "general",
      autoNumber: false,
    }
  );
}

export function getNumberPrefix(documentType: string): string {
  return getDocumentType(documentType)?.numberPrefix ?? "";
}
