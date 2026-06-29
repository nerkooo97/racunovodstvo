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
    fontSize: 8,
    paddingHorizontal: 25,
    paddingVertical: 20,
    color: "#111111",
  },
  header: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingBottom: 5,
  },
  title: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
  },
  subTitle: {
    fontSize: 9,
    textAlign: "center",
    marginTop: 2,
  },
  infoBox: {
    borderWidth: 1,
    borderColor: "#000000",
    padding: 6,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#000000",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingVertical: 4,
    paddingHorizontal: 3,
    fontWeight: "bold",
    fontSize: 7.5,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cccccc",
    paddingVertical: 3,
    paddingHorizontal: 3,
  },
  boldRow: {
    flexDirection: "row",
    backgroundColor: "#fafafa",
    borderTopWidth: 1,
    borderTopColor: "#000000",
    paddingVertical: 4,
    paddingHorizontal: 3,
    fontWeight: "bold",
  },
  colRb: { width: "5%", textAlign: "center" },
  colJmbg: { width: "18%" },
  colIme: { width: "27%" },
  colBruto: { width: "15%", textAlign: "right" },
  colDoprinosi: { width: "15%", textAlign: "right" },
  colPorez: { width: "10%", textAlign: "right" },
  colNeto: { width: "10%", textAlign: "right" },
});

function fmt(n: number) {
  return n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " KM";
}

export interface Obrazac2001Item {
  jmbg: string;
  name: string;
  gross: number;
  contribFrom: number;
  tax: number;
  net: number;
}

export interface Obrazac2001Data {
  orgName: string;
  orgJib: string;
  periodStartStr: string;
  periodEndStr: string;
  items: Obrazac2001Item[];
}

export function Obrazac2001Pdf({ data }: { data: Obrazac2001Data }) {
  let totalGross = 0, totalContrib = 0, totalTax = 0, totalNet = 0;
  data.items.forEach((it) => {
    totalGross += it.gross;
    totalContrib += it.contribFrom;
    totalTax += it.tax;
    totalNet += it.net;
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>OBRAZAC 2001 — Specifikacija uz uplatu doprinosa i poreza</Text>
          <Text style={styles.subTitle}>Mjesečna specifikacija isplata i uplaćenih javnih prihoda za zaposlenike</Text>
        </View>

        <View style={styles.infoBox}>
          <View>
            <Text><Text style={{ fontWeight: "bold" }}>Poslodavac:</Text> {data.orgName}</Text>
            <Text><Text style={{ fontWeight: "bold" }}>JIB poslodavca:</Text> {data.orgJib}</Text>
          </View>
          <View>
            <Text><Text style={{ fontWeight: "bold" }}>Period obračuna:</Text> {data.periodStartStr} — {data.periodEndStr}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colRb}>R.b.</Text>
            <Text style={styles.colJmbg}>JMBG radnika</Text>
            <Text style={styles.colIme}>Ime i prezime radnika</Text>
            <Text style={styles.colBruto}>Bruto plata</Text>
            <Text style={styles.colDoprinosi}>Doprinosi IZ</Text>
            <Text style={styles.colPorez}>Porez</Text>
            <Text style={styles.colNeto}>Neto plata</Text>
          </View>

          {data.items.map((it, idx) => (
            <View key={idx} style={styles.row}>
              <Text style={styles.colRb}>{idx + 1}</Text>
              <Text style={styles.colJmbg}>{it.jmbg}</Text>
              <Text style={styles.colIme}>{it.name}</Text>
              <Text style={styles.colBruto}>{fmt(it.gross)}</Text>
              <Text style={styles.colDoprinosi}>{fmt(it.contribFrom)}</Text>
              <Text style={styles.colPorez}>{fmt(it.tax)}</Text>
              <Text style={styles.colNeto}>{fmt(it.net)}</Text>
            </View>
          ))}

          <View style={styles.boldRow}>
            <Text style={{ width: "50%", fontWeight: "bold" }}>UKUPNO ZA SVE RADNIKE ({data.items.length})</Text>
            <Text style={styles.colBruto}>{fmt(totalGross)}</Text>
            <Text style={styles.colDoprinosi}>{fmt(totalContrib)}</Text>
            <Text style={styles.colPorez}>{fmt(totalTax)}</Text>
            <Text style={styles.colNeto}>{fmt(totalNet)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
