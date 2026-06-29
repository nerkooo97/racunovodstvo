import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { JournalEntry } from "@/lib/calculations/salary";

Font.register({
  family: "Helvetica",
  fonts: [],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingHorizontal: 35,
    paddingVertical: 30,
    color: "#111111",
  },
  header: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 10,
    color: "#444444",
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#000000",
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cccccc",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  boldRow: {
    flexDirection: "row",
    backgroundColor: "#f9f9f9",
    borderTopWidth: 1,
    borderTopColor: "#000000",
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontWeight: "bold",
  },
  colKonto: { width: "15%", fontWeight: "bold" },
  colOpis: { width: "45%" },
  colDuguje: { width: "20%", textAlign: "right" },
  colPotrazuje: { width: "20%", textAlign: "right" },
});

function fmt(n: number) {
  return n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " KM";
}

export interface NalogKnjizenjeData {
  orgName: string;
  year: number;
  month: number;
  entries: JournalEntry[];
}

const MONTH_NAMES = [
  "", "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

export function NalogKnjizenjePdf({ data }: { data: NalogKnjizenjeData }) {
  const monthName = MONTH_NAMES[data.month] || String(data.month);
  let totalDuguje = 0;
  let totalPotrazuje = 0;

  data.entries.forEach((e) => {
    totalDuguje += e.duguje;
    totalPotrazuje += e.potrazuje;
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>NALOG ZA KNJIŽENJE — OBRAČUN PLATA</Text>
          <Text style={styles.subTitle}>Organizacija: {data.orgName} · Period: {monthName} {data.year}. god.</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colKonto}>Konto</Text>
            <Text style={styles.colOpis}>Naziv konta / Opis knjiženja</Text>
            <Text style={styles.colDuguje}>DUGUJE</Text>
            <Text style={styles.colPotrazuje}>POTRAŽUJE</Text>
          </View>

          {data.entries.map((e, index) => (
            <View key={index} style={styles.row}>
              <Text style={styles.colKonto}>{e.konto}</Text>
              <Text style={styles.colOpis}>{e.opis}</Text>
              <Text style={styles.colDuguje}>{e.duguje > 0 ? fmt(e.duguje) : "—"}</Text>
              <Text style={styles.colPotrazuje}>{e.potrazuje > 0 ? fmt(e.potrazuje) : "—"}</Text>
            </View>
          ))}

          <View style={styles.boldRow}>
            <Text style={{ width: "60%", fontWeight: "bold" }}>UKUPNO KNJIŽENJE (BALANS)</Text>
            <Text style={styles.colDuguje}>{fmt(totalDuguje)}</Text>
            <Text style={styles.colPotrazuje}>{fmt(totalPotrazuje)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
