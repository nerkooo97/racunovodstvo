import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { PaymentVoucher } from "@/lib/calculations/salary";

Font.register({
  family: "Helvetica",
  fonts: [],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingHorizontal: 30,
    paddingVertical: 25,
    color: "#111111",
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    textTransform: "uppercase",
  },
  voucherBox: {
    borderWidth: 1,
    borderColor: "#000000",
    borderRadius: 4,
    padding: 12,
    marginBottom: 15,
    backgroundColor: "#ffffff",
  },
  voucherHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingBottom: 6,
    marginBottom: 8,
  },
  voucherType: {
    fontSize: 11,
    fontWeight: "bold",
  },
  voucherAmount: {
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "Helvetica",
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: "30%",
    color: "#555555",
    fontWeight: "bold",
  },
  value: {
    width: "70%",
    fontWeight: "bold",
  },
});

function fmt(n: number) {
  return n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " KM";
}

export function UplatnicePdf({ vouchers, orgName, periodStr }: { vouchers: PaymentVoucher[]; orgName: string; periodStr: string }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Zbirni nalozi za plaćanje — {periodStr}</Text>
        {vouchers.map((v, i) => (
          <View key={i} style={styles.voucherBox} wrap={false}>
            <View style={styles.voucherHeader}>
              <Text style={styles.voucherType}>{v.label}</Text>
              <Text style={styles.voucherAmount}>{fmt(v.amount)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Uplatilac:</Text>
              <Text style={styles.value}>{orgName}, {v.opcinaIme}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Primalac:</Text>
              <Text style={styles.value}>{v.primalac.filter(Boolean).join(" · ")}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Račun primaoca:</Text>
              <Text style={styles.value}>{v.account}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Vrsta prihoda:</Text>
              <Text style={styles.value}>{v.vrstaPrihoda} {v.budgetOrg ? `· Budžetska org: ${v.budgetOrg}` : ""} · Općina: {v.opcinaKod}</Text>
            </View>
          </View>
        ))}
      </Page>
    </Document>
  );
}
