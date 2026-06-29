import { Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { EmployeeDocumentData } from "@/lib/contracts/document-data";
import {
  LegalPage,
  P,
  Signatures,
  legalStyles,
} from "./legal-shared";

interface Props {
  data: EmployeeDocumentData;
}

function Point({
  num,
  children,
}: {
  num: string;
  children: ReactNode;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={legalStyles.paragraph}>
        <Text style={{ fontFamily: "Times New Roman", fontWeight: "bold" }}>
          {num}.{" "}
        </Text>
        {children}
      </Text>
    </View>
  );
}

const DEFAULT_HANDOVER =
  "imovinu, sredstva rada i zaštite zdravlja i sigurnosti na radu, spise i drugo, koje je privremeno izuzeo (ili koji su u radu kod njega)";

export function SporazumniOtkazDocument({ data }: Props) {
  const handoverItems = data.handoverItems.trim() || DEFAULT_HANDOVER;
  const contractSignedDate =
    data.contractSignedDateFormatted || data.hireDateFormatted || "___________";
  const terminationDate =
    data.terminationDateFormatted || data.dateTo || "___________";
  const contractNumber = data.contractNumber || "___________";
  const annualLeaveLabel =
    data.annualLeaveUsage === "remaining"
      ? "preostali dio godišnjeg odmora"
      : "cijeli godišnji odmor";

  const employeeLine = data.jobTitle
    ? `${data.employeeFullName}, ${data.jobTitle}`
    : data.employeeFullName;

  return (
    <LegalPage>
      <Text style={legalStyles.title}>SPORAZUM O PRESTANKU UGOVORA O RADU</Text>

      <Point num="I">
        Radnik {employeeLine} i poslodavac {data.orgName}, sporazumno raskidaju
        Ugovor o radu, broj {contractNumber} od {contractSignedDate} zaključen{" "}
        {data.contractTypeLabel}.
      </Point>

      <Point num="II">
        Ugovor o radu iz tačke I ovog sporazuma raskida se sa danom {terminationDate},
        kada prestaje radni odnos radnika kod poslodavca.
      </Point>

      <Point num="III">
        Radnik je dužan do dana prestanka radnog odnosa izvršiti predaju dužnosti
        drugom radniku kojeg odredi poslodavac, kao i razdužiti {handoverItems}.
      </Point>

      <Point num="IV">
        Do dana određenog u tački II ovog sporazuma radnik će iskoristiti{" "}
        {annualLeaveLabel}.
      </Point>

      <Point num="V">
        Poslodavac se obavezuje da do dana sporazumnog prestanka radnog odnosa
        radniku isplati zarađenu platu, neisplaćene naknade plate
        {data.severancePay
          ? ` i otpremninu u iznosu od ${data.severancePay}`
          : " i otpremninu"}
        , u skladu sa Zakonom o radu, Kolektivnim ugovorom i Pravilnikom o radu.
      </Point>

      <Point num="VI">
        Ovaj sporazum je sačinjen u četiri primjerka, po dva za radnika i
        poslodavca.
      </Point>

      {data.extraNote ? (
        <View style={{ marginTop: 4 }}>
          <P>{data.extraNote}</P>
        </View>
      ) : null}

      <Text style={legalStyles.dateLine}>
        U {data.documentPlace || "___________"}, dana {data.documentDateFormatted}{" "}
        godine.
      </Text>

      <Signatures
        employeeLabel="Radnik"
        employerLabel="Za poslodavca"
        employeeName={data.employeeFullName}
        employerName={data.representative || data.orgName}
      />
    </LegalPage>
  );
}
