import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import path from "path";
import type { SihtericaDayRow, SihtericaPdfData } from "@/lib/timesheet/pdf-data";
import { SIHTERICA_NAPOMENA } from "@/lib/timesheet/pdf-format";

const fontDir = path.join(process.cwd(), "public", "fonts");

Font.register({
  family: "Times New Roman",
  fonts: [
    { src: path.join(fontDir, "Times-Regular.ttf"), fontWeight: "normal" },
    { src: path.join(fontDir, "Times-Bold.ttf"), fontWeight: "bold" },
  ],
});

const FIRST_PAGE_ROWS = 22;
const TOTAL_ROWS = 31;

/** Fiksna visina redova — prazne ćelije moraju zadržati okvir tabele. */
const HEADER_LABEL_ROW_HEIGHT = 26;
const HEADER_NUM_ROW_HEIGHT = 16;
const DATA_ROW_HEIGHT = 20;

/** 11 kolona — R/B je kolona 1 (broj 1). */
const COL = {
  c1: "4%",    // R/B
  c2: "14%",   // Datum u mjesecu
  c3: "7%",    // Početak rada
  c4: "7%",    // Završetak rada
  c5: "6.5%",  // Prekid rada
  c6: "8.5%",  // Ukupno dnevno radno vrijeme
  c7: "8%",    // Vrijeme terenskog rada
  c8: "8%",    // Vrijeme pripravnosti
  c9: "11%",   // Vrijeme neprisustva na poslu
  c10: "11%",  // Ostali podaci o radnom vremenu
  c11: "15%",  // Ukupno radnih sati
} as const;

const COL_WIDTHS = [
  COL.c1, COL.c2, COL.c3, COL.c4, COL.c5, COL.c6,
  COL.c7, COL.c8, COL.c9, COL.c10, COL.c11,
];

const styles = StyleSheet.create({
  page: {
    fontFamily: "Times New Roman",
    fontSize: 7,
    paddingTop: 22,
    paddingBottom: 18,
    paddingHorizontal: 22,
    color: "#000",
  },
  title: {
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  headerBlock: {
    flexDirection: "row",
    marginBottom: 6,
    alignItems: "flex-start",
  },
  headerLeft: {
    width: "55%",
  },
  headerRight: {
    width: "45%",
    alignItems: "flex-end",
  },
  label: {
    fontSize: 7,
    marginBottom: 2,
  },
  employeeName: {
    fontSize: 9,
    fontWeight: "bold",
    minHeight: 14,
  },
  orgLine: {
    fontSize: 8,
    textAlign: "right",
  },
  periodLine: {
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "right",
    marginTop: 4,
  },
  table: {
    borderWidth: 1,
    borderColor: "#000",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#000",
    height: DATA_ROW_HEIGHT,
    alignItems: "stretch",
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    backgroundColor: "#fff",
    alignItems: "stretch",
    height: HEADER_LABEL_ROW_HEIGHT,
  },
  headerNumbersRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    alignItems: "stretch",
    height: HEADER_NUM_ROW_HEIGHT,
    backgroundColor: "#fff",
  },
  numberCell: {
    borderRightWidth: 0.5,
    borderRightColor: "#000",
    paddingHorizontal: 2,
    paddingVertical: 2,
    justifyContent: "center",
    alignSelf: "stretch",
    alignItems: "center",
  },
  numberText: {
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
  },
  cell: {
    borderRightWidth: 0.5,
    borderRightColor: "#000",
    paddingHorizontal: 2,
    paddingVertical: 2,
    justifyContent: "center",
    alignSelf: "stretch",
    fontSize: 6.5,
    textAlign: "center",
  },
  cellText: {
    fontSize: 6.5,
    textAlign: "center",
  },
  cellLast: {
    borderRightWidth: 0,
  },
  headerCell: {
    borderRightWidth: 0.5,
    borderRightColor: "#000",
    paddingHorizontal: 1,
    paddingVertical: 2,
    justifyContent: "center",
    alignSelf: "stretch",
    fontSize: 5.8,
    textAlign: "center",
    fontWeight: "bold",
  },
  rbCell: {
    fontSize: 6.5,
    fontWeight: "bold",
  },
  totalSection: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#000",
    minHeight: 22,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  totalLabel: {
    fontSize: 8,
    fontWeight: "bold",
    flex: 1,
  },
  totalValue: {
    fontSize: 9,
    fontWeight: "bold",
    width: 60,
    textAlign: "right",
  },
  napomenaTitle: {
    fontSize: 7.5,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 3,
  },
  napomena: {
    fontSize: 6,
    lineHeight: 1.35,
    textAlign: "justify",
  },
});

function padRows(days: SihtericaDayRow[]): (SihtericaDayRow | null)[] {
  const rows: (SihtericaDayRow | null)[] = [...days];
  while (rows.length < TOTAL_ROWS) rows.push(null);
  return rows;
}

function HeaderLabels() {
  return (
    <View style={styles.headerRow}>
      <View style={[styles.headerCell, { width: COL.c1 }]}>
        <Text>R{"\n"}/{"\n"}B</Text>
      </View>
      <View style={[styles.headerCell, { width: COL.c2 }]}>
        <Text>Datum u{"\n"}mjesecu</Text>
      </View>
      <View style={[styles.headerCell, { width: COL.c3 }]}>
        <Text>Početak{"\n"}rada</Text>
      </View>
      <View style={[styles.headerCell, { width: COL.c4 }]}>
        <Text>Završetak{"\n"}rada</Text>
      </View>
      <View style={[styles.headerCell, { width: COL.c5 }]}>
        <Text>Prekid{"\n"}rada</Text>
      </View>
      <View style={[styles.headerCell, { width: COL.c6 }]}>
        <Text>Ukupno dnevno{"\n"}radno vrijeme</Text>
      </View>
      <View style={[styles.headerCell, { width: COL.c7 }]}>
        <Text>Vrijeme{"\n"}terenskog{"\n"}rada</Text>
      </View>
      <View style={[styles.headerCell, { width: COL.c8 }]}>
        <Text>Vrijeme{"\n"}pripravnosti</Text>
      </View>
      <View style={[styles.headerCell, { width: COL.c9 }]}>
        <Text>Vrijeme{"\n"}neprisustva na{"\n"}poslu</Text>
      </View>
      <View style={[styles.headerCell, { width: COL.c10 }]}>
        <Text>Ostali podaci{"\n"}o radnom{"\n"}vremenu</Text>
      </View>
      <View style={[styles.headerCell, styles.cellLast, { width: COL.c11 }]}>
        <Text>Ukupno{"\n"}radnih sati</Text>
      </View>
    </View>
  );
}

function HeaderNumbers() {
  return (
    <View style={styles.headerNumbersRow}>
      {COL_WIDTHS.map((width, i) => (
        <View
          key={i}
          style={[
            styles.numberCell,
            { width },
            ...(i === COL_WIDTHS.length - 1 ? [styles.cellLast] : []),
          ]}
        >
          <Text style={styles.numberText}>{String(i + 1)}</Text>
        </View>
      ))}
    </View>
  );
}

function cellContent(value: string): string {
  return value.trim() ? value : " ";
}

function DataRow({
  index,
  day,
  isLast,
}: {
  index: number;
  day: SihtericaDayRow | null;
  isLast?: boolean;
}) {
  const values = day
    ? [
        String(index + 1),
        day.dateDisplay,
        day.startTime,
        day.endTime,
        day.breakDisplay,
        day.dailyWorkHours,
        day.fieldWorkHours,
        day.standbyHours,
        day.absenceDisplay,
        day.otherDisplay,
        day.totalDayHours,
      ]
    : Array.from({ length: 11 }, (_, i) => (i === 0 ? String(index + 1) : ""));

  return (
    <View style={[styles.row, ...(isLast ? [styles.rowLast] : [])]}>
      {values.map((val, i) => (
        <View
          key={i}
          style={[
            styles.cell,
            { width: COL_WIDTHS[i] },
            ...(i === 0 ? [styles.rbCell] : []),
            ...(i === values.length - 1 ? [styles.cellLast] : []),
          ]}
        >
          <Text style={styles.cellText}>{cellContent(val)}</Text>
        </View>
      ))}
    </View>
  );
}

function FormHeader({ data }: { data: SihtericaPdfData }) {
  const orgLine = [data.orgName, data.orgCity].filter(Boolean).join(", ");
  return (
    <>
      <Text style={styles.title}>Evidencija o radnom vremenu za mjesec godine</Text>
      <View style={styles.headerBlock}>
        <View style={styles.headerLeft}>
          <Text style={styles.label}>Ime i prezime radnika:</Text>
          <Text style={styles.employeeName}>{data.employeeName}</Text>
        </View>
        <View style={styles.headerRight}>
          {orgLine ? <Text style={styles.orgLine}>{orgLine}</Text> : null}
          {data.employeeJmbg ? (
            <Text style={styles.orgLine}>ID: {data.employeeJmbg}</Text>
          ) : null}
          <Text style={styles.periodLine}>{data.monthPeriod}</Text>
        </View>
      </View>
    </>
  );
}

function TableSection({
  rows,
  start,
  end,
}: {
  rows: (SihtericaDayRow | null)[];
  start: number;
  end: number;
}) {
  return (
    <View style={styles.table}>
      <HeaderLabels />
      <HeaderNumbers />
      {rows.slice(start, end).map((day, i) => {
        const idx = start + i;
        return (
          <DataRow
            key={idx}
            index={idx}
            day={day}
            isLast={idx === end - 1}
          />
        );
      })}
    </View>
  );
}

export function SihtericaPdf({ data }: { data: SihtericaPdfData }) {
  const allRows = padRows(data.days);
  const totalDisplay = data.totalEffectiveHours.toFixed(1).replace(".", ",");

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <FormHeader data={data} />
        <TableSection rows={allRows} start={0} end={FIRST_PAGE_ROWS} />
      </Page>

      <Page size="A4" orientation="landscape" style={styles.page}>
        <TableSection rows={allRows} start={FIRST_PAGE_ROWS} end={TOTAL_ROWS} />

        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>UKUPNO RADNIH SATI U MJESECU</Text>
          <Text style={styles.totalValue}>{totalDisplay}</Text>
        </View>

        <Text style={styles.napomenaTitle}>Napomena:</Text>
        <Text style={styles.napomena}>{SIHTERICA_NAPOMENA}</Text>
      </Page>
    </Document>
  );
}
