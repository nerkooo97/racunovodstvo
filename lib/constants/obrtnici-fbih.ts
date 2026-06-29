import data from "./obrtnici-fbih.json";

export type PausalnKategorija = "OBRT_SRODNE" | "ESNAFSKI_ZANATI" | "POLJOPRIVREDA_SUMARSTVO" | "TAXI" | "TRGOVAC_POJEDINAC";
export type StvarniKategorija = "SLOBODNA_ZANIMANJA" | "OBRT_SRODNE" | "POLJOPRIVREDA_SUMARSTVO" | "TRGOVAC_POJEDINAC";
export type TaxRegime = "STVARNI_DOHODAK" | "PAUSALNI" | "OSTALI";

export const KATEGORIJE_PAUSALNI = data.kategorijePausalni as Record<PausalnKategorija, string>;
export const KATEGORIJE_STVARNI  = data.kategorijeStvarni  as Record<StvarniKategorija, string>;
export const REZIMI_LABELS        = data.rezimiLabels       as Record<TaxRegime, string>;

/** Vraća godišnju osnovicu za doprinos vlasnika obrta (iz JSON-a, ne hardcoded) */
export function getObrtnikOsnovica(
  godina: number,
  rezim: TaxRegime,
  kategorija?: string
): number {
  const godData = (data as any)[String(godina)];
  if (!godData) throw new Error(`Osnovice za ${godina} nisu u obrtnici-fbih.json`);
  if (rezim === "OSTALI") return godData.ostali;
  if (!kategorija) throw new Error(`Kategorija je obavezna za režim ${rezim}`);
  const map = rezim === "STVARNI_DOHODAK" ? godData.stvarniDohodak : godData.pausalni;
  const val = map[kategorija];
  if (val === undefined) throw new Error(`Kategorija ${kategorija} ne postoji u ${rezim} za ${godina}`);
  return val;
}
