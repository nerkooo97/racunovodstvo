/**
 * Konstante za e-KIF / e-KUF prema Tehničkom uputstvu UIO BiH.
 * Tipovi dokumenata: bazno uputstvo 01–05, izmjene 09/2023 proširuju na 01–09.
 */

export type RecordType = "kif" | "kuf";

export type PartnerKind =
  | "domestic_vat"
  | "domestic_jib"
  | "foreign"
  | "import_customs"
  | "individual";

export type SaleCategory =
  | "domestic_b2b"
  | "domestic_b2c"
  | "export_goods"
  | "export_services"
  | "exempt"
  | "internal_use";

export type NonDeductibleReason =
  | "representation"
  | "vehicle"
  | "mixed"
  | "private"
  | "other";

/** Posebne vrijednosti identifikatora po uputstvu */
export const UIO_IMPORT_VAT_ID = "000000000000"; // 12 nula (uvoz/izvoz)
export const UIO_IMPORT_JIB = "0000000000000"; // 13 nula (uvoz/izvoz)

export const VAT_ID_LENGTH = 12;
export const JIB_LENGTH = 13;

/** Standardna stopa PDV-a u BiH */
export const VAT_RATE = 17;

/** Tipovi dokumenta KUF (nabavke) */
export const KUF_DOCUMENT_TYPES = [
  { code: "01", label: "Ulazna faktura (roba/usluge iz zemlje)" },
  { code: "02", label: "Vlastita potrošnja (vanposlovne svrhe)" },
  { code: "03", label: "Avansna faktura (dati avans)" },
  { code: "04", label: "JCI (uvoz)" },
  { code: "05", label: "Usluge primljene iz inostranstva" },
  { code: "06", label: "Knjižno odobrenje (KO)" },
  { code: "07", label: "Ostali dokument (poslovne knjige)" },
  { code: "08", label: "Ulaz — posebno" },
  { code: "09", label: "Donacija hrane / posrednik" },
] as const;

/** Tipovi dokumenta KIF (isporuke) */
export const KIF_DOCUMENT_TYPES = [
  { code: "01", label: "Izlazna faktura (roba/usluge u zemlji)" },
  { code: "02", label: "Vlastita potrošnja (vanposlovne svrhe)" },
  { code: "03", label: "Avansna faktura (primljeni avans)" },
  { code: "04", label: "JCI (izvoz)" },
  { code: "05", label: "Usluge izvršene stranom licu / ostalo oslobođeno" },
  { code: "06", label: "Knjižno odobrenje (KO)" },
  { code: "07", label: "Ostali dokument (poslovne knjige)" },
  { code: "08", label: "Izlaz — posebno" },
  { code: "09", label: "Donacija hrane / posrednik" },
] as const;

export type UioDocumentType = string;

/** Tipovi dokumenata dostupni u aplikaciji (01–09 po izmjenama 09/2023). */
export const MVP_DOCUMENT_CODES = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
];

export function documentTypesFor(recordType: RecordType) {
  return recordType === "kif" ? KIF_DOCUMENT_TYPES : KUF_DOCUMENT_TYPES;
}

export function documentTypeLabel(
  recordType: RecordType,
  code: string
): string {
  const found = documentTypesFor(recordType).find((d) => d.code === code);
  return found ? found.label : code;
}

export const NON_DEDUCTIBLE_REASONS: {
  value: NonDeductibleReason;
  label: string;
}[] = [
  { value: "representation", label: "Reprezentacija (ručkovi, pokloni)" },
  { value: "vehicle", label: "Putničko vozilo (nabavka/održavanje)" },
  { value: "mixed", label: "Mješovita upotreba (srazmjerni odbitak)" },
  { value: "private", label: "Privatna / vanposlovna upotreba" },
  { value: "other", label: "Ostalo (bez prava na odbitak)" },
];

export const SALE_CATEGORIES: { value: SaleCategory; label: string }[] = [
  { value: "domestic_b2b", label: "Prodaja PDV obvezniku (BiH)" },
  { value: "domestic_b2c", label: "Prodaja neobvezniku / građaninu" },
  { value: "export_goods", label: "Izvoz robe (JCI)" },
  { value: "export_services", label: "Usluge stranom licu" },
  { value: "exempt", label: "Oslobođeno bez prava na odbitak" },
  { value: "internal_use", label: "Vlastita / vanposlovna potrošnja" },
];

/** CSV tehnička pravila (UIO) */
export const CSV_SEPARATOR = ";";
export const CSV_MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const CSV_ENCODING = "utf-8";

/** Tip datoteke u nazivu/zaglavlju: 1 = nabavke (KUF), 2 = isporuke (KIF) */
export const FILE_TYPE_KUF = "1";
export const FILE_TYPE_KIF = "2";
