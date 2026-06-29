import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

Font.register({
  family: "Helvetica",
  fonts: [],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8.5,
    paddingHorizontal: 30,
    paddingVertical: 25,
    color: "#111111",
  },
  headerTable: {
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#000000",
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    borderBottomStyle: "solid",
  },
  headerCellLeft: {
    width: "50%",
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: "#000000",
    borderRightStyle: "solid",
  },
  headerCellRight: {
    width: "50%",
    padding: 6,
  },
  mainTitle: {
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 6,
    textTransform: "uppercase",
  },
  table: {
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#000000",
    marginBottom: 8,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    borderBottomStyle: "solid",
    paddingVertical: 3,
    paddingHorizontal: 5,
  },
  tableHeaderTitle: {
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#dddddd",
    borderBottomStyle: "solid",
    paddingVertical: 2.5,
    paddingHorizontal: 5,
  },
  boldRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    borderBottomStyle: "solid",
    backgroundColor: "#fafafa",
    paddingVertical: 3.5,
    paddingHorizontal: 5,
  },
  colLabel: {
    width: "70%",
  },
  colValue: {
    width: "30%",
    textAlign: "right",
    fontFamily: "Helvetica",
  },
  boldLabel: {
    width: "70%",
    fontWeight: "bold",
  },
  boldValue: {
    width: "30%",
    textAlign: "right",
    fontWeight: "bold",
  },
  footer: {
    marginTop: 15,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBlock: {
    width: "45%",
    textAlign: "center",
    marginTop: 20,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#000000",
    borderTopStyle: "solid",
    marginTop: 25,
    paddingTop: 3,
    fontSize: 8,
  },
});

export interface PlatniListicData {
  // Poslodavac
  org_name: string;
  org_type?: "obrt" | "doo";
  org_address?: string;
  org_city?: string;
  org_jib?: string;
  // Radnik
  employee_name: string;
  employee_jmbg: string;
  employee_occupation?: string;
  employee_municipality?: string;
  hire_date?: string;
  // Obračunski period
  year: number;
  month: number;
  work_hours?: number;
  // Izračuni
  gross_salary: number;
  pension_contribution: number;
  health_contribution: number;
  unemployment_contribution: number;
  total_contributions_from: number;
  tax_base: number;
  personal_deduction: number;
  taxable_base: number;
  income_tax: number;
  net_salary: number;
  // Naknade radniku
  meal_allowance?: number;
  transport_allowance?: number;
  other_allowances?: number;
  total_payout: number;
  // Doprinosi NA poslodavca
  pension_on: number;
  health_on: number;
  unemployment_on: number;
  total_contributions_on: number;
  water: number;
  disaster: number;
  disability?: number;
  total_employer_cost: number;
  // Datum i mjesto
  date_of_payment?: string;
}

const MONTH_NAMES = [
  "", "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

function fmt(n: number | undefined) {
  if (n === undefined || isNaN(n)) return "0,00 KM";
  return n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " KM";
}

export function PlatniListicPageContent({ data }: { data: PlatniListicData }) {
  const monthName = MONTH_NAMES[data.month] || String(data.month);
  const isObrt = data.org_type === "obrt";

  return (
    <Page size="A4" style={styles.page}>
      {/* Naslov */}
      <Text style={styles.mainTitle}>PLATNI LISTIĆ ZA MJESEC {monthName.toUpperCase()} {data.year}.</Text>

      {/* Zaglavlje info */}
      <View style={styles.headerTable}>
        <View style={styles.headerRow}>
          <View style={styles.headerCellLeft}>
            <Text style={{ fontWeight: "bold", marginBottom: 2 }}>{data.org_name}</Text>
            {data.org_address && <Text>Adresa: {data.org_address}</Text>}
            {data.org_city && <Text>Grad: {data.org_city}</Text>}
            {data.org_jib && <Text>JIB/JMB: {data.org_jib}</Text>}
          </View>
          <View style={styles.headerCellRight}>
            <Text style={{ fontWeight: "bold", marginBottom: 2 }}>ZAPOSLENIK: {data.employee_name}</Text>
            <Text>JMBG: {data.employee_jmbg}</Text>
            {data.employee_occupation && <Text>Zanimanje: {data.employee_occupation}</Text>}
            {data.employee_municipality && <Text>Općina prebivališta: {data.employee_municipality}</Text>}
            {data.hire_date && <Text>Datum prijave: {data.hire_date}</Text>}
          </View>
        </View>
      </View>

      {/* 1. Obračunato vrijeme */}
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text style={styles.tableHeaderTitle}>1. Obračunato vrijeme</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.colLabel}>Redovni rad (sati)</Text>
          <Text style={styles.colValue}>{data.work_hours ?? 176} sati</Text>
        </View>
      </View>

      {/* 2. Obračun plate */}
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text style={styles.tableHeaderTitle}>2. Obračun plate</Text>
        </View>
        <View style={styles.boldRow}>
          <Text style={styles.boldLabel}>Bruto plata</Text>
          <Text style={styles.boldValue}>{fmt(data.gross_salary)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.colLabel}>PIO/MIO (17%)</Text>
          <Text style={styles.colValue}>{fmt(data.pension_contribution)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.colLabel}>Zdravstveno osiguranje (12,5%)</Text>
          <Text style={styles.colValue}>{fmt(data.health_contribution)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.colLabel}>Osiguranje od nezaposlenosti (1,5%)</Text>
          <Text style={styles.colValue}>{fmt(data.unemployment_contribution)}</Text>
        </View>
        <View style={styles.boldRow}>
          <Text style={styles.boldLabel}>Ukupno doprinosa iz plate (31%)</Text>
          <Text style={styles.boldValue}>{fmt(data.total_contributions_from)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.colLabel}>Poreska osnovica</Text>
          <Text style={styles.colValue}>{fmt(data.tax_base)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.colLabel}>Lični odbitak</Text>
          <Text style={styles.colValue}>{fmt(data.personal_deduction)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.colLabel}>Oporeziva osnovica</Text>
          <Text style={styles.colValue}>{fmt(data.taxable_base)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.colLabel}>Porez na dohodak (10%)</Text>
          <Text style={styles.colValue}>{fmt(data.income_tax)}</Text>
        </View>
        <View style={styles.boldRow}>
          <Text style={styles.boldLabel}>NETO PLATA</Text>
          <Text style={styles.boldValue}>{fmt(data.net_salary)}</Text>
        </View>
      </View>

      {/* 3. Naknade radniku */}
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text style={styles.tableHeaderTitle}>3. Naknade radniku</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.colLabel}>Topli obrok</Text>
          <Text style={styles.colValue}>{fmt(data.meal_allowance ?? 0)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.colLabel}>Naknada za prevoz</Text>
          <Text style={styles.colValue}>{fmt(data.transport_allowance ?? 0)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.colLabel}>Ostale naknade / Regres</Text>
          <Text style={styles.colValue}>{fmt(data.other_allowances ?? 0)}</Text>
        </View>
        <View style={styles.boldRow}>
          <Text style={styles.boldLabel}>UKUPNO ZA ISPLATU</Text>
          <Text style={styles.boldValue}>{fmt(data.total_payout)}</Text>
        </View>
      </View>

      {/* 4. Obaveze poslodavca */}
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text style={styles.tableHeaderTitle}>4. Obaveze poslodavca</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.colLabel}>{isObrt ? "PIO/MIO na platu (2,5%)" : "PIO/MIO na platu (6%)"}</Text>
          <Text style={styles.colValue}>{fmt(data.pension_on)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.colLabel}>{isObrt ? "Zdravstveno osiguranje na platu (2%)" : "Zdravstveno osiguranje na platu (4%)"}</Text>
          <Text style={styles.colValue}>{fmt(data.health_on)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.colLabel}>Osiguranje od nezaposlenosti na platu (0,5%)</Text>
          <Text style={styles.colValue}>{fmt(data.unemployment_on)}</Text>
        </View>
        <View style={styles.boldRow}>
          <Text style={styles.boldLabel}>{isObrt ? "Ukupno doprinosa na platu (5%)" : "Ukupno doprinosa na platu (10,5%)"}</Text>
          <Text style={styles.boldValue}>{fmt(data.total_contributions_on)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.colLabel}>Opća vodna naknada (0,5%)</Text>
          <Text style={styles.colValue}>{fmt(data.water)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.colLabel}>Naknada za zaštitu od nesreća (0,5%)</Text>
          <Text style={styles.colValue}>{fmt(data.disaster)}</Text>
        </View>
        {!isObrt && (
          <View style={styles.row}>
            <Text style={styles.colLabel}>Fond za rehabilitaciju OSI (0,5%)</Text>
            <Text style={styles.colValue}>{fmt(data.disability ?? 0)}</Text>
          </View>
        )}
        <View style={styles.boldRow}>
          <Text style={styles.boldLabel}>UKUPAN TROŠAK POSLODAVCA</Text>
          <Text style={styles.boldValue}>{fmt(data.total_employer_cost)}</Text>
        </View>
      </View>

      {/* Potpisi */}
      <View style={styles.footer}>
        <View style={styles.signatureBlock}>
          <Text style={styles.signatureLine}>Potpis zaposlenika</Text>
        </View>
        <View style={styles.signatureBlock}>
          <Text style={styles.signatureLine}>Za obveznika uplate / M.P.</Text>
        </View>
      </View>
    </Page>
  );
}

export function PlatniListic({ data }: { data: PlatniListicData }) {
  return (
    <Document>
      <PlatniListicPageContent data={data} />
    </Document>
  );
}

export function PlatniListicList({ items }: { items: PlatniListicData[] }) {
  return (
    <Document>
      {items.map((data, idx) => (
        <PlatniListicPageContent key={idx} data={data} />
      ))}
    </Document>
  );
}
