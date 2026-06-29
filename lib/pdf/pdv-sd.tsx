import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { PdvReturn, PdvReturnOrgInfo } from "@/lib/pdv/pdv-sd/types";
import { monthName } from "@/lib/pdv/period";

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
    marginBottom: 4,
    borderBottom: "1 solid #d1d5db",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottom: "0.5 solid #e5e7eb",
  },
  field: { width: 36, fontFamily: "Courier", color: "#888" },
  label: { flex: 1 },
  amount: { width: 110, textAlign: "right", fontFamily: "Courier" },
  totalRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderTop: "1.5 solid #111",
    marginTop: 4,
  },
  totalLabel: { flex: 1, fontWeight: "bold" },
  totalAmount: { width: 110, textAlign: "right", fontFamily: "Courier", fontWeight: "bold" },
  note: { marginTop: 24, fontSize: 8, color: "#888" },
});

function fmt(n: number): string {
  return n.toLocaleString("bs-BA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function Line({
  field,
  label,
  amount,
}: {
  field: string;
  label: string;
  amount: number;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.field}>{field}</Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.amount}>{fmt(amount)}</Text>
    </View>
  );
}

export interface PdvSdPdfData {
  ret: PdvReturn;
  org: PdvReturnOrgInfo;
}

export function PdvSdDocument({ data }: { data: PdvSdPdfData }) {
  const { ret, org } = data;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>PDV prijava</Text>
            <Text style={styles.subtitle}>
              Porezni period: {monthName(ret.period.month)} {ret.period.year}
            </Text>
          </View>
          <View style={styles.orgBox}>
            <Text style={styles.orgName}>{org.name}</Text>
            {org.address ? <Text style={styles.small}>{org.address}</Text> : null}
            <Text style={styles.small}>PDV broj: {org.vatNumber || "—"}</Text>
            {org.jib ? <Text style={styles.small}>JIB: {org.jib}</Text> : null}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Isporuke (izlazni PDV)</Text>
        <Line field="11" label="Oporezive isporuke — osnovica (17%)" amount={ret.taxableSuppliesBase} />
        <Line field="12" label="Izvoz (oslobođeno s pravom na odbitak)" amount={ret.exportSupplies} />
        <Line field="13" label="Oslobođene isporuke bez prava na odbitak" amount={ret.exemptSupplies} />
        <Line field="—" label="Vlastita / vanposlovna potrošnja" amount={ret.internalSupplies} />
        <Line field="21" label="Izlazni PDV" amount={ret.outputVat} />

        <Text style={styles.sectionTitle}>Nabavke (ulazni PDV)</Text>
        <Line field="41" label="Oporezive nabavke iz zemlje — osnovica" amount={ret.domesticPurchasesBase} />
        <Line field="42" label="Uvoz (JCI) — osnovica" amount={ret.importBase} />
        <Line field="—" label="Paušalna naknada" amount={ret.flatFee} />
        <Line field="51" label="Ulazni PDV — ukupno" amount={ret.inputVatTotal} />
        <Line field="—" label="Neodbitni ulazni PDV" amount={ret.nonDeductibleVat} />
        <Line field="60" label="Odbitni ulazni PDV" amount={ret.deductibleVat} />

        <Text style={styles.sectionTitle}>Obračun</Text>
        <Line field="70" label="PDV obaveza za uplatu" amount={ret.vatLiability} />
        <Line field="80" label="PDV za povrat" amount={ret.vatCredit} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>
            {ret.vatLiability > 0 ? "Za uplatu UIO" : ret.vatCredit > 0 ? "Za povrat" : "Saldo"}
          </Text>
          <Text style={styles.totalAmount}>
            {fmt(ret.vatLiability > 0 ? ret.vatLiability : ret.vatCredit)}
          </Text>
        </View>

        <Text style={styles.note}>
          Iznosi su agregirani iz e-KIF ({ret.kifCount} stavki) i e-KUF ({ret.kufCount} stavki).
          Ovaj dokument je interni pregled obračuna PDV-a; služi kao pomoć pri popunjavanju
          službene PDV prijave UIO. Brojevi rubrika su orijentacioni.
        </Text>
      </Page>
    </Document>
  );
}
