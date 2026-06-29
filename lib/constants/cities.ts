import opcineRaw from "./opcine.json";

export interface City {
  name: string;
  municipality: string;
  municipalityCode: string;
  canton: string;
  cantonCode: string;
  postalCode: string;
  bankName?: string;
  accounts?: string[];
}

// Mapiramo općine iz JSON fajla u standardni City interfejs
export const cities: City[] = opcineRaw.map((o) => {
  // Prilagođavamo nazive općina u Sarajevu da zadrže prepoznatljiv format za pretragu
  let name = o.name;
  if (o.cantonCode === "KS" && !o.name.includes("Sarajevo")) {
    if (o.name === "Centar" || o.name === "Stari Grad" || o.name === "Novi Grad" || o.name === "Novo Sarajevo") {
      name = `${o.name} Sarajevo`;
    }
  }
  
  return {
    name: name,
    municipality: o.name,
    municipalityCode: o.code,
    canton: o.cantonName,
    cantonCode: o.cantonCode,
    postalCode: o.postalCode,
    bankName: o.bankName,
    accounts: o.accounts,
  };
});

export function searchCities(query: string): City[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return cities
    .filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.municipality.toLowerCase().includes(q) ||
        c.municipalityCode.includes(q)
    )
    .slice(0, 10);
}
