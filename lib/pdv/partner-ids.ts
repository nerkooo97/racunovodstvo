/**
 * Validacija identifikatora partnera i obveznika prema UIO pravilima.
 *
 * - PDV broj (ID broj UIO): 12 cifara
 * - JIB/PIB: 13 cifara
 * - Uvoz/izvoz: PDV = 12 nula, JIB = 13 nula
 * - Neobveznik: PDV polje prazno
 */

import {
  JIB_LENGTH,
  VAT_ID_LENGTH,
  UIO_IMPORT_VAT_ID,
  UIO_IMPORT_JIB,
  type PartnerKind,
} from "./constants";

const DIGITS_12 = /^\d{12}$/;
const DIGITS_13 = /^\d{13}$/;

export function normalizeDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

export function isValidVatId(value: string | null | undefined): boolean {
  return DIGITS_12.test(normalizeDigits(value));
}

export function isValidJib(value: string | null | undefined): boolean {
  return DIGITS_13.test(normalizeDigits(value));
}

/**
 * Određuje vrijednosti PDV i JIB polja za CSV po pravilima UIO,
 * ovisno o vrsti partnera. Vraća stringove spremne za CSV (prazno = "").
 */
export function resolvePartnerIds(input: {
  kind: PartnerKind;
  vatId?: string | null;
  jib?: string | null;
}): { vatId: string; jib: string } {
  const vat = normalizeDigits(input.vatId);
  const jib = normalizeDigits(input.jib);

  switch (input.kind) {
    case "import_customs":
      // Uvoz/izvoz preko carine: fiksne nule
      return { vatId: UIO_IMPORT_VAT_ID, jib: UIO_IMPORT_JIB };

    case "foreign":
      // Strani partner (izvoz/uvoz robe): nule po uputstvu
      return { vatId: UIO_IMPORT_VAT_ID, jib: UIO_IMPORT_JIB };

    case "domestic_vat":
      return {
        vatId: vat.length === VAT_ID_LENGTH ? vat : "",
        jib: jib.length === JIB_LENGTH ? jib : "",
      };

    case "domestic_jib":
      // Nije PDV obveznik: PDV polje prazno, JIB popunjen
      return { vatId: "", jib: jib.length === JIB_LENGTH ? jib : "" };

    case "individual":
      // Fizičko lice: oba polja prazna
      return { vatId: "", jib: "" };

    default:
      return { vatId: "", jib: "" };
  }
}

/**
 * Validira identifikatore partnera za dati kontekst (KIF/KUF stavka).
 * Vraća listu grešaka (prazno = ispravno).
 */
export function validatePartnerIds(input: {
  kind: PartnerKind;
  vatId?: string | null;
  jib?: string | null;
  partnerName?: string | null;
}): string[] {
  const errors: string[] = [];
  const name = (input.partnerName ?? "").trim();
  if (!name) errors.push("Naziv partnera je obavezan.");

  const vat = normalizeDigits(input.vatId);
  const jib = normalizeDigits(input.jib);

  switch (input.kind) {
    case "domestic_vat":
      if (vat && !isValidVatId(vat)) {
        errors.push("PDV broj mora imati tačno 12 cifara.");
      }
      if (!vat && !jib) {
        errors.push("PDV obveznik mora imati PDV broj (12) ili JIB (13).");
      }
      if (jib && !isValidJib(jib)) {
        errors.push("JIB mora imati tačno 13 cifara.");
      }
      break;

    case "domestic_jib":
      if (!isValidJib(jib)) {
        errors.push("Domaći neobveznik mora imati JIB od 13 cifara.");
      }
      break;

    case "foreign":
    case "import_customs":
      // Nule se generišu automatski — bez dodatne validacije
      break;

    case "individual":
      // Fizičko lice — bez ID-a
      break;
  }

  return errors;
}

/** Mapira kategoriju partnera iz baze na PartnerKind za evidenciju. */
export function partnerKindFromCategory(
  category: string | null | undefined,
  isVatObligor: boolean
): PartnerKind {
  switch (category) {
    case "foreign":
      return "foreign";
    case "individual":
      return "individual";
    case "uio_customs":
      return "import_customs";
    case "domestic_company":
    default:
      return isVatObligor ? "domestic_vat" : "domestic_jib";
  }
}
