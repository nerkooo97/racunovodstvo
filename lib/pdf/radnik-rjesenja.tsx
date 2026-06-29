import { Text, View } from "@react-pdf/renderer";
import type { EmployeeDocumentData } from "@/lib/contracts/document-data";
import {
  LegalPage,
  P,
  SectionHeading,
  Signatures,
  legalStyles,
} from "./legal-shared";

interface RjesenjeConfig {
  title: string;
  legalBasis: string;
  intro: string;
  obrazlozenje: (d: EmployeeDocumentData) => string[];
  resolves: (d: EmployeeDocumentData) => string[];
}

const POUKA =
  "Protiv ovog rješenja zaposlenik može podnijeti prigovor poslodavcu u roku od osam dana od dana uručenja rješenja, u skladu sa Zakonom o radu.";

const CONFIGS: Record<string, RjesenjeConfig> = {
  "godisnji-odmor": {
    title: "RJEŠENJE O KORIŠTENJU GODIŠNJEG ODMORA",
    legalBasis:
      "Na osnovu člana 64. stav 1. Zakona o radu (\"Sl. Novine FBiH\" broj 43/99 i kasnijih izmjena i dopuna), poslodavac donosi",
    intro: "RJEŠENJE",
    obrazlozenje: (d) => [
      `Zaposlenik ${d.employeeFullName}, zaposlen na radnom mjestu ${d.jobTitle || "___________"}, ostvario je pravo na korištenje godišnjeg odmora za tekuću kalendarsku godinu.`,
      d.reason ||
        "Obrazloženje: Zaposlenik je ostvario uslove za korištenje godišnjeg odmora u skladu sa Zakonom o radu i Pravilnikom o radu poslodavca.",
    ],
    resolves: (d) => [
      `Odobrava se korištenje godišnjeg odmora zaposleniku ${d.employeeFullName}${d.durationDays ? ` u trajanju od ${d.durationDays} radnih dana` : ""}${d.dateFrom && d.dateTo ? `, u periodu od ${d.dateFrom} do ${d.dateTo} godine` : d.dateFrom ? `, počev od ${d.dateFrom} godine` : ""}.`,
      "Zaposlenik je dužan po završetku godišnjeg odmora se javiti na rad u skladu sa ovim rješenjem.",
    ],
  },
  "godisnji-odmor-nepuni": {
    title: "RJEŠENJE O KORIŠTENJU GODIŠNJEG ODMORA",
    legalBasis:
      "Na osnovu člana 64. stav 1. Zakona o radu (\"Sl. Novine FBiH\" broj 43/99 i kasnijih izmjena i dopuna), poslodavac donosi",
    intro: "RJEŠENJE",
    obrazlozenje: (d) => [
      `Zaposlenik ${d.employeeFullName} nije stekao pravo na puni godišnji odmor za tekuću kalendarsku godinu, već na proporcionalni dio godišnjeg odmora u skladu sa Zakonom o radu.`,
      d.reason ||
        "Obrazloženje: Zaposlenik nije proveo kod poslodavca dovoljan radni staž za ostvarivanje prava na puni godišnji odmor.",
    ],
    resolves: (d) => [
      `Odobrava se korištenje proporcionalnog dijela godišnjeg odmora zaposleniku ${d.employeeFullName}${d.durationDays ? ` u trajanju od ${d.durationDays} radnih dana` : ""}${d.dateFrom && d.dateTo ? `, u periodu od ${d.dateFrom} do ${d.dateTo} godine` : ""}.`,
    ],
  },
  "placeno-odsustvo": {
    title: "RJEŠENJE O PLAĆENOM ODSUSTVU",
    legalBasis:
      "Na osnovu člana 91. Zakona o radu (\"Sl. Novine FBiH\" broj 43/99 i kasnijih izmjena i dopuna), poslodavac donosi",
    intro: "RJEŠENJE",
    obrazlozenje: (d) => [
      d.reason ||
        `Zaposlenik ${d.employeeFullName} podnio je zahtjev za korištenje plaćenog odsustva iz razloga navedenih u zahtjevu.`,
    ],
    resolves: (d) => [
      `Odobrava se zaposleniku ${d.employeeFullName} korištenje plaćenog odsustva${d.dateFrom && d.dateTo ? ` u periodu od ${d.dateFrom} do ${d.dateTo} godine` : d.dateFrom ? ` od ${d.dateFrom} godine` : ""}.`,
      "Za vrijeme plaćenog odsustva zaposleniku pripadaju sva primanja u skladu sa Zakonom o radu.",
    ],
  },
  "neplaceno-odsustvo": {
    title: "RJEŠENJE O NEPLAĆENOM ODSUSTVU",
    legalBasis:
      "Na osnovu člana 92. Zakona o radu (\"Sl. Novine FBiH\" broj 43/99 i kasnijih izmjena i dopuna), poslodavac donosi",
    intro: "RJEŠENJE",
    obrazlozenje: (d) => [
      d.reason ||
        `Zaposlenik ${d.employeeFullName} podnio je zahtjev za korištenje neplaćenog odsustva.`,
    ],
    resolves: (d) => [
      `Odobrava se zaposleniku ${d.employeeFullName} korištenje neplaćenog odsustva${d.dateFrom && d.dateTo ? ` u periodu od ${d.dateFrom} do ${d.dateTo} godine` : d.dateFrom ? ` od ${d.dateFrom} godine` : ""}.`,
      "Za vrijeme neplaćenog odsustva zaposleniku ne pripadaju primanja, osim onih propisanih zakonom.",
    ],
  },
  pripravnost: {
    title: "RJEŠENJE O PRIPRAVNOSTI",
    legalBasis:
      "Na osnovu člana 55. Zakona o radu (\"Sl. Novine FBiH\" broj 43/99 i kasnijih izmjena i dopuna), poslodavac donosi",
    intro: "RJEŠENJE",
    obrazlozenje: (d) => [
      d.reason ||
        `Zbog potreba poslovanja, zaposlenik ${d.employeeFullName} će obavljati poslove u režimu pripravnosti.`,
    ],
    resolves: (d) => [
      `Određuje se da zaposlenik ${d.employeeFullName} obavlja poslove u pripravnosti${d.dateFrom && d.dateTo ? ` u periodu od ${d.dateFrom} do ${d.dateTo} godine` : ""}.`,
      "Zaposleniku za vrijeme pripravnosti pripada naknada u skladu sa Zakonom o radu i Pravilnikom o radu poslodavca.",
    ],
  },
  "otkaz-ekonomski": {
    title: "RJEŠENJE O OTKAZU UGOVORA O RADU",
    legalBasis:
      "Na osnovu člana 132. stav 1. tačka a) Zakona o radu (\"Sl. Novine FBiH\" broj 43/99 i kasnijih izmjena i dopuna), poslodavac donosi",
    intro: "RJEŠENJE",
    obrazlozenje: (d) => [
      d.reason ||
        "Obrazloženje: Poslodavac je u stanju viška radnika zbog ekonomskih, tehničkih ili organizacionih razloga, usljed čega nije u mogućnosti da zaposleniku obezbijedi obavljanje poslova za koje je zaključen ugovor o radu.",
      `Zaposlenik ${d.employeeFullName}, zaposlen na radnom mjestu ${d.jobTitle || "___________"}, obavješten je o namjeri otkaza u skladu sa zakonom.`,
    ],
    resolves: (d) => [
      `Otkazuje se ugovor o radu zaposleniku ${d.employeeFullName}, sa otkaznim rokom od ${d.terminationNotice}.`,
      d.dateTo
        ? `Radni odnos prestaje ${d.dateTo} godine.`
        : "Datum prestanka radnog odnosa određuje se u skladu sa otkaznim rokom.",
      d.severancePay
        ? `Zaposleniku pripada otpremnina u iznosu od ${d.severancePay}.`
        : "Zaposleniku pripada otpremnina u skladu sa Zakonom o radu.",
    ],
  },
  "otkaz-obaveze": {
    title: "RJEŠENJE O OTKAZU UGOVORA O RADU",
    legalBasis:
      "Na osnovu člana 132. stav 1. tačka b) Zakona o radu (\"Sl. Novine FBiH\" broj 43/99 i kasnijih izmjena i dopuna), poslodavac donosi",
    intro: "RJEŠENJE",
    obrazlozenje: (d) => [
      d.reason ||
        "Obrazloženje: Zaposlenik nije u mogućnosti da zbog bolesti ili povrede na radu ili van rada obavlja svoje obaveze iz radnog odnosa u skladu sa mišljenjem nadležnog zdravstvenog organa.",
      `Zaposlenik ${d.employeeFullName}, JMBG ${d.employeeJmbg}.`,
    ],
    resolves: (d) => [
      `Otkazuje se ugovor o radu zaposleniku ${d.employeeFullName}, sa otkaznim rokom od ${d.terminationNotice}.`,
      d.dateTo ? `Radni odnos prestaje ${d.dateTo} godine.` : "",
    ].filter(Boolean),
  },
  "otkaz-ponuda-novog": {
    title: "RJEŠENJE O OTKAZU UGOVORA O RADU SA PONUDOM NOVOG UGOVORA",
    legalBasis:
      "Na osnovu člana 132. stav 1. tačka a) u vezi sa članom 134. Zakona o radu (\"Sl. Novine FBiH\" broj 43/99 i kasnijih izmjena i dopuna), poslodavac donosi",
    intro: "RJEŠENJE",
    obrazlozenje: (d) => [
      d.reason ||
        "Obrazloženje: Poslodavac otkazuje ugovor o radu zbog ekonomskih, tehničkih ili organizacionih razloga, uz istovremenu ponudu zaključenja novog ugovora o radu pod izmijenjenim uslovima.",
      `Zaposlenik ${d.employeeFullName} obavješten je o pravu da prihvati ili odbije ponudu novog ugovora o radu.`,
    ],
    resolves: (d) => [
      `Otkazuje se ugovor o radu zaposleniku ${d.employeeFullName}, sa otkaznim rokom od ${d.terminationNotice}.`,
      "Zaposleniku se istovremeno dostavlja ponuda za zaključenje novog ugovora o radu pod izmijenjenim uslovima rada.",
      d.severancePay
        ? `U slučaju odbijanja ponude, zaposleniku pripada otpremnina u iznosu od ${d.severancePay}.`
        : "U slučaju odbijanja ponude, zaposleniku pripada otpremnina u skladu sa Zakonom o radu.",
    ],
  },
};

function RjesenjeDocument({
  config,
  data,
}: {
  config: RjesenjeConfig;
  data: EmployeeDocumentData;
}) {
  const obrazlozenje = config.obrazlozenje(data);
  const resolves = config.resolves(data);

  return (
    <LegalPage>
      <View style={legalStyles.headerMeta}>
        <Text style={legalStyles.headerLine}>Broj: {data.documentNumber}</Text>
        <Text style={legalStyles.headerLine}>
          U {data.documentPlace || "___________"}, dana {data.documentDateFormatted}{" "}
          godine
        </Text>
      </View>

      <Text style={legalStyles.preamble}>{config.legalBasis}</Text>
      <Text style={legalStyles.sectionTitle}>{config.title}</Text>
      <Text style={[legalStyles.subtitle, { marginBottom: 12 }]}>{config.intro}</Text>

      <SectionHeading>Obrazloženje</SectionHeading>
      {obrazlozenje.map((p, i) => (
        <P key={i}>{p}</P>
      ))}

      <SectionHeading>Rješava se</SectionHeading>
      {resolves.map((item, i) => (
        <Text key={i} style={legalStyles.resolvesItem}>
          {i + 1}. {item}
        </Text>
      ))}

      <SectionHeading>Pouka</SectionHeading>
      <P>{POUKA}</P>

      {data.extraNote ? <P>{data.extraNote}</P> : null}

      <Signatures
        employerName={data.representative || data.orgName}
        employeeName={data.employeeFullName}
      />
    </LegalPage>
  );
}

export function renderRjesenjeDocument(
  templateId: string,
  data: EmployeeDocumentData
) {
  const config = CONFIGS[templateId];
  if (!config) return null;
  return <RjesenjeDocument config={config} data={data} />;
}

export function isRjesenjeTemplate(templateId: string): boolean {
  return templateId in CONFIGS;
}
