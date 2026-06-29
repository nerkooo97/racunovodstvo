import { Text, View } from "@react-pdf/renderer";
import type { EmployeeDocumentData } from "@/lib/contracts/document-data";
import {
  LegalPage,
  Article,
  P,
  Bullet,
  Signatures,
  legalStyles,
} from "./legal-shared";

interface Props {
  data: EmployeeDocumentData;
}

function salaryClause(data: EmployeeDocumentData): string {
  const base =
    data.salaryType === "neto" && data.netSalaryFormatted !== "—"
      ? `neto plaću u iznosu od ${data.netSalaryFormatted}`
      : `bruto plaću u iznosu od ${data.grossSalaryFormatted}`;

  const meal =
    data.mealAllowanceFormatted !== "—" && data.mealAllowanceFormatted !== "0,00 KM"
      ? `, naknadu troškova dnevnog boravka na radu (topli obrok) u iznosu od ${data.mealAllowanceFormatted} po radnom danu`
      : "";

  return `${base}${meal}, te sve pripadajuće doprinose i poreze na plaću u skladu sa ovim ugovorom i odnosnim propisima`;
}

export function UgovorORaduDocument({ data }: Props) {
  const repSuffix = data.representative
    ? `, koga zastupa ${data.representative}`
    : "";

  const subtitle =
    data.contractType === "fixed" && data.contractEndDateFormatted
      ? `${data.contractTypeLabel} do ${data.contractEndDateFormatted}`
      : data.contractTypeLabel;

  return (
    <LegalPage>
      <Text style={legalStyles.preamble}>
        Na osnovu člana 142. Zakona o radu (&quot;Sl. Novine FBiH&quot; broj 43/99 i
        kasnijih izmjena i dopuna), u skladu sa odredbama Zakona, ugovorne strane
        zaključuju slijedeći
      </Text>

      <Text style={legalStyles.title}>UGOVOR O RADU</Text>
      <Text style={legalStyles.subtitle}>{subtitle}</Text>

      <Text style={legalStyles.parties}>
        Između poslodavca {data.orgName}, sa sjedištem u {data.orgAddress}
        {data.orgCity ? `, ${data.orgCity}` : ""}, JIB {data.orgJib || "___________"}
        {repSuffix}, u daljnjem tekstu Poslodavac, i zaposlenika {data.employeeFullName},
        JMBG {data.employeeJmbg}, sa prebivalištem u {data.employeeResidence}
        {data.employeeMunicipality ? `, općina ${data.employeeMunicipality}` : ""}, u
        daljnjem tekstu Zaposlenik.
      </Text>

      <Article number={1}>
        {data.contractType === "fixed" ? (
          <P>
            Ovaj ugovor se zaključuje {data.contractTypeLabel}
            {data.contractEndDateFormatted
              ? `, u trajanju do ${data.contractEndDateFormatted} godine`
              : ""}
            .
          </P>
        ) : (
          <P>Ovaj ugovor se zaključuje na NEODREĐENO vrijeme.</P>
        )}
        {data.probation ? (
          <P>
            Zaposlenik će raditi u probnom radu
            {data.probationMonths > 0
              ? ` u trajanju od ${data.probationMonths} ${data.probationMonths === 1 ? "mjesec" : "mjeseci"}`
              : ""}
            {data.probationEndDateFormatted
              ? `, odnosno do ${data.probationEndDateFormatted} godine`
              : ""}
            . Ukoliko ni Poslodavac ni Zaposlenik ne otkažu ugovor o radu prije isteka
            probnog rada, po isteku probnog rada nastavlja se radni odnos{" "}
            {data.contractTypeLabel} prema odredbama ovog ugovora.
          </P>
        ) : null}
      </Article>

      <Article number={2}>
        <P>Zaposlenik će obavljati sljedeće poslove:</P>
        {data.jobDescriptionLines.map((line, i) => (
          <Bullet key={i}>{line}</Bullet>
        ))}
        {data.jobTitle ? (
          <P>
            te sve druge poslove koje mu neposredno nalože rukovodilac i direktor, a
            koji su vezani za uspješno obavljanje poslova i djelatnosti Poslodavca
            {data.jobTitle ? ` na radnom mjestu ${data.jobTitle}` : ""}.
          </P>
        ) : null}
      </Article>

      <Article number={3}>
        <P>
          Zaposlenik će poslove iz člana 2. ovog ugovora obavljati na teritoriji{" "}
          {data.workLocation}, odnosno na lokacijama Poslodavca, a u skladu sa
          potrebama i poslovnim ciljevima Poslodavca.
        </P>
      </Article>

      <Article number={4}>
        <P>
          Zaposlenik će sa radom na navedenim poslovima početi dana{" "}
          {data.hireDateFormatted || "___________"} godine.
        </P>
      </Article>

      <Article number={5}>
        <P>
          Zaposlenik će raditi {data.workHoursLabel}. Trajanje radne sedmice, njen
          početak i završetak te raspodjela radnog vremena uređuju se Pravilnikom o
          radu i Pravilnikom o raspodjeli radnog vremena Poslodavca.
        </P>
      </Article>

      <Article number={6}>
        <P>
          Pauzu tokom radnog dana, dnevni odmor između dva radna dana, sedmični odmor
          i godišnji odmor Zaposlenik će koristiti sukladno odredbama Zakona o radu,
          usklađeno sa prirodom djelatnosti Poslodavca. Zaposleniku pripada godišnji
          odmor u trajanju od najmanje {data.annualLeaveDays} radnih dana.
        </P>
      </Article>

      <Article number={7}>
        <P>
          Za obavljene poslove iz člana 2. ovog ugovora Poslodavac će Zaposleniku
          isplaćivati osnovnu {salaryClause(data)}. U ukupno plaćanje uključena su
          sva primanja koja po važećim propisima pripadaju Zaposleniku.
        </P>
        <P>
          Plaću i ukupna primanja iz stava 1. ovog člana Poslodavac će Zaposleniku
          isplaćivati u rokovima određenim Pravilnikom o plaći, najkasnije do{" "}
          {data.paymentDay} u mjesecu za prethodni mjesec rada, kao i za druge
          zaposlenike Poslodavca.
        </P>
      </Article>

      <Article number={8}>
        <P>
          Ovaj ugovor sklopljen je u četiri (4) istovjetna primjerka, od kojih se
          jedan (1) primjerak uručuje Zaposleniku, a tri (3) primjerka Poslodavac
          zadržava za svoje potrebe (dosije Zaposlenika, obračunska služba i jedan
          primjerak za potrebe državnih organa).
        </P>
      </Article>

      {data.extraNote ? (
        <View style={{ marginTop: 8 }}>
          <P>{data.extraNote}</P>
        </View>
      ) : null}

      <Text style={legalStyles.dateLine}>
        U {data.documentPlace || "___________"}, dana {data.documentDateFormatted}{" "}
        godine.
      </Text>

      <Signatures
        employerName={data.representative || data.orgName}
        employeeName={data.employeeFullName}
      />
    </LegalPage>
  );
}
