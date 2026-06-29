import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import path from "path";

const fontDir = path.join(process.cwd(), "public", "fonts");

Font.register({
  family: "Times New Roman",
  fonts: [
    {
      src: path.join(fontDir, "Times-Regular.ttf"),
      fontWeight: "normal",
    },
    {
      src: path.join(fontDir, "Times-Bold.ttf"),
      fontWeight: "bold",
    },
    {
      src: path.join(fontDir, "Times-Italic.ttf"),
      fontWeight: "normal",
      fontStyle: "italic",
    },
  ],
});

export interface Js3100PdfData {
  appType: string; // "prijava" | "promjena" | "odjava"
  appDate: string;
  // Poslodavac
  jib: string;
  opcinaSifra?: string;
  orgName: string;
  orgAddr: string;
  orgCity: string;
  orgPhone: string;
  orgEmail: string;
  // Radnik
  jmbg: string;
  lastName: string;
  firstName: string;
  maidenName: string;
  dob: string;
  gender: string;
  address: string;
  opcinaPrebivalistaSifra?: string;
  contactAddr: string;
  contactCityZip: string;
  empEmail: string;
  eduLevel: string;
  // Osiguranje
  workHours: string;
  workMins: string;
  insCode: string;
  insName: string;
  occCode: string;
  occName: string;
  requiredEdu: string;
  changeDate: string;
  changeNote: string;
  payBasisCode: string;
  payBasisName: string;
  jobPosCode: string;
  partTimeNum: string;
  partTimeDen: string;
  // Lice koje je popunilo
  fillerName: string;
  fillerPhone: string;
  fillDate: string;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Times New Roman",
    fontSize: 7.5,
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 18,
    color: "#000",
  },
  // Top Header
  headerContainer: {
    flexDirection: "row",
    border: "1.8 solid #000",
    marginBottom: 4,
  },
  headerLeft: {
    width: "38%",
    borderRight: "1 solid #000",
    padding: 3,
    justifyContent: "center",
  },
  headerLeftTextBold: {
    fontSize: 8.5,
    fontWeight: "bold",
    textAlign: "center",
  },
  headerLeftText: {
    fontSize: 8,
    textAlign: "center",
  },
  headerCenter: {
    width: "42%",
    borderRight: "1 solid #000",
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenterTitle: {
    fontSize: 11,
    fontWeight: "bold",
  },
  headerCenterSub: {
    fontSize: 9.5,
    fontWeight: "bold",
    marginTop: 2,
  },
  headerRight: {
    width: "20%",
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  barKodText: {
    fontSize: 9,
    fontStyle: "italic",
  },
  // Section Header
  sectionHeader: {
    backgroundColor: "#ffffff",
    border: "1.8 solid #000",
    paddingVertical: 2,
    paddingHorizontal: 4,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 8.5,
    marginBottom: -1.8, // border collapse
    zIndex: 1,
  },
  tableBlock: {
    border: "1.8 solid #000",
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #000",
    minHeight: 15,
  },
  tableRowLast: {
    flexDirection: "row",
    minHeight: 15,
  },
  rowNumCol: {
    width: "4%",
    borderRight: "1 solid #000",
    justifyContent: "center",
    alignItems: "center",
  },
  rowNumText: {
    fontSize: 8,
    fontWeight: "bold",
  },
  cellText: {
    fontSize: 7.5,
  },
  cellBoldText: {
    fontSize: 8,
    fontWeight: "bold",
  },
  digitBoxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  digitBox: {
    width: 11,
    height: 12.5,
    border: "0.8 solid #000",
    marginRight: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  digitText: {
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
  },
  checkboxBox: {
    width: 9.5,
    height: 9.5,
    border: "0.8 solid #000",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 3,
    backgroundColor: "#fff",
  },
  checkboxCheck: {
    fontSize: 7.5,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: -0.5,
  },
  checkboxLabel: {
    fontSize: 7.5,
    marginRight: 5,
  },
});

// Helper to render string into individual digit boxes
function RenderDigitBoxes({ value, length }: { value: string; length: number }) {
  const cleanVal = (value || "").replace(/\D/g, "");
  const boxes = [];
  for (let i = 0; i < length; i++) {
    const char = cleanVal[i] || "";
    boxes.push(
      <View key={i} style={styles.digitBox}>
        <Text style={styles.digitText}>{char}</Text>
      </View>
    );
  }
  return <View style={styles.digitBoxContainer}>{boxes}</View>;
}

// Helper for date formatted as DD MM YYYY in boxes
function RenderDateBoxes({ dateStr }: { dateStr: string }) {
  let day = "", month = "", year = "";
  if (dateStr && dateStr.includes("-")) {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      year = parts[0];
      month = parts[1];
      day = parts[2];
    }
  } else if (dateStr && dateStr.includes(".")) {
    const parts = dateStr.split(".");
    if (parts.length >= 3) {
      day = parts[0];
      month = parts[1];
      year = parts[2];
    }
  }

  const format2 = (s: string) => (s || "").replace(/\D/g, "").padStart(2, "0").slice(-2);
  const format4 = (s: string) => (s || "").replace(/\D/g, "").padStart(4, "0").slice(-4);

  const d = dateStr ? format2(day) : "";
  const m = dateStr ? format2(month) : "";
  const y = dateStr ? format4(year) : "";

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <RenderDigitBoxes value={d} length={2} />
      <Text style={{ marginHorizontal: 2, fontSize: 8 }}>/</Text>
      <RenderDigitBoxes value={m} length={2} />
      <Text style={{ marginHorizontal: 2, fontSize: 8 }}>/</Text>
      <RenderDigitBoxes value={y} length={4} />
    </View>
  );
}

// Helper for Checkbox item
function CheckboxItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginRight: 4 }}>
      <View style={styles.checkboxBox}>
        <Text style={styles.checkboxCheck}>{checked ? "X" : ""}</Text>
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </View>
  );
}

// Helper for matching education levels
function isEduMatch(selected: string, key: string) {
  if (!selected) return false;
  const s = selected.trim().toUpperCase();
  const k = key.trim().toUpperCase();

  if (k === "DR") return s.includes("DR") || s.includes("DOKTOR");
  if (k === "MR") return s.includes("MR") || s.includes("MAGISTAR") || s.includes("MASTER");
  if (k === "VSS") return (s.includes("VSS") || s.includes("VISOKA")) && !s.includes("VŠS") && !s.includes("VISA") && !s.includes("VIŠA");
  if (k === "VŠS") return s.includes("VŠS") || s.includes("VISA") || s.includes("VIŠA");
  if (k === "SSS") return s.includes("SSS") || s.includes("SREDNJA");
  if (k === "NIŽA") return s.includes("NIŽA") || s.includes("NIZA");
  if (k === "VKV") return s.includes("VKV") || s.includes("VISOKOKVALIFIKOVANI");
  if (k === "KV") return (s.includes("KV") || s.includes("KVALIFIKOVANI")) && !s.includes("VKV") && !s.includes("PKV") && !s.includes("NKV") && !s.includes("NEKVALIFIKOVANI") && !s.includes("POLUKVALIFIKOVANI") && !s.includes("VISOKOKVALIFIKOVANI");
  if (k === "PK") return s.includes("PK") || s.includes("PKV") || s.includes("POLUKVALIFIKOVANI");
  if (k === "NK") return s.includes("NK") || s.includes("NKV") || s.includes("NEKVALIFIKOVANI") || s.includes("OŠ") || s.includes("OSNOVNA");

  return s === k;
}

export function Js3100Pdf({ data }: { data: Js3100PdfData }) {
  const eduOptions = [
    { key: "DR", label: "DR" },
    { key: "MR", label: "MR" },
    { key: "VSS", label: "VSS" },
    { key: "VŠS", label: "VŠS" },
    { key: "SSS", label: "SSS" },
    { key: "Niža", label: "Niža" },
    { key: "VKV", label: "VKV" },
    { key: "KV", label: "KV" },
    { key: "PK", label: "PK" },
    { key: "NK", label: "NK" },
  ];

  // Application Type matching
  const normalizedAppType = (data.appType || "").toLowerCase();
  const isPrijava = normalizedAppType === "prijava" || (normalizedAppType.includes("prijav") && !normalizedAppType.includes("odjav") && !normalizedAppType.includes("promjen"));
  const isPromjena = normalizedAppType === "promjena" || normalizedAppType.includes("promjen");
  const isOdjava = normalizedAppType === "odjava" || normalizedAppType.includes("odjav");

  // Gender matching
  const g = (data.gender || "").toUpperCase();
  const isFemale = g === "F" || g.startsWith("Ž") || g.startsWith("Z");
  const isMale = g === "M" || g.startsWith("M");

  // Work hours & mins formatting
  const formattedWorkHours = data.workHours ? String(data.workHours).padStart(2, "0") : "08";
  const formattedWorkMins = data.workMins ? String(data.workMins).padStart(2, "0") : "00";

  // Extract postal code and city name for Contact City Zip
  const postalCodeDigits = (data.contactCityZip || "").replace(/\D/g, "").slice(0, 5);
  const cityNameOnly = (data.contactCityZip || "").replace(/[0-9()]/g, "").trim();

  return (
    <Document title={`Obrazac_JS3100_${data.lastName}_${data.firstName}`}>
      <Page size="A4" style={styles.page}>
        {/* TOP HEADER */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerLeftTextBold}>Federacija Bosne i Hercegovine</Text>
            <Text style={styles.headerLeftTextBold}>Federalno ministarstvo finansija/financija</Text>
            <Text style={styles.headerLeftText}>Porezna uprava</Text>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.headerCenterTitle}>Obrazac JS3100</Text>
            <Text style={styles.headerCenterSub}>Prijava/Promjena/Odjava osiguranja</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.barKodText}>Bar kod</Text>
          </View>
        </View>

        {/* PRVI DIO – PODACI O OBVEZNIKU UPLATE DOPRINOSA */}
        <Text style={styles.sectionHeader}>Prvi dio – Podaci o obvezniku uplate doprinosa</Text>
        <View style={styles.tableBlock}>
          {/* Row 1: JIB, Sifra opcine, Vrsta prijave */}
          <View style={styles.tableRow}>
            <View style={{ width: "52%", borderRight: "1 solid #000", padding: 3 }}>
              <Text style={styles.cellText}>1) JIB/JMB</Text>
              <View style={{ marginTop: 2 }}>
                <RenderDigitBoxes value={data.jib} length={13} />
              </View>
            </View>
            <View style={{ width: "18%", borderRight: "1 solid #000", padding: 3 }}>
              <Text style={styles.cellText}>5) Šifra općine</Text>
              <View style={{ marginTop: 2 }}>
                <RenderDigitBoxes value={data.opcinaSifra || ""} length={3} />
              </View>
            </View>
            <View style={{ width: "30%", padding: 3 }}>
              <Text style={styles.cellText}>6) Vrsta prijave</Text>
              <View style={{ marginTop: 2, gap: 1.5 }}>
                <CheckboxItem label="Prijava osiguranja" checked={isPrijava} />
                <CheckboxItem label="Promjena podataka o osiguranju" checked={isPromjena} />
                <CheckboxItem label="Odjava osiguranja" checked={isOdjava} />
              </View>
            </View>
          </View>

          {/* Row 2: Naziv obveznika */}
          <View style={styles.tableRow}>
            <View style={{ width: "100%", padding: 3 }}>
              <Text style={styles.cellText}>
                2) Naziv obveznika uplate doprinosa: <Text style={styles.cellBoldText}>{data.orgName}</Text>
              </Text>
            </View>
          </View>

          {/* Row 3: Adresa i Telefon */}
          <View style={styles.tableRow}>
            <View style={{ width: "70%", borderRight: "1 solid #000", padding: 3 }}>
              <Text style={styles.cellText}>
                3) Adresa obveznika uplate doprinosa: <Text style={styles.cellBoldText}>{data.orgAddr}</Text>
              </Text>
            </View>
            <View style={{ width: "30%", padding: 3 }}>
              <Text style={styles.cellText}>
                7) Telefon: <Text style={styles.cellBoldText}>{data.orgPhone}</Text>
              </Text>
            </View>
          </View>

          {/* Row 4: Grad i Email */}
          <View style={styles.tableRowLast}>
            <View style={{ width: "70%", borderRight: "1 solid #000", padding: 3 }}>
              <Text style={styles.cellText}>
                4) Grad i poštanski broj: <Text style={styles.cellBoldText}>{data.orgCity}</Text>
              </Text>
            </View>
            <View style={{ width: "30%", padding: 3 }}>
              <Text style={styles.cellText}>
                8) E-mail: <Text style={styles.cellBoldText}>{data.orgEmail}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* DRUGI DIO – PODACI O OSIGURANIKU */}
        <Text style={styles.sectionHeader}>Drugi dio – Podaci o osiguraniku</Text>
        <View style={styles.tableBlock}>
          {/* Row 1: JMBG */}
          <View style={styles.tableRow}>
            <View style={styles.rowNumCol}><Text style={styles.rowNumText}>1</Text></View>
            <View style={{ width: "42%", borderRight: "1 solid #000", padding: 3 }}>
              <Text style={styles.cellText}>JMB ili lični identifikacioni broj (za strance)</Text>
            </View>
            <View style={{ width: "54%", padding: 3 }}>
              <RenderDigitBoxes value={data.jmbg} length={13} />
            </View>
          </View>

          {/* Row 2: Prezime i ime */}
          <View style={styles.tableRow}>
            <View style={styles.rowNumCol}><Text style={styles.rowNumText}>2</Text></View>
            <View style={{ width: "42%", borderRight: "1 solid #000", padding: 3 }}>
              <Text style={styles.cellText}>Prezime i ime osiguranika</Text>
            </View>
            <View style={{ width: "54%", padding: 3 }}>
              <Text style={styles.cellBoldText}>{data.lastName} {data.firstName}</Text>
            </View>
          </View>

          {/* Row 3: Djevojačko prezime */}
          <View style={styles.tableRow}>
            <View style={styles.rowNumCol}><Text style={styles.rowNumText}>3</Text></View>
            <View style={{ width: "42%", borderRight: "1 solid #000", padding: 3 }}>
              <Text style={styles.cellText}>Djevojačko prezime</Text>
            </View>
            <View style={{ width: "54%", padding: 3 }}>
              <Text style={styles.cellBoldText}>{data.maidenName || ""}</Text>
            </View>
          </View>

          {/* Row 4: Datum rodjenja */}
          <View style={styles.tableRow}>
            <View style={styles.rowNumCol}><Text style={styles.rowNumText}>4</Text></View>
            <View style={{ width: "42%", borderRight: "1 solid #000", padding: 3 }}>
              <Text style={styles.cellText}>Datum rođenja</Text>
            </View>
            <View style={{ width: "54%", padding: 3 }}>
              <RenderDateBoxes dateStr={data.dob} />
            </View>
          </View>

          {/* Row 5: Spol */}
          <View style={styles.tableRow}>
            <View style={styles.rowNumCol}><Text style={styles.rowNumText}>5</Text></View>
            <View style={{ width: "42%", borderRight: "1 solid #000", padding: 3 }}>
              <Text style={styles.cellText}>Spol</Text>
            </View>
            <View style={{ width: "54%", padding: 3, flexDirection: "row", alignItems: "center" }}>
              <CheckboxItem label="Ženski:" checked={isFemale} />
              <View style={{ width: 30 }} />
              <CheckboxItem label="Muški:" checked={isMale} />
            </View>
          </View>

          {/* Row 6: Adresa prebivalista */}
          <View style={styles.tableRow}>
            <View style={styles.rowNumCol}><Text style={styles.rowNumText}>6</Text></View>
            <View style={{ width: "42%", borderRight: "1 solid #000", padding: 3 }}>
              <Text style={styles.cellText}>Adresa prebivališta</Text>
            </View>
            <View style={{ width: "54%", padding: 3 }}>
              <Text style={styles.cellBoldText}>{data.address}</Text>
            </View>
          </View>

          {/* Row 7: Opcina prebivalista */}
          <View style={styles.tableRow}>
            <View style={styles.rowNumCol}><Text style={styles.rowNumText}>7</Text></View>
            <View style={{ width: "42%", borderRight: "1 solid #000", padding: 3 }}>
              <Text style={styles.cellText}>Općina prebivališta</Text>
            </View>
            <View style={{ width: "54%", padding: 3, flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 7.5, marginRight: 6 }}>Šifra općine:</Text>
              <RenderDigitBoxes value={data.opcinaPrebivalistaSifra || ""} length={3} />
            </View>
          </View>

          {/* Row 8: Kontakt adresa ulica i broj */}
          <View style={styles.tableRow}>
            <View style={styles.rowNumCol}><Text style={styles.rowNumText}>8</Text></View>
            <View style={{ width: "42%", borderRight: "1 solid #000", padding: 3 }}>
              <Text style={styles.cellText}>Kontakt adresa – ulica i broj{"\n"}(ako se razlikuje od adrese prebivališta)</Text>
            </View>
            <View style={{ width: "54%", padding: 3 }}>
              <Text style={styles.cellBoldText}>{data.contactAddr || ""}</Text>
            </View>
          </View>

          {/* Row 9: Kontakt adresa postanski broj i mjesto */}
          <View style={styles.tableRow}>
            <View style={styles.rowNumCol}><Text style={styles.rowNumText}>9</Text></View>
            <View style={{ width: "42%", borderRight: "1 solid #000", padding: 3 }}>
              <Text style={styles.cellText}>Kontakt adresa – Poštanski broj i mjesto{"\n"}(ako se razlikuje od adrese prebivališta)</Text>
            </View>
            <View style={{ width: "54%", padding: 3, flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 7.5, marginRight: 4 }}>Poštanski broj :</Text>
              <RenderDigitBoxes value={postalCodeDigits} length={5} />
              <Text style={{ fontSize: 7.5, marginLeft: 8, marginRight: 4 }}>Mjesto:</Text>
              <Text style={styles.cellBoldText}>{cityNameOnly}</Text>
            </View>
          </View>

          {/* Row 10: Email adresa */}
          <View style={styles.tableRow}>
            <View style={styles.rowNumCol}><Text style={styles.rowNumText}>10</Text></View>
            <View style={{ width: "42%", borderRight: "1 solid #000", padding: 3 }}>
              <Text style={styles.cellText}>E-mail adresa</Text>
            </View>
            <View style={{ width: "54%", padding: 3 }}>
              <Text style={styles.cellBoldText}>{data.empEmail || ""}</Text>
            </View>
          </View>

          {/* Row 11: Strucna sprema */}
          <View style={styles.tableRowLast}>
            <View style={styles.rowNumCol}><Text style={styles.rowNumText}>11</Text></View>
            <View style={{ width: "42%", borderRight: "1 solid #000", padding: 3 }}>
              <Text style={styles.cellText}>Stručna sprema</Text>
            </View>
            <View style={{ width: "54%", padding: 3, flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
              {eduOptions.map((opt) => (
                <CheckboxItem
                  key={opt.key}
                  label={opt.label}
                  checked={isEduMatch(data.eduLevel, opt.key)}
                />
              ))}
            </View>
          </View>
        </View>

        {/* TREĆI DIO – PODACI O OSIGURANJU */}
        <Text style={styles.sectionHeader}>Treći dio – Podaci o osiguranju</Text>
        <View style={styles.tableBlock}>
          {/* Row 1: Dnevno radno vrijeme */}
          <View style={styles.tableRow}>
            <View style={styles.rowNumCol}><Text style={styles.rowNumText}>1</Text></View>
            <View style={{ width: "42%", borderRight: "1 solid #000", padding: 3 }}>
              <Text style={styles.cellText}>Dnevno radno vrijeme</Text>
            </View>
            <View style={{ width: "54%", padding: 3, flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 7.5, marginRight: 4 }}>Sati:</Text>
              <RenderDigitBoxes value={formattedWorkHours} length={2} />
              <Text style={{ fontSize: 7.5, marginLeft: 12, marginRight: 4 }}>Minuta:</Text>
              <RenderDigitBoxes value={formattedWorkMins} length={2} />
            </View>
          </View>

          {/* Row 2: Osnov osiguranja */}
          <View style={styles.tableRow}>
            <View style={styles.rowNumCol}><Text style={styles.rowNumText}>2</Text></View>
            <View style={{ width: "42%", borderRight: "1 solid #000", padding: 3 }}>
              <Text style={styles.cellText}>Osnov osiguranja</Text>
            </View>
            <View style={{ width: "54%", padding: 3, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={[styles.cellBoldText, { width: "75%" }]}>{data.insName || ""}</Text>
              <RenderDigitBoxes value={data.insCode || ""} length={2} />
            </View>
          </View>

          {/* Row 3: Zanimanje */}
          <View style={styles.tableRow}>
            <View style={styles.rowNumCol}><Text style={styles.rowNumText}>3</Text></View>
            <View style={{ width: "42%", borderRight: "1 solid #000", padding: 3 }}>
              <Text style={styles.cellText}>Zanimanje</Text>
            </View>
            <View style={{ width: "54%", padding: 3, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={[styles.cellBoldText, { width: "55%" }]}>{data.occName || ""}</Text>
              <RenderDigitBoxes value={data.occCode || ""} length={7} />
            </View>
          </View>

          {/* Row 4: Strucna sprema tražena na radnom mjestu */}
          <View style={styles.tableRow}>
            <View style={styles.rowNumCol}><Text style={styles.rowNumText}>4</Text></View>
            <View style={{ width: "42%", borderRight: "1 solid #000", padding: 3 }}>
              <Text style={styles.cellText}>Stručna sprema koja se traži na radnom mjestu</Text>
            </View>
            <View style={{ width: "54%", padding: 3, flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
              {eduOptions.map((opt) => (
                <CheckboxItem
                  key={opt.key}
                  label={opt.label}
                  checked={isEduMatch(data.requiredEdu, opt.key)}
                />
              ))}
            </View>
          </View>

          {/* Row 5: Datum prijave/odjave/promjene */}
          <View style={styles.tableRow}>
            <View style={styles.rowNumCol}><Text style={styles.rowNumText}>5</Text></View>
            <View style={{ width: "42%", borderRight: "1 solid #000", padding: 3 }}>
              <Text style={styles.cellText}>Datum prijave/odjave/promjene osiguranja</Text>
            </View>
            <View style={{ width: "54%", padding: 3 }}>
              <RenderDateBoxes dateStr={data.changeDate || data.appDate} />
            </View>
          </View>

          {/* Row 6: Osnov za uplatu doprinosa */}
          <View style={styles.tableRow}>
            <View style={styles.rowNumCol}><Text style={styles.rowNumText}>6</Text></View>
            <View style={{ width: "42%", borderRight: "1 solid #000", padding: 3 }}>
              <Text style={styles.cellText}>Osnov za uplatu doprinosa</Text>
            </View>
            <View style={{ width: "54%", padding: 3, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={[styles.cellBoldText, { width: "75%" }]}>{data.payBasisName || ""}</Text>
              <RenderDigitBoxes value={data.payBasisCode || ""} length={2} />
            </View>
          </View>

          {/* Row 7: Staz sa uvecanim trajanjem */}
          <View style={styles.tableRowLast}>
            <View style={styles.rowNumCol}><Text style={styles.rowNumText}>7</Text></View>
            <View style={{ width: "42%", borderRight: "1 solid #000", padding: 3 }}>
              <Text style={styles.cellText}>Staž sa uvećanim trajanjem</Text>
            </View>
            <View style={{ width: "54%", padding: 3, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 7.5, marginRight: 4 }}>Šifra radnog mjesta</Text>
                <RenderDigitBoxes value={data.jobPosCode || ""} length={4} />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 7.5, marginRight: 4 }}>Stepen uvećanja</Text>
                <RenderDigitBoxes value={data.partTimeNum || ""} length={2} />
                <Text style={{ fontSize: 8, marginHorizontal: 2 }}>/12</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ČETVRTI DIO – POTVRDA I PRIJEM */}
        <Text style={styles.sectionHeader}>Četvrti dio – Potvrda i prijem</Text>
        <View style={[styles.tableBlock, { flexDirection: "row", minHeight: 88 }]}>
          {/* Left Column: Ovjera predstavnika obveznika */}
          <View style={{ width: "65%", borderRight: "1 solid #000", padding: 4 }}>
            <Text style={{ fontSize: 8, fontWeight: "bold", textAlign: "center", marginBottom: 4 }}>
              Ovjera predstavnika obveznika uplate doprinosa
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontSize: 7.5 }}>Potpis podnosioca prijave: ___________________</Text>
              <Text style={{ fontSize: 7.5 }}>Datum: ____________</Text>
            </View>
            <View style={{ marginBottom: 3 }}>
              <Text style={{ fontSize: 7.5 }}>
                Ime i prezime lica koje je popunilo prijavu: <Text style={styles.cellBoldText}>{data.fillerName}</Text>
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
              <Text style={{ fontSize: 7.5 }}>Potpis lica koje je popunilo prijavu: ___________________</Text>
              <Text style={{ fontSize: 7.5 }}>Datum: <Text style={styles.cellBoldText}>{data.fillDate}</Text></Text>
            </View>
            <View style={{ marginBottom: 3 }}>
              <Text style={{ fontSize: 7.5 }}>
                Telefonski broj lica koje je popunilo prijavu: <Text style={styles.cellBoldText}>{data.fillerPhone}</Text>
              </Text>
            </View>
            <View style={{ borderTop: "0.5 solid #888", paddingTop: 2 }}>
              <Text style={{ fontSize: 6.3, color: "#333", fontStyle: "italic" }}>
                Odgovornost lica koje je popunilo prijavu: Izjavljujem da sam pregledao/la ovu prijavu i da su uneseni podaci, po mom najboljem znanju i vjerovanju, vjerodostojni, tačni i potpuni.
              </Text>
            </View>
          </View>

          {/* Right Column: Ovjera prijema u Poreznoj upravi */}
          <View style={{ width: "35%", padding: 4, justifyContent: "space-between" }}>
            <View>
              <Text style={{ fontSize: 8, fontWeight: "bold", textAlign: "center", marginBottom: 4 }}>
                Ovjera prijema u Poreznoj upravi
              </Text>
              <Text style={{ fontSize: 7.5, marginBottom: 10 }}>Ime i prezime službenika Porezne uprave:</Text>
              <Text style={{ fontSize: 7.5, marginBottom: 10 }}>Potpis službenika Porezne uprave:</Text>
            </View>
            <View>
              <Text style={{ fontSize: 7.5, textAlign: "center", color: "#666" }}>MP</Text>
              <Text style={{ fontSize: 7.5, marginTop: 6 }}>Datum prijema prijave: ____________</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
