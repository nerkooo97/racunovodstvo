import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  Article,
  P,
  Signatures,
  legalStyles,
} from "./legal-shared";

export interface UgovorOPozajmiciData {
  lender_name: string;
  lender_address: string;
  lender_jib: string;
  borrower_name: string;
  borrower_address: string;
  borrower_jib: string;
  amount: number;
  currency: string;
  interest_rate: number;
  term_months: number;
  start_date: string;
  purpose: string;
  bank_account: string;
  bank_name: string;
  note: string;
  court: string;
  copies: number;
  place: string;
  sign_date: string;
  schedule: Array<{
    month: number;
    payment: number;
    interest: number;
    principal: number;
    balance: number;
  }>;
}

function numberToWordsBcs(n: number): string {
  const units = ["", "jedan", "dva", "tri", "četiri", "pet", "šest", "sedam", "osam", "devet"];
  const teens = ["deset", "jedanaest", "dvanaest", "trinaest", "četrnaest", "petnaest", "šesnaest", "sedamnaest", "osamnaest", "devetnaest"];
  const tens = ["", "", "dvadeset", "trideset", "četrdoest", "pedeset", "šezdeset", "sedamdeset", "osamdeset", "devedeset"];
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

function formatAmountInWords(amount: number, currency: string): string {
  const rounded = Math.round(amount * 100) / 100;
  const integral = Math.floor(rounded);
  const decimals = Math.round((rounded - integral) * 100);
  const integralWords = numberToWordsBcs(integral);
  const decimalsStr = String(decimals).padStart(2, "0");
  
  const currencyName = currency === "EUR" ? "eura" : "konvertibilnih maraka";
  return `${integralWords} ${currencyName} i ${decimalsStr}/100`;
}

function formatCurrency(amount: number | null | undefined, currency: string): string {
  if (amount == null) return "—";
  const sym = currency === "EUR" ? " EUR" : " KM";
  return new Intl.NumberFormat("bs-BA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + sym;
}

interface Props {
  data: UgovorOPozajmiciData;
}

export function UgovorOPozajmiciDocument({ data }: Props) {
  const formattedAmount = formatCurrency(data.amount, data.currency);
  const amountWords = formatAmountInWords(data.amount, data.currency);

  const formattedSignDate = data.sign_date
    ? data.sign_date.split("-").reverse().join(".") + "."
    : "___________";

  const formattedStartDate = data.start_date
    ? data.start_date.split("-").reverse().join(".") + "."
    : "___________";

  const totalInterest = data.schedule.reduce((acc, curr) => acc + curr.interest, 0);

  return (
    <Document>
      {/* Stranica 1: Ugovor o zajmu */}
      <Page size="A4" style={legalStyles.page}>
        <View style={legalStyles.contentColumn}>
          <Text style={[legalStyles.title, { marginBottom: 20 }]}>
            UGOVOR O ZAJMU
          </Text>

          <Text style={legalStyles.parties}>
            Zaključen između:{"\n"}
            <Text style={{ fontWeight: "bold" }}>{data.lender_name || "__________________"}</Text> iz {data.lender_address || "___________"}{data.lender_jib ? `, JMBG/JIB: ${data.lender_jib}` : ""} (u daljem tekstu: „Zajmodavac“){"\n"}
            i{"\n"}
            <Text style={{ fontWeight: "bold" }}>{data.borrower_name || "__________________"}</Text> iz {data.borrower_address || "___________"}{data.borrower_jib ? `, JIB/JMBG: ${data.borrower_jib}` : ""} (u daljem tekstu: „Zajmoprimac“).
          </Text>

          <Text style={[legalStyles.preamble, { marginBottom: 15 }]}>
            Ugovorne strane u {data.place || "___________"}, dana {formattedSignDate} godine zaključuju sljedeći ugovor:
          </Text>

          <View wrap={false}>
            <Article number={1}>
              <P>
                Zajmodavac se obavezuje predati zajmoprimcu iznos od {formattedAmount} (slovima: {amountWords}) najkasnije do {formattedStartDate} godine.
              </P>
            </Article>
          </View>

          <View wrap={false}>
            <Article number={2}>
              <P>
                Zajmoprimac se obavezuje da će Zajmodavcu vratiti iznos iz člana 1. ovog Ugovora u roku od {data.term_months} mjeseci.
              </P>
              <P>
                {data.interest_rate > 0 ? (
                  `Pozajmica se daje uz godišnju kamatnu stopu od ${data.interest_rate}%, za vrijeme od prijema novca do dana vraćanja.`
                ) : (
                  "Pozajmica se daje bez naknade (beskamatna pozajmica)."
                )}
              </P>
              <P>
                U slučaju kašnjenja, Zajmoprimac se obavezuje na plaćanje zatezne kamate od dana kašnjenja do dana vraćanja u visini propisanoj zakonom.
              </P>
            </Article>
          </View>

          {data.purpose ? (
            <View wrap={false}>
              <Article number={3}>
                <P>
                  Pozajmica se daje namjenski za sljedeću svrhu: {data.purpose}.
                </P>
              </Article>
            </View>
          ) : null}

          <View wrap={false}>
            <Article number={data.purpose ? 4 : 3}>
              <P>
                Uplata iznosa zajma i njegov povrat vršit će se na transakcijski račun {data.bank_account || "__________________"}{data.bank_name ? ` otvoren kod ${data.bank_name}` : ""}.
              </P>
              <P>
                Ukoliko je ispunjenje obaveze zajmoprimca izvršeno u cijelosti, zajmoprimac ima pravo da mu zajmodavac izda priznanicu iz koje je vidljivo da je obaveza vraćanja ispunjena. U slučaju djelimičnog vraćanja, zajmodavac je dužan u priznanici navesti plaćeni iznos i preostali neplaćeni dug.
              </P>
            </Article>
          </View>

          <View wrap={false}>
            <Article number={data.purpose ? 5 : 4}>
              <P>
                Zajmoprimac može odustati od Ugovora prije nego što mu zajmodavac preda iznos zajma naveden u članu 1. ovog Ugovora, ali ako bi zbog toga nastala bilo kakva šteta za zajmodavca, dužan ju je naknaditi.
              </P>
            </Article>
          </View>

          <View wrap={false}>
            <Article number={data.purpose ? 6 : 5}>
              <P>
                Zajmoprimac može vratiti zajam i prije roka određenog za vraćanje, ali o svojoj namjeri mora na siguran i nedvojben način izvijestiti zajmodavca.
              </P>
              <P>
                Ukoliko za zajmodavca nastane eventualna šteta zbog vraćanja zajma prije roka, zajmoprimac ju je dužan naknaditi, a teret dokaza o nastanku i visini štete leži na zajmodavcu.
              </P>
            </Article>
          </View>

          {data.note ? (
            <View wrap={false}>
              <Article number={data.purpose ? 7 : 6}>
                <P>
                  Ugovorne strane saglasno utvrđuju sljedeću napomenu: {data.note}.
                </P>
              </Article>
            </View>
          ) : null}

          <View wrap={false}>
            <Article number={data.purpose ? (data.note ? 8 : 7) : (data.note ? 7 : 6)}>
              <P>
                Na sve što ovim Ugovorom nije regulisano primjenjivat će se odredbe Zakona o obligacionim odnosima.
              </P>
            </Article>
          </View>

          <View wrap={false}>
            <Article number={data.purpose ? (data.note ? 9 : 8) : (data.note ? 8 : 7)}>
              <P>
                U slučaju spora u vezi sa ovim Ugovorom nadležan je {data.court || "sud u sjedištu Zajmodavca"}.
              </P>
            </Article>
          </View>

          <View wrap={false}>
            <Article number={data.purpose ? (data.note ? 10 : 9) : (data.note ? 9 : 8)}>
              <P>
                Ovaj Ugovor stupa na snagu danom potpisivanja od strane obje ugovorne strane.
              </P>
            </Article>
          </View>

          <View wrap={false}>
            <Article number={data.purpose ? (data.note ? 11 : 10) : (data.note ? 10 : 9)}>
              <P>
                Ovaj Ugovor sačinjen je u {data.copies} istovjetna primjerka, od kojih svaka ugovorna strana zadržava po {Math.ceil(data.copies / 2)} primjerka.
              </P>
            </Article>

            <Signatures
              employerLabel="ZAJMODAVAC"
              employeeLabel="ZAJMOPRIMAC"
              employerName={data.lender_name}
              employeeName={data.borrower_name}
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

      {/* Stranica 2: Plan otplate */}
      {data.schedule && data.schedule.length > 0 ? (
        <Page size="A4" style={legalStyles.page}>
          <View style={legalStyles.contentColumn}>
            <Text style={[legalStyles.title, { marginBottom: 15 }]}>
              PLAN OTPLATE POZAJMICE
            </Text>
            <Text style={[legalStyles.subtitle, { marginBottom: 20, fontSize: 10, fontWeight: "normal", textAlign: "center" }]}>
              Prilog Ugovoru o zajmu zaključenom dana {formattedSignDate} godine
            </Text>

            {/* Tabela otplate */}
            <View style={{ marginTop: 10, borderWidth: 0.5, borderColor: "#000000" }}>
              {/* Header */}
              <View style={{ flexDirection: "row", backgroundColor: "#f2f2f2", borderBottomWidth: 0.5, borderBottomColor: "#000000", padding: 5 }}>
                <Text style={{ width: "10%", fontSize: 8, fontWeight: "bold", textAlign: "center" }}>Rata</Text>
                <Text style={{ width: "22%", fontSize: 8, fontWeight: "bold", textAlign: "right" }}>Glavnica</Text>
                <Text style={{ width: "22%", fontSize: 8, fontWeight: "bold", textAlign: "right" }}>Kamata</Text>
                <Text style={{ width: "22%", fontSize: 8, fontWeight: "bold", textAlign: "right" }}>Ukupna rata</Text>
                <Text style={{ width: "24%", fontSize: 8, fontWeight: "bold", textAlign: "right" }}>Preostali dug</Text>
              </View>

              {/* Rows */}
              {data.schedule.map((row) => (
                <View key={row.month} style={{ flexDirection: "row", borderBottomWidth: row.month === data.schedule.length ? 0 : 0.5, borderBottomColor: "#cccccc", padding: 5 }}>
                  <Text style={{ width: "10%", fontSize: 8, textAlign: "center" }}>{row.month}.</Text>
                  <Text style={{ width: "22%", fontSize: 8, textAlign: "right" }}>{formatCurrency(row.principal, data.currency)}</Text>
                  <Text style={{ width: "22%", fontSize: 8, textAlign: "right" }}>{formatCurrency(row.interest, data.currency)}</Text>
                  <Text style={{ width: "22%", fontSize: 8, textAlign: "right", fontWeight: "bold" }}>{formatCurrency(row.payment, data.currency)}</Text>
                  <Text style={{ width: "24%", fontSize: 8, textAlign: "right" }}>{formatCurrency(row.balance, data.currency)}</Text>
                </View>
              ))}
            </View>

            {/* Sumarna tabela */}
            <View style={{ marginTop: 15, alignSelf: "flex-end", width: "45%", borderWidth: 0.5, borderColor: "#000000" }}>
              <View style={{ flexDirection: "row", padding: 4, borderBottomWidth: 0.5, borderBottomColor: "#000000" }}>
                <Text style={{ width: "60%", fontSize: 8 }}>Glavnica ukupno:</Text>
                <Text style={{ width: "40%", fontSize: 8, textAlign: "right", fontWeight: "bold" }}>{formattedAmount}</Text>
              </View>
              <View style={{ flexDirection: "row", padding: 4, borderBottomWidth: 0.5, borderBottomColor: "#000000" }}>
                <Text style={{ width: "60%", fontSize: 8 }}>Kamata ukupno:</Text>
                <Text style={{ width: "40%", fontSize: 8, textAlign: "right", fontWeight: "bold" }}>{formatCurrency(totalInterest, data.currency)}</Text>
              </View>
              <View style={{ flexDirection: "row", padding: 4, backgroundColor: "#f2f2f2" }}>
                <Text style={{ width: "60%", fontSize: 8, fontWeight: "bold" }}>Ukupno za povrat:</Text>
                <Text style={{ width: "40%", fontSize: 8, textAlign: "right", fontWeight: "bold" }}>
                  {formatCurrency(data.amount + totalInterest, data.currency)}
                </Text>
              </View>
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
      ) : null}
    </Document>
  );
}
