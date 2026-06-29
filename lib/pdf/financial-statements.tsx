import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type {
  BalanceSheet,
  IncomeStatement,
  StatementRow,
} from "@/lib/accounting/statements";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 40,
    color: "#111",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  title: { fontSize: 16, fontWeight: "bold" },
  subtitle: { fontSize: 10, color: "#555", marginTop: 2 },
  orgBox: { textAlign: "right" },
  orgName: { fontWeight: "bold", fontSize: 11 },
  small: { fontSize: 8, color: "#666" },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    backgroundColor: "#f3f4f6",
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginTop: 14,
    marginBottom: 2,
    borderBottom: "1 solid #d1d5db",
  },
  groupLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#6b7280",
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 2,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottom: "0.5 solid #e5e7eb",
  },
  code: { width: 44, fontFamily: "Courier", color: "#888" },
  label: { flex: 1 },
  amount: { width: 110, textAlign: "right", fontFamily: "Courier" },
  subtotalRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: "#f9fafb",
  },
  subtotalLabel: { flex: 1, fontWeight: "bold" },
  subtotalAmount: {
    width: 110,
    textAlign: "right",
    fontFamily: "Courier",
    fontWeight: "bold",
  },
  totalRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderTop: "1.5 solid #111",
    marginTop: 2,
  },
  totalLabel: { flex: 1, fontWeight: "bold" },
  totalAmount: {
    width: 110,
    textAlign: "right",
    fontFamily: "Courier",
    fontWeight: "bold",
  },
  empty: { paddingVertical: 4, paddingHorizontal: 6, color: "#888", fontSize: 9 },
  note: { marginTop: 24, fontSize: 8, color: "#888" },
  warn: {
    marginTop: 12,
    padding: 6,
    fontSize: 8,
    color: "#92400e",
    backgroundColor: "#fffbeb",
    border: "0.5 solid #fcd34d",
  },
});

function fmt(n: number): string {
  return n.toLocaleString("bs-BA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function Rows({ rows }: { rows: StatementRow[] }) {
  if (rows.length === 0) {
    return <Text style={styles.empty}>Nema podataka.</Text>;
  }
  return (
    <>
      {rows.map((r) => (
        <View key={r.code} style={styles.row}>
          <Text style={styles.code}>{r.code}</Text>
          <Text style={styles.label}>{r.name}</Text>
          <Text style={styles.amount}>{fmt(r.amount)}</Text>
        </View>
      ))}
    </>
  );
}

export interface FinancialStatementsOrgInfo {
  name: string;
  vatNumber: string | null;
  jib: string | null;
  address: string | null;
}

export interface FinancialStatementsPdfData {
  year: number;
  org: FinancialStatementsOrgInfo;
  income: IncomeStatement;
  balance: BalanceSheet;
}

export function FinancialStatementsDocument({
  data,
}: {
  data: FinancialStatementsPdfData;
}) {
  const { year, org, income, balance } = data;
  const totalPasiva =
    balance.totalLiabilities + balance.totalEquity + balance.result;
  const unbalanced = Math.abs(balance.difference) > 0.01;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Finansijski izvještaji</Text>
            <Text style={styles.subtitle}>
              Bilans uspjeha i bilans stanja · {year}
            </Text>
          </View>
          <View style={styles.orgBox}>
            <Text style={styles.orgName}>{org.name}</Text>
            {org.address ? (
              <Text style={styles.small}>{org.address}</Text>
            ) : null}
            {org.jib ? <Text style={styles.small}>JIB: {org.jib}</Text> : null}
            {org.vatNumber ? (
              <Text style={styles.small}>PDV broj: {org.vatNumber}</Text>
            ) : null}
          </View>
        </View>

        {/* ── Bilans uspjeha ── */}
        <Text style={styles.sectionTitle}>Bilans uspjeha</Text>
        <Text style={styles.groupLabel}>Prihodi</Text>
        <Rows rows={income.revenueRows} />
        <View style={styles.subtotalRow}>
          <Text style={styles.subtotalLabel}>Ukupni prihodi</Text>
          <Text style={styles.subtotalAmount}>{fmt(income.totalRevenue)}</Text>
        </View>
        <Text style={styles.groupLabel}>Rashodi</Text>
        <Rows rows={income.expenseRows} />
        <View style={styles.subtotalRow}>
          <Text style={styles.subtotalLabel}>Ukupni rashodi</Text>
          <Text style={styles.subtotalAmount}>{fmt(income.totalExpenses)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>
            {income.result >= 0 ? "Dobit (prije poreza)" : "Gubitak"}
          </Text>
          <Text style={styles.totalAmount}>{fmt(income.result)}</Text>
        </View>

        {/* ── Bilans stanja ── */}
        <Text style={styles.sectionTitle}>Bilans stanja — Aktiva</Text>
        <Rows rows={balance.assetRows} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Ukupna aktiva</Text>
          <Text style={styles.totalAmount}>{fmt(balance.totalAssets)}</Text>
        </View>

        <Text style={styles.sectionTitle}>Bilans stanja — Pasiva</Text>
        <Text style={styles.groupLabel}>Obaveze</Text>
        <Rows rows={balance.liabilityRows} />
        <View style={styles.subtotalRow}>
          <Text style={styles.subtotalLabel}>Ukupne obaveze</Text>
          <Text style={styles.subtotalAmount}>
            {fmt(balance.totalLiabilities)}
          </Text>
        </View>
        <Text style={styles.groupLabel}>Kapital</Text>
        <Rows rows={balance.equityRows} />
        <View style={styles.row}>
          <Text style={styles.code}>—</Text>
          <Text style={styles.label}>Rezultat tekućeg perioda</Text>
          <Text style={styles.amount}>{fmt(balance.result)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Ukupna pasiva</Text>
          <Text style={styles.totalAmount}>{fmt(totalPasiva)}</Text>
        </View>

        {unbalanced ? (
          <Text style={styles.warn}>
            Upozorenje: aktiva i pasiva se ne slažu (razlika{" "}
            {fmt(balance.difference)}). Provjerite jesu li svi nalozi proknjiženi
            i u ravnoteži.
          </Text>
        ) : null}

        <Text style={styles.note}>
          Izvještaj je generisan iz proknjiženih naloga glavne knjige za godinu{" "}
          {year}. Iznosi su u KM. Ovo je interni pregled; služi kao pomoć pri
          izradi službenih godišnjih izvještaja (FIA/APIF).
        </Text>
      </Page>
    </Document>
  );
}
