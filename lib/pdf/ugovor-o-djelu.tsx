import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  Article,
  P,
  Bullet,
  Signatures,
  legalStyles,
} from "./legal-shared";
import {
  calculateUodFromBruto,
  calculateUodFromNeto,
  type UodExpenseType,
} from "@/lib/calculations/ugovor-o-djelu";
import cantonalAccounts from "@/lib/constants/cantonal-accounts.json";

export interface UgovorODjeluData {
  naruciocNaziv: string;
  naruciocAdresa: string;
  naruciocJib: string;
  izvrsName: string;
  izvrsAdresa: string;
  izvrsJmbg: string;
  izvrsZiro: string;
  opis: string;
  datumZakl: string;
  rokIzvrs: string;
  brojUgovora: string;
  mjesto: string;
  sud: string;
  kanton: string;
  direction: "neto" | "bruto";
  expenseType: UodExpenseType;
  amount: number;
}

const CANTON_JSON_KEYS: Record<string, string> = {
  "01": "Unsko-sanski kanton",
  "02": "Posavski kanton",
  "03": "Tuzlanski kanton",
  "04": "Zeničko-dobojski kanton",
  "05": "Bosansko-podrinjski kanton",
  "06": "Srednjobosanski kanton",
  "07": "Hercegovačko-neretvanski kanton",
  "08": "Zapadnohercegovački kanton",
  "09": "Kanton Sarajevo",
  "10": "Kanton 10",
};

interface AccountInfo {
  healthAccount: string;
  budgetAccount: string;
  unemploymentAccount: string;
  cantonName: string;
}

function getCantonAccounts(code: string): AccountInfo {
  const key = CANTON_JSON_KEYS[code] || "Kanton Sarajevo";
  // @ts-ignore
  const data = cantonalAccounts.cantonal[key];
  return {
    healthAccount: data?.healthAccount || "—",
    budgetAccount: data?.budgetAccount || "—",
    unemploymentAccount: data?.unemploymentAccount || "—",
    cantonName: data?.cantonName || key,
  };
}

function numberToWordsBcs(n: number): string {
  const units = ["", "jedan", "dva", "tri", "četiri", "pet", "šest", "sedam", "osam", "devet"];
  const teens = ["deset", "jedanaest", "dvanaest", "trinaest", "četrnaest", "petnaest", "šesnaest", "sedamnaest", "osamnaest", "devetnaest"];
  const tens = ["", "", "dvadeset", "trideset", "četrdeset", "pedeset", "šezdeset", "sedamdeset", "osamdeset", "devedeset"];
  const hundreds = ["", "sto", "dvjesto", "tristo", "četiristo", "petsto", "šeststo", "sedamsto", "osamsto", "devetsto"];

  if (n === 0) return "nula";

  let words = "";

  const millions = Math.floor(n / 1000000);
  let rem = n % 1000000;

  if (millions > 0) {
    if (millions === 1) words += "milion ";
    else words += numberToWordsBcs(millions) + " miliona ";
  }

  const thousands = Math.floor(rem / 1000);
  rem = rem % 1000;

  if (thousands > 0) {
    if (thousands === 1) {
      words += "hiljada ";
    } else if (thousands === 2) {
      words += "dvije hiljade ";
    } else if (thousands % 10 === 3 || thousands % 10 === 4) {
      words += numberToWordsBcs(thousands) + " hiljade ";
    } else {
      words += numberToWordsBcs(thousands) + " hiljada ";
    }
  }

  const h = Math.floor(rem / 100);
  const t = Math.floor((rem % 100) / 10);
  const u = rem % 10;

  if (h > 0) {
    words += hundreds[h] + " ";
  }

  if (t === 1) {
    words += teens[u] + " ";
  } else {
    if (t > 1) {
      words += tens[t] + " ";
    }
    if (u > 0) {
      if (u === 1 && (thousands > 0 || h > 0) && rem === 1) {
        words += "jedan ";
      } else if (u === 2) {
        words += "dva ";
      } else {
        words += units[u] + " ";
      }
    }
  }

  return words.trim();
}

export function formatAmountInWords(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const integral = Math.floor(rounded);
  const decimals = Math.round((rounded - integral) * 100);
  const integralWords = numberToWordsBcs(integral);
  const decimalsStr = String(decimals).padStart(2, "0");
  return `${integralWords} KM i ${decimalsStr}/100`;
}

function formatKM(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("bs-BA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + " KM";
}

interface Props {
  data: UgovorODjeluData;
}

export function UgovorODjeluDocument({ data }: Props) {
  // Reconstruct calculation
  const result = data.direction === "neto"
    ? calculateUodFromNeto(data.amount, data.expenseType)
    : calculateUodFromBruto(data.amount, data.expenseType);

  const formattedNet = formatKM(result.netPayment);
  const netWords = formatAmountInWords(result.netPayment);

  const formattedDateZakl = data.datumZakl
    ? data.datumZakl.split("-").reverse().join(".") + "."
    : "___________";

  const formattedRok = data.rokIzvrs
    ? data.rokIzvrs.split("-").reverse().join(".") + "."
    : "___________";

  const cantonAccounts = getCantonAccounts(data.kanton);

  const vouchers = [
    { naziv: "Porez na dohodak — Kantonalni budžet", sifra: "716116", iznos: result.incomeTax, racun: cantonAccounts.budgetAccount, budgetOrg: "0000000" },
    { naziv: "Zdravstveno osiguranje — Kanton (89.8%)", sifra: "712116", iznos: result.healthKanton, racun: cantonAccounts.healthAccount, budgetOrg: "0000000" },
    { naziv: "Zdravstveno osiguranje — FZO FBiH (10.2%)", sifra: "712116", iznos: result.healthFbih, racun: "102-050-00000640-18", budgetOrg: "0000000" },
    { naziv: "PIO/MIO — Budžet FBiH", sifra: "712126", iznos: result.pensionOn, racun: "102-050-00001066-98", budgetOrg: "5102001" },
    { naziv: "Zaštita od prirodnih nepogoda — Kanton", sifra: "722582", iznos: result.disaster, racun: cantonAccounts.budgetAccount, budgetOrg: "0000000" },
    { naziv: "Opća vodna naknada — Kanton", sifra: "722582", iznos: result.water, racun: "141-196-53200084-75", budgetOrg: "0000000" },
  ].filter(v => v.iznos > 0);

  return (
    <Document>
      {/* Stranica 1: Ugovor o djelu */}
      <Page size="A4" style={legalStyles.page}>
        <View style={legalStyles.contentColumn}>
          <Text style={[legalStyles.title, { marginBottom: 15 }]}>
            UGOVOR O DJELU
          </Text>
          {data.brojUgovora ? (
            <Text style={[legalStyles.subtitle, { marginTop: -10, marginBottom: 15 }]}>
              Broj: {data.brojUgovora}
            </Text>
          ) : null}

          <Text style={legalStyles.parties}>
            Zaključen između:{"\n"}
            <Text style={{ fontWeight: "bold" }}>{data.naruciocNaziv || "__________________"}</Text> sa sjedištem u {data.naruciocAdresa || "___________"}{data.naruciocJib ? `, JIB/ID broj: ${data.naruciocJib}` : ""} (u daljem tekstu: Naručitelj posla)
            {"\n"}i{"\n"}
            <Text style={{ fontWeight: "bold" }}>{data.izvrsName || "__________________"}</Text> sa stanom u {data.izvrsAdresa || "___________"}{data.izvrsJmbg ? `, JMBG: ${data.izvrsJmbg}` : ""}{data.izvrsZiro ? `, broj transakcijskog računa: ${data.izvrsZiro}` : ""} (u daljem tekstu: Izvršilac posla)
          </Text>

          <View wrap={false}>
            <Text style={[legalStyles.sectionHeading, { marginTop: 8, marginBottom: 8 }]}>
              PREDMET UGOVORA
            </Text>
            <Article number={1}>
              <P>
                Predmet Ugovora je {data.opis || "________________________________________________"}.
              </P>
            </Article>
          </View>

          <View wrap={false}>
            <Text style={[legalStyles.sectionHeading, { marginTop: 8, marginBottom: 8 }]}>
              OBIM UGOVORA
            </Text>
            <Article number={2}>
              <P>
                Izvršilac će obaviti radove navedene u Članu 1. ovog ugovora u potpunosti i u skladu sa pravilima struke.
              </P>
            </Article>
          </View>

          <View wrap={false}>
            <Text style={[legalStyles.sectionHeading, { marginTop: 8, marginBottom: 8 }]}>
              OBVEZE IZVRŠIOCA
            </Text>
            <Article number={3}>
              <Bullet>
                poslove navedene u Članu 1. i 2. ovog ugovora obavi stručno, savjesno i prema pravilima struke i zakonskih propisa,
              </Bullet>
              <Bullet>
                pomogne u predaji i dokaže pravilan rad sistema Naručitelju,
              </Bullet>
              <Bullet>
                ispuni sve zadatke i potrebne formulare koje zahtijeva Naručitelj.
              </Bullet>
            </Article>
          </View>

          <View wrap={false}>
            <Text style={[legalStyles.sectionHeading, { marginTop: 8, marginBottom: 8 }]}>
              OBVEZE NARUČITELJA
            </Text>
            <Article number={4}>
              <P>
                Naručitelj je obvezan da osigura potrebne uslove za rad, te po završetku i prijemu posla izvrši plaćanje ugovorene naknade u skladu sa ovim ugovorom.
              </P>
            </Article>
          </View>

          <View wrap={false}>
            <Text style={[legalStyles.sectionHeading, { marginTop: 8, marginBottom: 8 }]}>
              ROK IZVRŠENJA RADOVA
            </Text>
            <Article number={5}>
              <P>
                Izvršilac se obvezuje da će poslove izvršiti u roku do {formattedRok}, počevši od dana zaključenja ovog ugovora.
              </P>
            </Article>
          </View>

          <View wrap={false}>
            <Text style={[legalStyles.sectionHeading, { marginTop: 8, marginBottom: 8 }]}>
              CIJENA RADOVA
            </Text>
            <Article number={6}>
              <P>
                Izvršilac će obaviti poslove iz Člana 1. ovog ugovora za fiksnu neto cijenu od {formattedNet} (slovima: {netWords}).
              </P>
              <P>
                Poreze i doprinose na ugovorenu cijenu plaća Naručitelj u skladu sa važećim propisima u Federaciji Bosne i Hercegovine.
              </P>
            </Article>
          </View>

          <View wrap={false}>
            <Text style={[legalStyles.sectionHeading, { marginTop: 8, marginBottom: 8 }]}>
              NAČIN PLAĆANJA
            </Text>
            <Article number={7}>
              <P>
                Naručitelj će plaćati Izvršiocu izvršene radove na osnovu potvrde o ispravnosti i prijemu radova potpisane od ovlaštene osobe Naručitelja.
              </P>
              <P>
                Isplata ugovorene cijene vršit će se na transakcijski račun Izvršioca {data.izvrsZiro ? `broj ${data.izvrsZiro}` : "__________________"} u roku od 15 dana po prijemu radova.
              </P>
            </Article>
            <Article number={8}>
              <P>
                Ugovorne strane su saglasne da će se na sve odnose koji nisu izričito uređeni ovim ugovorom primjenjivati odgovarajuće odredbe Zakona o obligacionim odnosima.
              </P>
            </Article>
          </View>

          <View wrap={false}>
            <Text style={[legalStyles.sectionHeading, { marginTop: 8, marginBottom: 8 }]}>
              ZAVRŠNE ODREDBE
            </Text>
            <Article number={9}>
              <P>
                Svi eventualno nastali sporovi po ovom ugovoru rješavat će se sporazumno. U slučaju da se spor ne može riješiti sporazumno, nadležan je sud {data.sud ? data.sud : "__________________"}.
              </P>
            </Article>
            <Article number={10}>
              <P>
                Ovaj ugovor je sačinjen u 4 (četiri) istovjetna primjerka, od kojih svaka ugovorna strana zadržava po 2 (dva) primjerka.
              </P>
            </Article>
            <Text style={legalStyles.dateLine}>
              Sastavljen u {data.mjesto || "___________"}, dana {formattedDateZakl} godine.
            </Text>
            <Signatures
              employerLabel="NARUČITELJ POSLA"
              employeeLabel="IZVRŠILAC POSLA"
              employerName={data.naruciocNaziv}
              employeeName={data.izvrsName}
            />
          </View>
        </View>
        <View
          style={{
            position: "absolute",
            bottom: 25,
            left: 0,
            right: 0,
            flexDirection: "row",
            justifyContent: "center",
          }}
          fixed
        >
          <Text
            style={{
              fontSize: 9,
              fontFamily: "Helvetica",
              color: "#333333",
            }}
            render={({ pageNumber, totalPages }) => (
              totalPages ? `Stranica ${pageNumber} od ${totalPages}` : `Stranica ${pageNumber}`
            )}
          />
        </View>
      </Page>

      {/* Stranica 2: Lista uplatnica u obliku tabele */}
      <Page size="A4" style={legalStyles.page}>
        <View style={legalStyles.contentColumn}>
          <Text style={[legalStyles.title, { marginBottom: 15 }]}>
            ZBIRNI NALOZI ZA PLAĆANJE (UPLATNICE)
          </Text>
          <Text style={[legalStyles.subtitle, { marginBottom: 20, fontSize: 10, fontWeight: "normal", textAlign: "center" }]}>
            Specifikacija poreza i doprinosa za ugovor o djelu broj: {data.brojUgovora || "___________"}
          </Text>

          {/* Tabela obaveza */}
          <View style={{ marginTop: 10, borderWidth: 0.5, borderColor: "#000000" }}>
            {/* Header */}
            <View style={{ flexDirection: "row", backgroundColor: "#f2f2f2", borderBottomWidth: 0.5, borderBottomColor: "#000000", padding: 5 }}>
              <Text style={{ width: "35%", fontSize: 8, fontWeight: "bold" }}>Naziv obaveze / uplate</Text>
              <Text style={{ width: "25%", fontSize: 8, fontWeight: "bold" }}>Račun primaoca</Text>
              <Text style={{ width: "15%", fontSize: 8, fontWeight: "bold", textAlign: "center" }}>Šifra prihoda</Text>
              <Text style={{ width: "13%", fontSize: 8, fontWeight: "bold", textAlign: "center" }}>Budž. org.</Text>
              <Text style={{ width: "12%", fontSize: 8, fontWeight: "bold", textAlign: "right" }}>Iznos</Text>
            </View>

            {/* Rows */}
            {vouchers.map((v, i) => (
              <View key={i} style={{ flexDirection: "row", borderBottomWidth: i === vouchers.length - 1 ? 0 : 0.5, borderBottomColor: "#cccccc", padding: 5 }}>
                <Text style={{ width: "35%", fontSize: 8 }}>{v.naziv}</Text>
                <Text style={{ width: "25%", fontSize: 8, fontWeight: "bold" }}>{v.racun}</Text>
                <Text style={{ width: "15%", fontSize: 8, textAlign: "center" }}>{v.sifra}</Text>
                <Text style={{ width: "13%", fontSize: 8, textAlign: "center" }}>{v.budgetOrg !== "0000000" ? v.budgetOrg : "—"}</Text>
                <Text style={{ width: "12%", fontSize: 8, textAlign: "right", fontWeight: "bold" }}>{formatKM(v.iznos)}</Text>
              </View>
            ))}
          </View>

          {/* Sumarna tabela sa ukupnim vrijednostima */}
          <View style={{ marginTop: 15, alignSelf: "flex-end", width: "40%", borderWidth: 0.5, borderColor: "#000000" }}>
            <View style={{ flexDirection: "row", padding: 4, borderBottomWidth: 0.5, borderBottomColor: "#000000" }}>
              <Text style={{ width: "60%", fontSize: 8 }}>Neto za isplatu:</Text>
              <Text style={{ width: "40%", fontSize: 8, textAlign: "right", fontWeight: "bold" }}>{formattedNet}</Text>
            </View>
            <View style={{ flexDirection: "row", padding: 4, borderBottomWidth: 0.5, borderBottomColor: "#000000" }}>
              <Text style={{ width: "60%", fontSize: 8 }}>Ukupno doprinosi/porez:</Text>
              <Text style={{ width: "40%", fontSize: 8, textAlign: "right", fontWeight: "bold" }}>
                {formatKM(vouchers.reduce((acc, curr) => acc + curr.iznos, 0))}
              </Text>
            </View>
            <View style={{ flexDirection: "row", padding: 4, backgroundColor: "#f2f2f2" }}>
              <Text style={{ width: "60%", fontSize: 8, fontWeight: "bold" }}>Ukupan trošak:</Text>
              <Text style={{ width: "40%", fontSize: 8, textAlign: "right", fontWeight: "bold" }}>{formatKM(result.totalCost)}</Text>
            </View>
          </View>
          
          <View style={{ marginTop: 30, padding: 8, borderWidth: 0.5, borderColor: "#777777", borderRadius: 4, backgroundColor: "#f9f9f9" }}>
            <Text style={{ fontSize: 9, fontWeight: "bold", marginBottom: 4 }}>Pravna napomena za plaćanje:</Text>
            <Text style={{ fontSize: 8, lineHeight: 1.3, textAlign: "justify" }}>
              Obveznik plaćanja poreza i doprinosa po ugovoru o djelu je Naručilac posla. Sve uplate navedene u tabeli specifikacije moraju biti izvršene istovremeno sa isplatom neto iznosa Izvršiocu posla na njegov transakcijski račun {data.izvrsZiro ? `broj ${data.izvrsZiro}` : "__________________"}. Također, Naručilac je obavezan predati obrazac ASD-1032 / AUG-1031 nadležnoj ispostavi Porezne uprave u roku od 5 dana od dana isplate.
            </Text>
          </View>
        </View>
        <View
          style={{
            position: "absolute",
            bottom: 25,
            left: 0,
            right: 0,
            flexDirection: "row",
            justifyContent: "center",
          }}
          fixed
        >
          <Text
            style={{
              fontSize: 9,
              fontFamily: "Helvetica",
              color: "#333333",
            }}
            render={({ pageNumber, totalPages }) => (
              totalPages ? `Stranica ${pageNumber} od ${totalPages}` : `Stranica ${pageNumber}`
            )}
          />
        </View>
      </Page>
    </Document>
  );
}
