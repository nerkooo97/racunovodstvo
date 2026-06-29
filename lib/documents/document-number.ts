import { getNumberPrefix } from "./registry";

export function documentYearFromDate(dateStr: string): number {
  const d = new Date(dateStr);
  if (!Number.isNaN(d.getTime())) return d.getFullYear();
  const m = dateStr.match(/^(\d{4})/);
  return m ? parseInt(m[1], 10) : new Date().getFullYear();
}

export function formatDocumentNumber(
  sequenceNumber: number,
  year: number,
  documentType: string
): string {
  const seq = String(sequenceNumber).padStart(2, "0");
  const prefix = getNumberPrefix(documentType);
  return prefix ? `${prefix}-${seq}/${year}` : `${seq}/${year}`;
}

export interface NextDocumentNumberResult {
  sequenceNumber: number;
  year: number;
  documentNumber: string;
  numberPrefix: string;
}

export async function queryNextDocumentNumber(
  supabase: {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string | number) => {
          eq: (col: string, val: string | number) => {
            order: (
              col: string,
              opts: { ascending: boolean }
            ) => {
              limit: (n: number) => {
                single: () => Promise<{ data: { sequence_number: number } | null }>;
              };
            };
          };
        };
      };
    };
  },
  organizationId: string,
  documentType: string,
  year: number
): Promise<NextDocumentNumberResult> {
  const { data: last } = await supabase
    .from("organization_documents")
    .select("sequence_number")
    .eq("organization_id", organizationId)
    .eq("document_type", documentType)
    .eq("year", year)
    .order("sequence_number", { ascending: false })
    .limit(1)
    .single();

  const sequenceNumber = (last?.sequence_number ?? 0) + 1;
  const numberPrefix = getNumberPrefix(documentType);

  return {
    sequenceNumber,
    year,
    documentNumber: formatDocumentNumber(sequenceNumber, year, documentType),
    numberPrefix,
  };
}
