export type ContractTemplateCategory =
  | "ugovor"
  | "otkaz"
  | "odsustvo"
  | "godisnji_odmor"
  | "ostalo";

export type ContractTemplateKind = "pdf";

export interface ContractTemplate {
  id: string;
  label: string;
  category: ContractTemplateCategory;
  kind: ContractTemplateKind;
}

export const CONTRACT_CATEGORY_LABELS: Record<ContractTemplateCategory, string> = {
  ugovor: "Ugovori",
  otkaz: "Otkaz ugovora o radu",
  odsustvo: "Odsustva",
  godisnji_odmor: "Godišnji odmor",
  ostalo: "Ostala rješenja",
};

export const EMPLOYEE_CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: "ugovor-o-radu",
    label: "Ugovor o radu",
    category: "ugovor",
    kind: "pdf",
  },
  {
    id: "godisnji-odmor",
    label: "Rješenje o korištenju godišnjeg odmora",
    category: "godisnji_odmor",
    kind: "pdf",
  },
  {
    id: "godisnji-odmor-nepuni",
    label: "Godišnji odmor — radnik bez punog prava",
    category: "godisnji_odmor",
    kind: "pdf",
  },
  {
    id: "placeno-odsustvo",
    label: "Rješenje o plaćenom odsustvu",
    category: "odsustvo",
    kind: "pdf",
  },
  {
    id: "neplaceno-odsustvo",
    label: "Rješenje o neplaćenom odsustvu",
    category: "odsustvo",
    kind: "pdf",
  },
  {
    id: "pripravnost",
    label: "Rješenje o pripravnosti",
    category: "ostalo",
    kind: "pdf",
  },
  {
    id: "sporazumni-otkaz",
    label: "Sporazumni raskid ugovora o radu",
    category: "otkaz",
    kind: "pdf",
  },
  {
    id: "otkaz-ekonomski",
    label: "Otkaz — ekonomski, tehnički ili organizacioni razlozi",
    category: "otkaz",
    kind: "pdf",
  },
  {
    id: "otkaz-obaveze",
    label: "Otkaz — radnik ne može izvršavati obaveze",
    category: "otkaz",
    kind: "pdf",
  },
  {
    id: "otkaz-ponuda-novog",
    label: "Otkaz sa ponudom novog ugovora o radu",
    category: "otkaz",
    kind: "pdf",
  },
  {
    id: "zo3",
    label: "ZO-3 prijava / odjava osiguranja",
    category: "ostalo",
    kind: "pdf",
  },
];

export function getContractTemplate(id: string): ContractTemplate | undefined {
  return EMPLOYEE_CONTRACT_TEMPLATES.find((t) => t.id === id);
}

export function groupTemplatesByCategory(): {
  category: ContractTemplateCategory;
  label: string;
  templates: ContractTemplate[];
}[] {
  const order: ContractTemplateCategory[] = [
    "ugovor",
    "otkaz",
    "odsustvo",
    "godisnji_odmor",
    "ostalo",
  ];
  return order
    .map((category) => ({
      category,
      label: CONTRACT_CATEGORY_LABELS[category],
      templates: EMPLOYEE_CONTRACT_TEMPLATES.filter((t) => t.category === category),
    }))
    .filter((g) => g.templates.length > 0);
}

export function isUgovorTemplate(id: string): boolean {
  return id === "ugovor-o-radu";
}

export function isOtkazTemplate(id: string): boolean {
  return id.startsWith("otkaz-") && id !== "sporazumni-otkaz";
}

export function isSporazumniTemplate(id: string): boolean {
  return id === "sporazumni-otkaz";
}

export function isPeriodTemplate(id: string): boolean {
  return (
    id.includes("odmor") ||
    id.includes("odsustvo") ||
    id === "pripravnost"
  );
}
