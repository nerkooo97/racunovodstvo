import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import path from "path";

// Register custom Times New Roman font for correct Bosnian char support
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

const styles = StyleSheet.create({
  page: {
    fontFamily: "Times New Roman",
    fontSize: 6,
    paddingHorizontal: 20,
    paddingVertical: 20,
    color: "#000000",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingBottom: 5,
  },
  headerLeft: {
    width: "60%",
  },
  headerRight: {
    width: "40%",
    textAlign: "right",
    alignItems: "flex-end",
  },
  metaText: {
    fontSize: 7,
    marginBottom: 2,
  },
  metaLabel: {
    fontWeight: "bold",
  },
  title: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 7,
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: 5,
  },
  table: {
    width: "100%",
    borderWidth: 0.5,
    borderColor: "#000000",
  },
  tableHeaderGroup: {
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
  },
  tableHeaderCell: {
    paddingVertical: 3,
    paddingHorizontal: 1,
    textAlign: "center",
    justifyContent: "center",
    borderRightWidth: 0.5,
    borderRightColor: "#000000",
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cccccc",
  },
  tableRowLast: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#000000",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    backgroundColor: "#fafafa",
    fontWeight: "bold",
  },
  tableCell: {
    paddingVertical: 3,
    paddingHorizontal: 2,
    borderRightWidth: 0.5,
    borderRightColor: "#cccccc",
    justifyContent: "center",
  },
  tableCellLast: {
    paddingVertical: 3,
    paddingHorizontal: 2,
    justifyContent: "center",
  },
  colRbr: { width: "2.5%", textAlign: "center" },
  colDatum: { width: "7.5%", textAlign: "center" },
  colDokument: { width: "9.5%" },
  colOpis: { width: "11.5%" },
  colAmount: { width: "6.3%", textAlign: "right" },
  
  colSpanHeaderPrihodi: {
    width: "31.5%", // 5 columns * 6.3%
    textAlign: "center",
  },
  colSpanHeaderRashodi: {
    width: "37.8%", // 6 columns * 6.3%
    textAlign: "center",
  },
  
  footer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6,
    borderTopWidth: 0.5,
    borderTopColor: "#aaaaaa",
    paddingTop: 3,
  },
});

function fmt(n: number | undefined): string {
  if (n === undefined || n === null || isNaN(n) || n === 0) return "—";
  return n.toLocaleString("bs-BA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export interface Kpr1041Entry {
  entry_number: number;
  entry_date: string;
  document_type: string;
  document_number: string | null;
  partner_name: string | null;
  description: string | null;
  
  income_cash?: number;
  income_bank?: number;
  income_other?: number;
  income_vat?: number;
  income_total?: number;
  
  expense_goods?: number;
  expense_salaries?: number;
  expense_contribs?: number;
  expense_other?: number;
  expense_vat?: number;
  expense_total?: number;
}

export interface Kpr1041Data {
  year: number;
  orgName: string;
  orgJib: string;
  orgAddress: string;
  orgActivity: string;
  orgCity: string;
  entries: Kpr1041Entry[];
}

export function Kpr1041Document({ data }: { data: Kpr1041Data }) {
  const { year, orgName, orgJib, orgAddress, orgActivity, orgCity, entries } = data;

  const totals = entries.reduce(
    (acc, e) => ({
      cash: acc.cash + (e.income_cash ?? 0),
      bank: acc.bank + (e.income_bank ?? 0),
      incomeOther: acc.incomeOther + (e.income_other ?? 0),
      incomeVat: acc.incomeVat + (e.income_vat ?? 0),
      incomeTotal: acc.incomeTotal + (e.income_total ?? 0),
      
      goods: acc.goods + (e.expense_goods ?? 0),
      salaries: acc.salaries + (e.expense_salaries ?? 0),
      contribs: acc.contribs + (e.expense_contribs ?? 0),
      expenseOther: acc.expenseOther + (e.expense_other ?? 0),
      expenseVat: acc.expenseVat + (e.expense_vat ?? 0),
      expenseTotal: acc.expenseTotal + (e.expense_total ?? 0),
    }),
    {
      cash: 0, bank: 0, incomeOther: 0, incomeVat: 0, incomeTotal: 0,
      goods: 0, salaries: 0, contribs: 0, expenseOther: 0, expenseVat: 0, expenseTotal: 0,
    }
  );

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header Block */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.metaText}>
              <Text style={styles.metaLabel}>Naziv / Ime i prezime obveznika: </Text>
              {orgName}
            </Text>
            <Text style={styles.metaText}>
              <Text style={styles.metaLabel}>Adresa sjedišta / prebivališta: </Text>
              {orgAddress}, {orgCity}
            </Text>
            <Text style={styles.metaText}>
              <Text style={styles.metaLabel}>JIB / JMB obveznika: </Text>
              {orgJib}
            </Text>
            <Text style={styles.metaText}>
              <Text style={styles.metaLabel}>Djelatnost (šifra i naziv): </Text>
              {orgActivity}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={{ fontSize: 10, fontWeight: "bold" }}>Obrazac KPR - 1041</Text>
            <Text style={{ fontSize: 12, fontWeight: "bold", marginTop: 2 }}>
              KNJIGA PRIHODA I RASHODA
            </Text>
            <Text style={{ fontSize: 8, fontWeight: "bold", marginTop: 2 }}>
              Za porezni period / godinu: {year}
            </Text>
          </View>
        </View>

        {/* Table Block */}
        <View style={styles.table}>
          {/* Main Table Headers */}
          <View style={styles.tableHeaderGroup}>
            {/* Header Row 1: Category spans */}
            <View style={styles.tableHeaderRow}>
              <View style={[styles.tableHeaderCell, styles.colRbr]}><Text>R. br.</Text></View>
              <View style={[styles.tableHeaderCell, styles.colDatum]}><Text>Datum prihoda / rashoda</Text></View>
              <View style={[styles.tableHeaderCell, styles.colDokument]}><Text>Broj i datum dokumenta o prihodu/rashodu</Text></View>
              <View style={[styles.tableHeaderCell, styles.colOpis]}><Text>Opis knjiženja</Text></View>
              
              <View style={[styles.tableHeaderCell, styles.colSpanHeaderPrihodi]}>
                <Text style={{ fontWeight: "bold" }}>PRIHODI</Text>
              </View>
              
              <View style={[styles.tableHeaderCell, styles.colSpanHeaderRashodi, { borderRightWidth: 0 }]}>
                <Text style={{ fontWeight: "bold" }}>RASHODI</Text>
              </View>
            </View>

            {/* Header Row 2: Sub-column names & numbers */}
            <View style={styles.tableHeaderRow}>
              {/* Columns 7 to 10 empty for padding */}
              <View style={[styles.tableHeaderCell, styles.colRbr]}><Text>7</Text></View>
              <View style={[styles.tableHeaderCell, styles.colDatum]}><Text>8</Text></View>
              <View style={[styles.tableHeaderCell, styles.colDokument]}><Text>9</Text></View>
              <View style={[styles.tableHeaderCell, styles.colOpis]}><Text>10</Text></View>
              
              {/* Prihodi cols */}
              <View style={[styles.tableHeaderCell, styles.colAmount]}><Text>U gotovini (11)</Text></View>
              <View style={[styles.tableHeaderCell, styles.colAmount]}><Text>Preko bankovnog računa (12)</Text></View>
              <View style={[styles.tableHeaderCell, styles.colAmount]}><Text>U stvarima i uslugama (13)</Text></View>
              <View style={[styles.tableHeaderCell, styles.colAmount]}><Text>PDV u prihodima (14)</Text></View>
              <View style={[styles.tableHeaderCell, styles.colAmount]}><Text>Ukupno prihodi (15)</Text></View>
              
              {/* Rashodi cols */}
              <View style={[styles.tableHeaderCell, styles.colAmount]}><Text>U robi i materijalu (16)</Text></View>
              <View style={[styles.tableHeaderCell, styles.colAmount]}><Text>Bruto plaće zaposlenika (17)</Text></View>
              <View style={[styles.tableHeaderCell, styles.colAmount]}><Text>Doprinosi vlasnika (18)</Text></View>
              <View style={[styles.tableHeaderCell, styles.colAmount]}><Text>Ostali rashodi (19)</Text></View>
              <View style={[styles.tableHeaderCell, styles.colAmount]}><Text>PDV u rashodima (20)</Text></View>
              <View style={[styles.tableHeaderCell, styles.colAmount, { borderRightWidth: 0 }]}><Text>Ukupno rashodi (21)</Text></View>
            </View>
          </View>

          {/* Table Body rows */}
          {entries.map((e, index) => (
            <View key={index} style={styles.tableRow} wrap={false}>
              <View style={[styles.tableCell, styles.colRbr]}><Text>{e.entry_number}</Text></View>
              <View style={[styles.tableCell, styles.colDatum]}><Text>{e.entry_date}</Text></View>
              <View style={[styles.tableCell, styles.colDokument]}>
                <Text>{[e.document_type, e.document_number].filter(Boolean).join(" br. ")}</Text>
              </View>
              <View style={[styles.tableCell, styles.colOpis]}>
                <Text>{e.partner_name ? `${e.partner_name} - ` : ""}{e.description || ""}</Text>
              </View>
              
              {/* Prihodi */}
              <View style={[styles.tableCell, styles.colAmount]}><Text>{fmt(e.income_cash)}</Text></View>
              <View style={[styles.tableCell, styles.colAmount]}><Text>{fmt(e.income_bank)}</Text></View>
              <View style={[styles.tableCell, styles.colAmount]}><Text>{fmt(e.income_other)}</Text></View>
              <View style={[styles.tableCell, styles.colAmount]}><Text>{fmt(e.income_vat)}</Text></View>
              <View style={[styles.tableCell, styles.colAmount]}><Text>{fmt(e.income_total)}</Text></View>
              
              {/* Rashodi */}
              <View style={[styles.tableCell, styles.colAmount]}><Text>{fmt(e.expense_goods)}</Text></View>
              <View style={[styles.tableCell, styles.colAmount]}><Text>{fmt(e.expense_salaries)}</Text></View>
              <View style={[styles.tableCell, styles.colAmount]}><Text>{fmt(e.expense_contribs)}</Text></View>
              <View style={[styles.tableCell, styles.colAmount]}><Text>{fmt(e.expense_other)}</Text></View>
              <View style={[styles.tableCell, styles.colAmount]}><Text>{fmt(e.expense_vat)}</Text></View>
              <View style={[styles.tableCell, styles.colAmount, { borderRightWidth: 0 }]}><Text>{fmt(e.expense_total)}</Text></View>
            </View>
          ))}

          {/* Totals Row */}
          <View style={styles.tableRowLast} wrap={false}>
            <View style={[styles.tableCell, { width: "30.5%", fontWeight: "bold" }]}>
              <Text>UKUPNO ZA GODINU {year}</Text>
            </View>
            
            {/* Prihodi Totals */}
            <View style={[styles.tableCell, styles.colAmount]}><Text>{fmt(totals.cash)}</Text></View>
            <View style={[styles.tableCell, styles.colAmount]}><Text>{fmt(totals.bank)}</Text></View>
            <View style={[styles.tableCell, styles.colAmount]}><Text>{fmt(totals.incomeOther)}</Text></View>
            <View style={[styles.tableCell, styles.colAmount]}><Text>{fmt(totals.incomeVat)}</Text></View>
            <View style={[styles.tableCell, styles.colAmount]}><Text>{fmt(totals.incomeTotal)}</Text></View>
            
            {/* Rashodi Totals */}
            <View style={[styles.tableCell, styles.colAmount]}><Text>{fmt(totals.goods)}</Text></View>
            <View style={[styles.tableCell, styles.colAmount]}><Text>{fmt(totals.salaries)}</Text></View>
            <View style={[styles.tableCell, styles.colAmount]}><Text>{fmt(totals.contribs)}</Text></View>
            <View style={[styles.tableCell, styles.colAmount]}><Text>{fmt(totals.expenseOther)}</Text></View>
            <View style={[styles.tableCell, styles.colAmount]}><Text>{fmt(totals.expenseVat)}</Text></View>
            <View style={[styles.tableCell, styles.colAmount, { borderRightWidth: 0 }]}><Text>{fmt(totals.expenseTotal)}</Text></View>
          </View>
        </View>

        {/* Footer Page Info */}
        <View style={styles.footer} fixed>
          <Text>KPR-1041 Knjiga prihoda i rashoda obveznika</Text>
          <Text render={({ pageNumber, totalPages }) => `Stranica ${pageNumber} od ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
