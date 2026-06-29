// GIP-1022 XML Generator – Godišnja prijava poreza na dohodak iz radnog odnosa
// Logika preuzeta/verifikovana prema Porezni Kalkulator BiH (chunk modul 50963)

function escXml(s: string | undefined | null): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const f2 = (n: number): string => n.toFixed(2);
const f3 = (n: number): string => n.toFixed(3);

export interface Gip1022RowItem {
  mjesec: number;
  isplataZaMjesec: string;
  vrstaIsplate: string;
  iznosNovac: number;
  iznosStvari: number;
  bruto: number;
  pio: number;
  zdr: number;
  nezap: number;
  ukupniDopr: number;
  placaBezDopr: number;
  faktor: number;
  iznosOdbitka: number;
  osnovicaPoreza: number;
  iznosPoreza: number;
  neto: number;
  datumUplate: string;
}

export interface Gip1022Ukupno {
  iznosNovac: number;
  iznosStvari: number;
  bruto: number;
  pio: number;
  zdr: number;
  nezap: number;
  ukupniDopr: number;
  placaBezDopr: number;
  iznosOdbitka: number;
  osnovicaPoreza: number;
  iznosPoreza: number;
  neto: number;
}

export interface Gip1022Obrazac {
  naziv: string;
  adresaSjedista: string;
  jmbZaposlenika: string;
  imeIPrezime: string;
  adresaPrebivalista: string;
  poreznaGodina: number;
  rows: Gip1022RowItem[];
  ukupno: Gip1022Ukupno;
}

export interface Gip1022XmlData {
  jibPoslodavca: string;
  nazivPoslodavca: string;
  brojZahtjeva: number;
  datumPodnosenja: string;
  obrasci: Gip1022Obrazac[];
}

export function generateGip1022Xml(data: Gip1022XmlData): string {
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8" ?>');
  lines.push('<PaketniUvozObrazaca xsi:schemaLocation="urn:PaketniUvozObrazaca_V1_0.xsd PaketniUvozObrazaca_V1_0.xsd" xmlns="urn:PaketniUvozObrazaca_V1_0.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">');
  lines.push(" <PodaciOPoslodavcu>");
  lines.push(`   <JIBPoslodavca>${escXml(data.jibPoslodavca)}</JIBPoslodavca>`);
  lines.push(`   <NazivPoslodavca>${escXml(data.nazivPoslodavca)}</NazivPoslodavca>`);
  lines.push(`   <BrojZahtjeva>${data.brojZahtjeva}</BrojZahtjeva>`);
  lines.push(`   <DatumPodnosenja>${escXml(data.datumPodnosenja)}</DatumPodnosenja>`);
  lines.push(" </PodaciOPoslodavcu>");

  for (const obrazac of data.obrasci) {
    lines.push(" <Obrazac1022>");
    lines.push("   <Dio1PodaciOPoslodavcuIPoreznomObvezniku>");
    lines.push(`     <JIBJMBPoslodavca>${escXml(data.jibPoslodavca)}</JIBJMBPoslodavca>`);
    lines.push(`     <Naziv>${escXml(obrazac.naziv)}</Naziv>`);
    lines.push(`     <AdresaSjedista>${escXml(obrazac.adresaSjedista)}</AdresaSjedista>`);
    lines.push(`     <JMBZaposlenika>${escXml(obrazac.jmbZaposlenika)}</JMBZaposlenika>`);
    lines.push(`     <ImeIPrezime>${escXml(obrazac.imeIPrezime)}</ImeIPrezime>`);
    lines.push(`     <AdresaPrebivalista>${escXml(obrazac.adresaPrebivalista)}</AdresaPrebivalista>`);
    lines.push(`     <PoreznaGodina>${obrazac.poreznaGodina}</PoreznaGodina>`);
    lines.push("   </Dio1PodaciOPoslodavcuIPoreznomObvezniku>");
    lines.push("   <Dio2PodaciOPrihodimaDoprinosimaIPorezu>");

    for (const row of obrazac.rows) {
      lines.push("    <PodaciOPrihodimaDoprinosimaIPorezu>");
      lines.push(`     <Mjesec>${row.mjesec}</Mjesec>`);
      lines.push(`     <IsplataZaMjesecIGodinu>${escXml(row.isplataZaMjesec)}</IsplataZaMjesecIGodinu>`);
      lines.push(`     <VrstaIsplate>${escXml(row.vrstaIsplate)}</VrstaIsplate>`);
      lines.push(`     <IznosPrihodaUNovcu>${f2(row.iznosNovac)}</IznosPrihodaUNovcu>`);
      lines.push(`     <IznosPrihodaUStvarimaUslugama>${f2(row.iznosStvari)}</IznosPrihodaUStvarimaUslugama>`);
      lines.push(`     <BrutoPlaca>${f2(row.bruto)}</BrutoPlaca>`);
      lines.push(`     <IznosZaPenzijskoInvalidskoOsiguranje>${f2(row.pio)}</IznosZaPenzijskoInvalidskoOsiguranje>`);
      lines.push(`     <IznosZaZdravstvenoOsiguranje>${f2(row.zdr)}</IznosZaZdravstvenoOsiguranje>`);
      lines.push(`     <IznosZaOsiguranjeOdNezaposlenosti>${f2(row.nezap)}</IznosZaOsiguranjeOdNezaposlenosti>`);
      lines.push(`     <UkupniDoprinosi>${f2(row.ukupniDopr)}</UkupniDoprinosi>`);
      lines.push(`     <PlacaBezDoprinosa>${f2(row.placaBezDopr)}</PlacaBezDoprinosa>`);
      lines.push(`     <FaktorLicnihOdbitakaPremaPoreznojKartici>${f3(row.faktor)}</FaktorLicnihOdbitakaPremaPoreznojKartici>`);
      lines.push(`     <IznosLicnogOdbitka>${f2(row.iznosOdbitka)}</IznosLicnogOdbitka>`);
      lines.push(`     <OsnovicaPoreza>${f2(row.osnovicaPoreza)}</OsnovicaPoreza>`);
      lines.push(`     <IznosUplacenogPoreza>${f2(row.iznosPoreza)}</IznosUplacenogPoreza>`);
      lines.push(`     <NetoPlaca>${f2(row.neto)}</NetoPlaca>`);
      lines.push(`     <DatumUplate>${escXml(row.datumUplate)}</DatumUplate>`);
      lines.push("    </PodaciOPrihodimaDoprinosimaIPorezu>");
    }

    const u = obrazac.ukupno;
    lines.push("    <Ukupno>");
    lines.push(`     <IznosPrihodaUNovcu>${f2(u.iznosNovac)}</IznosPrihodaUNovcu>`);
    lines.push(`     <IznosPrihodaUStvarimaUslugama>${f2(u.iznosStvari)}</IznosPrihodaUStvarimaUslugama>`);
    lines.push(`     <BrutoPlaca>${f2(u.bruto)}</BrutoPlaca>`);
    lines.push(`     <IznosZaPenzijskoInvalidskoOsiguranje>${f2(u.pio)}</IznosZaPenzijskoInvalidskoOsiguranje>`);
    lines.push(`     <IznosZaZdravstvenoOsiguranje>${f2(u.zdr)}</IznosZaZdravstvenoOsiguranje>`);
    lines.push(`     <IznosZaOsiguranjeOdNezaposlenosti>${f2(u.nezap)}</IznosZaOsiguranjeOdNezaposlenosti>`);
    lines.push(`     <UkupniDoprinosi>${f2(u.ukupniDopr)}</UkupniDoprinosi>`);
    lines.push(`     <PlacaBezDoprinosa>${f2(u.placaBezDopr)}</PlacaBezDoprinosa>`);
    lines.push(`     <IznosLicnogOdbitka>${f2(u.iznosOdbitka)}</IznosLicnogOdbitka>`);
    lines.push(`     <OsnovicaPoreza>${f2(u.osnovicaPoreza)}</OsnovicaPoreza>`);
    lines.push(`     <IznosUplacenogPoreza>${f2(u.iznosPoreza)}</IznosUplacenogPoreza>`);
    lines.push(`     <NetoPlaca>${f2(u.neto)}</NetoPlaca>`);
    lines.push("    </Ukupno>");
    lines.push("   </Dio2PodaciOPrihodimaDoprinosimaIPorezu>");
    lines.push(" <Dio3IzjavaPoslodavcaIsplatioca>");
    lines.push(`   <JIBJMBPoslodavca>${escXml(data.jibPoslodavca)}</JIBJMBPoslodavca>`);
    lines.push(`   <DatumUnosa>${escXml(data.datumPodnosenja)}</DatumUnosa>`);
    lines.push(`   <NazivPoslodavca>${escXml(obrazac.naziv)}</NazivPoslodavca>`);
    lines.push(" </Dio3IzjavaPoslodavcaIsplatioca>");
    lines.push("   <Dokument>");
    lines.push("     <Operacija>Novi</Operacija>");
    lines.push("   </Dokument>");
    lines.push(" </Obrazac1022>");
  }

  lines.push("</PaketniUvozObrazaca>");
  return lines.join("\n");
}
