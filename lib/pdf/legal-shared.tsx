import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import path from "path";
import type { ReactNode } from "react";

const fontDir = path.join(process.cwd(), "public", "fonts");

Font.register({
  family: "Times New Roman",
  fonts: [
    {
      src: path.join(fontDir, "Times-Regular.ttf"),
      fontWeight: "normal",
      fontStyle: "normal",
    },
    {
      src: path.join(fontDir, "Times-Bold.ttf"),
      fontWeight: "bold",
      fontStyle: "normal",
    },
    {
      src: path.join(fontDir, "Times-Italic.ttf"),
      fontWeight: "normal",
      fontStyle: "italic",
    },
  ],
});

const FONT = "Times New Roman";

/** Uske margine lijevo/desno — sadržaj vizualno centriran na A4. */
const H_MARGIN = 72;

export const legalStyles = StyleSheet.create({
  page: {
    fontFamily: FONT,
    fontSize: 12,
    lineHeight: 1.5,
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: H_MARGIN,
    color: "#000",
  },
  contentColumn: {
    width: "100%",
    alignSelf: "center",
  },
  preamble: {
    fontFamily: FONT,
    textAlign: "justify",
    marginBottom: 16,
  },
  title: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  subtitle: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 18,
  },
  parties: {
    fontFamily: FONT,
    textAlign: "justify",
    marginBottom: 16,
  },
  articleTitle: {
    fontFamily: FONT,
    fontWeight: "bold",
    fontSize: 12,
    textAlign: "center",
    marginTop: 14,
    marginBottom: 8,
  },
  sectionHeading: {
    fontFamily: FONT,
    fontWeight: "bold",
    fontSize: 12,
    textAlign: "center",
    marginTop: 14,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  paragraph: {
    fontFamily: FONT,
    textAlign: "justify",
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 4,
    paddingLeft: 12,
  },
  bullet: {
    fontFamily: FONT,
    width: 14,
  },
  bulletText: {
    fontFamily: FONT,
    flex: 1,
    textAlign: "justify",
  },
  signatureBlock: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureCol: {
    width: "42%",
    alignItems: "center",
  },
  signatureLabel: {
    fontFamily: FONT,
    fontWeight: "bold",
    marginBottom: 32,
    textAlign: "center",
    fontSize: 12,
  },
  signatureLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#000",
    width: "100%",
    marginBottom: 4,
    height: 1,
  },
  signatureName: {
    fontFamily: FONT,
    fontSize: 11,
    textAlign: "center",
  },
  headerMeta: {
    marginBottom: 18,
    alignItems: "center",
  },
  headerLine: {
    fontFamily: FONT,
    textAlign: "center",
    marginBottom: 3,
  },
  sectionTitle: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  resolvesItem: {
    fontFamily: FONT,
    textAlign: "justify",
    marginBottom: 8,
    paddingLeft: 4,
  },
  dateLine: {
    fontFamily: FONT,
    textAlign: "left",
    marginTop: 28,
    marginBottom: 10,
  },
});

export function LegalPage({ children }: { children: ReactNode }) {
  return (
    <Document>
      <Page size="A4" style={legalStyles.page}>
        <View style={legalStyles.contentColumn}>{children}</View>
      </Page>
    </Document>
  );
}

export function Article({
  number,
  title,
  children,
}: {
  number: number;
  title?: string;
  children: ReactNode;
}) {
  return (
    <View>
      <Text style={legalStyles.articleTitle}>
        Član {number}.{title ? ` ${title}` : ""}
      </Text>
      {children}
    </View>
  );
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return <Text style={legalStyles.sectionHeading}>{children}</Text>;
}

export function P({ children }: { children: ReactNode }) {
  return <Text style={legalStyles.paragraph}>{children}</Text>;
}

export function Bullet({ children }: { children: ReactNode }) {
  return (
    <View style={legalStyles.bulletRow}>
      <Text style={legalStyles.bullet}>•</Text>
      <Text style={legalStyles.bulletText}>{children}</Text>
    </View>
  );
}

export function Signatures({
  employerLabel,
  employeeLabel,
  employerName,
  employeeName,
}: {
  employerLabel?: string;
  employeeLabel?: string;
  employerName?: string;
  employeeName?: string;
}) {
  return (
    <View style={legalStyles.signatureBlock}>
      <View style={legalStyles.signatureCol}>
        <Text style={legalStyles.signatureLabel}>
          {employerLabel ?? "POSLODAVAC"}
        </Text>
        <View style={legalStyles.signatureLine} />
        {employerName ? (
          <Text style={legalStyles.signatureName}>{employerName}</Text>
        ) : null}
      </View>
      <View style={legalStyles.signatureCol}>
        <Text style={legalStyles.signatureLabel}>
          {employeeLabel ?? "ZAPOSLENIK"}
        </Text>
        <View style={legalStyles.signatureLine} />
        {employeeName ? (
          <Text style={legalStyles.signatureName}>{employeeName}</Text>
        ) : null}
      </View>
    </View>
  );
}
