import rsOpcineRaw from "./rs-opcine.json";

export interface RsMunicipality {
  name: string;
  code: string;
}

export const rsMunicipalities: RsMunicipality[] = rsOpcineRaw.map((o) => ({
  name: o.naziv,
  code: o.kod,
}));

export const BRCKO_DISTRICT = {
  city: "Brčko distrikt",
  municipality: "Brčko distrikt",
  municipalityCode: "144",
  canton: "Brčko distrikt",
} as const;

export function searchRsMunicipalities(query: string): RsMunicipality[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return rsMunicipalities
    .filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.code.includes(q)
    )
    .slice(0, 10);
}

export const RESIDENCE_ENTITY_HELP: Record<"FBiH" | "RS" | "BD", string> = {
  FBiH:
    "Odaberite grad ili općinu iz liste FBiH. Kanton, općina i šifra općine popunjavaju se automatski i ne mogu se ručno mijenjati.",
  RS:
    "Odaberite općinu u Republici Srpskoj iz liste. RS nema kantone — koristi se samo općina i njen kod.",
  BD:
    "Prebivalište u Brčkom distriktu je fiksno. Možete unijeti samo ulicu i broj.",
};

export function applyBrckoDistrict(setters: {
  setCity: (v: string) => void;
  setMunicipality: (v: string) => void;
  setMunicipalityCode: (v: string) => void;
  setCanton: (v: string) => void;
  setCitySearch: (v: string) => void;
}) {
  setters.setCity(BRCKO_DISTRICT.city);
  setters.setMunicipality(BRCKO_DISTRICT.municipality);
  setters.setMunicipalityCode(BRCKO_DISTRICT.municipalityCode);
  setters.setCanton(BRCKO_DISTRICT.canton);
  setters.setCitySearch(BRCKO_DISTRICT.city);
}

export function clearResidenceLocation(setters: {
  setCity: (v: string) => void;
  setMunicipality: (v: string) => void;
  setMunicipalityCode: (v: string) => void;
  setCanton: (v: string) => void;
  setCitySearch: (v: string) => void;
}) {
  setters.setCity("");
  setters.setMunicipality("");
  setters.setMunicipalityCode("");
  setters.setCanton("");
  setters.setCitySearch("");
}
