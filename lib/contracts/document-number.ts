/** @deprecated Use @/lib/documents/document-number */
export {
  documentYearFromDate,
  formatDocumentNumber,
  formatDocumentNumber as formatEmployeeDocumentNumber,
  queryNextDocumentNumber,
  type NextDocumentNumberResult,
} from "@/lib/documents/document-number";

export { getNumberPrefix as getTemplateNumberPrefix } from "@/lib/documents/registry";
