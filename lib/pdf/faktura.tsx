import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    padding: 36,
    color: "#111",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  docTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a56db",
  },
  docNumber: {
    fontSize: 11,
    fontFamily: "Courier",
    marginTop: 2,
  },
  label: { color: "#666", fontSize: 8 },
  bold: { fontWeight: "bold" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottom: "1 solid #d1d5db",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderBottom: "0.5 solid #e5e7eb",
  },
  col: { flex: 1 },
  colRight: { flex: 1, textAlign: "right" },
  totalSection: {
    marginTop: 12,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 200,
    paddingVertical: 2,
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 200,
    paddingVertical: 4,
    borderTop: "1.5 solid #111",
    marginTop: 4,
  },
});

export interface FakturaItem {
  description: string;
  unit?: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  vat_rate: number;
  subtotal: number;
  vat_amount: number;
  total: number;
}

export interface FakturaData {
  invoice_number: string;
  type: string;
  issue_date: string;
  due_date?: string | null;
  // Izdavalac
  org_name: string;
  org_address?: string | null;
  org_city?: string | null;
  org_tax_id?: string | null;
  org_vat_number?: string | null;
  // Kupac
  partner_name?: string | null;
  partner_address?: string | null;
  partner_city?: string | null;
  partner_tax_id?: string | null;
  // Stavke
  items: FakturaItem[];
  // Totali
  subtotal: number;
  vat_base_17: number;
  vat_amount_17: number;
  vat_base_0: number;
  total: number;
  note?: string | null;
}

function fmt(n: number) {
  return n.toFixed(2).replace(".", ",") + " KM";
}

const TYPE_LABELS: Record<string, string> = {
  invoice:     "FAKTURA",
  proforma:    "PREDRAČUN",
  credit_note: "KREDITNA NOTA",
};

export function FakturaPdf({ data }: { data: FakturaData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={{ ...styles.bold, fontSize: 11 }}>{data.org_name}</Text>
            {data.org_address && <Text style={styles.label}>{data.org_address}</Text>}
            {data.org_city    && <Text style={styles.label}>{data.org_city}</Text>}
            {data.org_tax_id  && <Text style={styles.label}>JIB: {data.org_tax_id}</Text>}
            {data.org_vat_number && <Text style={styles.label}>PDV: {data.org_vat_number}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.docTitle}>{TYPE_LABELS[data.type] ?? "FAKTURA"}</Text>
            <Text style={styles.docNumber}>{data.invoice_number}</Text>
            <Text style={{ ...styles.label, marginTop: 4 }}>Datum: {data.issue_date}</Text>
            {data.due_date && <Text style={styles.label}>Dospijeće: {data.due_date}</Text>}
          </View>
        </View>

        {/* Partner */}
        {data.partner_name && (
          <View style={{ marginBottom: 16, padding: 8, backgroundColor: "#f9fafb" }}>
            <Text style={{ ...styles.label, marginBottom: 2 }}>KUPAC / NARUČILAC</Text>
            <Text style={styles.bold}>{data.partner_name}</Text>
            {data.partner_address && <Text style={styles.label}>{data.partner_address}</Text>}
            {data.partner_city    && <Text style={styles.label}>{data.partner_city}</Text>}
            {data.partner_tax_id  && <Text style={styles.label}>JIB: {data.partner_tax_id}</Text>}
          </View>
        )}

        {/* Stavke — header */}
        <View style={styles.tableHeader}>
          <Text style={{ flex: 3, fontSize: 8 }}>Opis</Text>
          <Text style={{ flex: 1, textAlign: "right", fontSize: 8 }}>Kol.</Text>
          <Text style={{ flex: 1.5, textAlign: "right", fontSize: 8 }}>Cijena</Text>
          <Text style={{ flex: 1, textAlign: "right", fontSize: 8 }}>PDV%</Text>
          <Text style={{ flex: 1.5, textAlign: "right", fontSize: 8 }}>Ukupno</Text>
        </View>

        {data.items.map((item, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={{ flex: 3 }}>{item.description}</Text>
            <Text style={{ flex: 1, textAlign: "right", fontFamily: "Courier" }}>{item.quantity}</Text>
            <Text style={{ flex: 1.5, textAlign: "right", fontFamily: "Courier" }}>{fmt(item.unit_price)}</Text>
            <Text style={{ flex: 1, textAlign: "right" }}>{item.vat_rate}%</Text>
            <Text style={{ flex: 1.5, textAlign: "right", fontFamily: "Courier" }}>{fmt(item.total)}</Text>
          </View>
        ))}

        {/* Totali */}
        <View style={styles.totalSection}>
          {[
            [`Osnova (17%):`,  data.vat_base_17],
            ...(data.vat_base_0 > 0 ? [[`Osnova (0%):`, data.vat_base_0] as [string, number]] : []),
            [`PDV (17%):`,     data.vat_amount_17],
          ].map(([label, value]) => (
            <View key={label as string} style={styles.totalRow}>
              <Text style={styles.label}>{label as string}</Text>
              <Text style={{ fontFamily: "Courier" }}>{fmt(value as number)}</Text>
            </View>
          ))}
          <View style={styles.grandTotal}>
            <Text style={{ fontWeight: "bold", fontSize: 10 }}>UKUPNO ZA UPLATU:</Text>
            <Text style={{ fontFamily: "Courier", fontWeight: "bold", fontSize: 10 }}>{fmt(data.total)}</Text>
          </View>
        </View>

        {/* Napomena */}
        {data.note && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.label}>Napomena: {data.note}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
