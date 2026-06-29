export interface Mip1023XmlRowItem {
  vrstaIsplate?: string; // "1"
  jmb: string;
  imePrezime: string; // e.g. "KO NERMIN"
  datumIsplate: string; // YYYY-MM-DD
  radniSati: number; // 176.00
  radniSatiBolovanje?: number; // 0.00
  brutoPlaca: number; // 213.00
  koristiIDrugiOporeziviPrihodi?: number; // 0.00
  ukupanPrihod: number; // 213.00
  iznosPIO: number; // 36.21
  iznosZO: number; // 26.63
  iznosNezaposlenost: number; // 3.19
  doprinosi: number; // 66.03
  prihodUmanjenZaDoprinose: number; // 146.97
  faktorLicnogOdbitka?: number; // 1.000
  iznosLicnogOdbitka: number; // 300.00
  osnovicaPoreza: number; // 0.00
  iznosPoreza: number; // 0.00
  radniSatiUT?: number; // 0.00
  stepenUvecanja?: string; // "0"
  sifraRadnogMjestaUT?: string; // "000000"
  doprinosiPIOMIOzaUT?: number; // 0.00
  beneficiraniStaz?: boolean; // false
  opcinaPrebivalista: string; // "094"
}

export interface Mip1023XmlData {
  jibPoslodavca: string;
  nazivPoslodavca: string;
  brojZahtjeva?: number; // 1
  datumPodnosenja: string; // YYYY-MM-DD
  brojUposlenih: number;
  periodOd: string; // YYYY-MM-DD
  periodDo: string; // YYYY-MM-DD
  sifraDjelatnosti: string; // e.g. "30.20"
  erpPio: number; // 5.33
  erpZo: number; // 4.26
  erpNezaposlenost: number; // 1.06
  dodatniDoprinosiZO?: number; // 0.00
  totalPrihod: number; // 213.00
  totalDoprinosi: number; // 66.03
  totalLicniOdbici: number; // 300.00
  totalPorez: number; // 0.00
  items: Mip1023XmlRowItem[];
}

function f2(n: number | undefined): string {
  if (n === undefined || n === null || isNaN(n)) return "0.00";
  return n.toFixed(2);
}

function f3(n: number | undefined): string {
  if (n === undefined || n === null || isNaN(n)) return "0.000";
  return n.toFixed(3);
}

function escXml(s: string | undefined | null): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function generateMip1023Xml(data: Mip1023XmlData): string {
  const rowsXml = data.items
    .map((it) => {
      return `      <PodaciOPrihodima>
        <VrstaIsplate>${escXml(it.vrstaIsplate || "1")}</VrstaIsplate>
        <Jmb>${escXml(it.jmb)}</Jmb>
        <ImePrezime>${escXml(it.imePrezime.toUpperCase())}</ImePrezime>
        <DatumIsplate>${escXml(it.datumIsplate)}</DatumIsplate>
        <RadniSati>${f2(it.radniSati)}</RadniSati>
        <RadniSatiBolovanje>${f2(it.radniSatiBolovanje || 0)}</RadniSatiBolovanje>
        <BrutoPlaca>${f2(it.brutoPlaca)}</BrutoPlaca>
        <KoristiIDrugiOporeziviPrihodi>${f2(it.koristiIDrugiOporeziviPrihodi || 0)}</KoristiIDrugiOporeziviPrihodi>
        <UkupanPrihod>${f2(it.ukupanPrihod || it.brutoPlaca)}</UkupanPrihod>
        <IznosPIO>${f2(it.iznosPIO)}</IznosPIO>
        <IznosZO>${f2(it.iznosZO)}</IznosZO>
        <IznosNezaposlenost>${f2(it.iznosNezaposlenost)}</IznosNezaposlenost>
        <Doprinosi>${f2(it.doprinosi)}</Doprinosi>
        <PrihodUmanjenZaDoprinose>${f2(it.prihodUmanjenZaDoprinose)}</PrihodUmanjenZaDoprinose>
        <FaktorLicnogOdbitka>${f3(it.faktorLicnogOdbitka ?? 1.0)}</FaktorLicnogOdbitka>
        <IznosLicnogOdbitka>${f2(it.iznosLicnogOdbitka)}</IznosLicnogOdbitka>
        <OsnovicaPoreza>${f2(it.osnovicaPoreza)}</OsnovicaPoreza>
        <IznosPoreza>${f2(it.iznosPoreza)}</IznosPoreza>
        <RadniSatiUT>${f2(it.radniSatiUT || 0)}</RadniSatiUT>
        <StepenUvecanja>${it.stepenUvecanja || "0"}</StepenUvecanja>
        <SifraRadnogMjestaUT>${it.sifraRadnogMjestaUT || "000000"}</SifraRadnogMjestaUT>
        <DoprinosiPIOMIOzaUT>${f2(it.doprinosiPIOMIOzaUT || 0)}</DoprinosiPIOMIOzaUT>
        <BeneficiraniStaz>${it.beneficiraniStaz ?? false}</BeneficiraniStaz>
        <OpcinaPrebivalista>${it.opcinaPrebivalista || "094"}</OpcinaPrebivalista>
      </PodaciOPrihodima>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<PaketniUvozObrazaca xmlns="urn:PaketniUvozObrazaca_V1_0.xsd">
  <PodaciOPoslodavcu>
    <JIBPoslodavca>${escXml(data.jibPoslodavca)}</JIBPoslodavca>
    <NazivPoslodavca>${escXml(data.nazivPoslodavca)}</NazivPoslodavca>
    <BrojZahtjeva>${data.brojZahtjeva || 1}</BrojZahtjeva>
    <DatumPodnosenja>${escXml(data.datumPodnosenja)}</DatumPodnosenja>
  </PodaciOPoslodavcu>
  <Obrazac1023>
    <Dio1>
      <JibJmb>${escXml(data.jibPoslodavca)}</JibJmb>
      <Naziv>${escXml(data.nazivPoslodavca)}</Naziv>
      <DatumUpisa>${escXml(data.datumPodnosenja)}</DatumUpisa>
      <BrojUposlenih>${data.brojUposlenih}</BrojUposlenih>
      <PeriodOd>${data.periodOd}</PeriodOd>
      <PeriodDo>${data.periodDo}</PeriodDo>
      <SifraDjelatnosti>${data.sifraDjelatnosti || "30.20"}</SifraDjelatnosti>
    </Dio1>
    <Dio2>
${rowsXml}
    </Dio2>
    <Dio3>
      <PIO>${f2(data.erpPio)}</PIO>
      <ZO>${f2(data.erpZo)}</ZO>
      <OsiguranjeOdNezaposlenosti>${f2(data.erpNezaposlenost)}</OsiguranjeOdNezaposlenosti>
      <DodatniDoprinosiZO>${f2(data.dodatniDoprinosiZO || 0)}</DodatniDoprinosiZO>
      <Prihod>${f2(data.totalPrihod)}</Prihod>
      <Doprinosi>${f2(data.totalDoprinosi)}</Doprinosi>
      <LicniOdbici>${f2(data.totalLicniOdbici)}</LicniOdbici>
      <Porez>${f2(data.totalPorez)}</Porez>
    </Dio3>
    <Dio4IzjavaPoslodavca>
      <JibJmbPoslodavca>${escXml(data.jibPoslodavca)}</JibJmbPoslodavca>
      <DatumUnosa>${escXml(data.datumPodnosenja)}</DatumUnosa>
      <NazivPoslodavca>${escXml(data.nazivPoslodavca)}</NazivPoslodavca>
    </Dio4IzjavaPoslodavca>
    <Dokument>
      <Operacija>Prijava_od_strane_poreznog_obveznika</Operacija>
    </Dokument>
  </Obrazac1023>
</PaketniUvozObrazaca>`;
}
