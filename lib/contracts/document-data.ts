import { formatDate, formatKM } from "@/lib/utils";

export interface ContractFillInput {
  documentNumber?: string;
  documentDate?: string;
  documentPlace?: string;
  representative?: string;
  reason?: string;
  dateFrom?: string;
  dateTo?: string;
  extraNote?: string;
  jobDescription?: string;
  workLocation?: string;
  paymentDay?: string;
  annualLeaveDays?: string;
  fullTime?: boolean;
  severancePay?: string;
  terminationNotice?: string;
  durationDays?: string;
  contractSignedDate?: string;
  annualLeaveUsage?: "full" | "remaining";
  handoverItems?: string;
  referencedContractNumber?: string;
  office?: string;
  regNumber?: string;
  activityCode?: string;
  activityName?: string;
  changeType?: string;
  changeDate?: string;
  endDate?: string;
  membersJson?: string;
}

export interface ContractOrgRow {
  name: string;
  address: string | null;
  city: string | null;
  tax_id: string | null;
}

export interface ContractEmployeeRow {
  first_name: string;
  last_name: string;
  maiden_name?: string | null;
  jmbg: string;
  address: string | null;
  city: string | null;
  municipality: string | null;
  canton?: string | null;
  job_title: string | null;
  contract_number: string | null;
  hire_date: string | null;
  contract_type: string | null;
  contract_end_date: string | null;
  notice_period: string | null;
  gross_salary: number | null;
  net_salary: number | null;
  salary_type?: string | null;
  work_hours_per_day?: number | null;
  probation?: boolean | null;
  probation_months?: number | null;
  probation_end_date?: string | null;
  meal_allowance_per_day?: number | null;
  termination_date?: string | null;
}

export interface EmployeeDocumentData {
  orgName: string;
  orgAddress: string;
  orgCity: string;
  orgJib: string;
  orgLine: string;
  representative: string;
  documentNumber: string;
  documentDate: string;
  documentDateFormatted: string;
  documentPlace: string;
  employeeFirstName: string;
  employeeLastName: string;
  employeeFullName: string;
  employeeAddress: string;
  employeeCity: string;
  employeeMunicipality: string;
  employeeResidence: string;
  employeeJmbg: string;
  jobTitle: string;
  jobDescriptionLines: string[];
  contractNumber: string;
  hireDateFormatted: string;
  contractEndDateFormatted: string;
  contractType: "indefinite" | "fixed";
  contractTypeLabel: string;
  noticePeriod: string;
  probation: boolean;
  probationMonths: number;
  probationEndDateFormatted: string;
  fullTime: boolean;
  workHoursPerDay: number;
  workHoursLabel: string;
  grossSalaryFormatted: string;
  netSalaryFormatted: string;
  salaryType: string;
  mealAllowanceFormatted: string;
  paymentDay: string;
  annualLeaveDays: number;
  workLocation: string;
  reason: string;
  dateFrom: string;
  dateTo: string;
  dateFromRaw: string;
  dateToRaw: string;
  extraNote: string;
  severancePay: string;
  terminationNotice: string;
  durationDays: string;
  contractSignedDateFormatted: string;
  terminationDateFormatted: string;
  annualLeaveUsage: "full" | "remaining";
  handoverItems: string;
}

function formatBsDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  return formatDate(dateStr);
}

function parseJobDescription(raw: string | undefined, jobTitle: string): string[] {
  const lines = (raw ?? "")
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > 0) return lines;
  if (jobTitle) {
    return [`obavljanje poslova na radnom mjestu ${jobTitle}`];
  }
  return ["obavljanje poslova u skladu s opisom radnog mjesta"];
}

export function buildDocumentData(
  org: ContractOrgRow,
  employee: ContractEmployeeRow,
  input: ContractFillInput = {}
): EmployeeDocumentData {
  const orgCity = org.city ?? "";
  const orgAddress = [org.address, orgCity].filter(Boolean).join(", ");
  const orgLine = [org.name, orgAddress].filter(Boolean).join(", ");
  const empCity = employee.city ?? "";
  const empMunicipality = employee.municipality ?? empCity;
  const empAddress = [employee.address, empCity].filter(Boolean).join(", ");
  const today = new Date().toISOString().slice(0, 10);

  const documentDate = input.documentDate || today;
  const documentNumber =
    input.documentNumber ||
    employee.contract_number ||
    `RU-${new Date().getFullYear()}-${employee.jmbg.slice(-4)}`;

  const contractType =
    employee.contract_type === "fixed" ? ("fixed" as const) : ("indefinite" as const);

  const workHours = employee.work_hours_per_day ?? 8;
  const fullTime =
    input.fullTime !== undefined ? input.fullTime : workHours >= 8;

  const probationMonths = employee.probation_months ?? 0;
  const probation =
    Boolean(employee.probation) || probationMonths > 0;

  const jobTitle = employee.job_title ?? "";
  const workLocation =
    input.workLocation ||
    [empMunicipality, employee.canton].filter(Boolean).join(", ") ||
    orgCity;

  const salaryType = employee.salary_type ?? "bruto";
  const gross = employee.gross_salary;
  const net = employee.net_salary;
  const meal = employee.meal_allowance_per_day ?? 0;

  const contractSignedDate =
    input.contractSignedDate || employee.hire_date || "";
  const terminationDate =
    input.dateTo || employee.termination_date || "";

  return {
    orgName: org.name,
    orgAddress: org.address ?? "",
    orgCity,
    orgJib: org.tax_id ?? "",
    orgLine,
    representative: input.representative ?? "",
    documentNumber,
    documentDate,
    documentDateFormatted: formatBsDate(documentDate),
    documentPlace: input.documentPlace || orgCity || "",
    employeeFirstName: employee.first_name,
    employeeLastName: employee.last_name,
    employeeFullName: `${employee.first_name} ${employee.last_name}`.trim(),
    employeeAddress: employee.address ?? "",
    employeeCity: empCity,
    employeeMunicipality: empMunicipality,
    employeeResidence: empAddress,
    employeeJmbg: employee.jmbg,
    jobTitle,
    jobDescriptionLines: parseJobDescription(input.jobDescription, jobTitle),
    contractNumber:
      input.referencedContractNumber ||
      employee.contract_number ||
      documentNumber,
    hireDateFormatted: formatBsDate(employee.hire_date),
    contractEndDateFormatted: formatBsDate(employee.contract_end_date),
    contractType,
    contractTypeLabel:
      contractType === "fixed" ? "na određeno vrijeme" : "na neodređeno vrijeme",
    noticePeriod: employee.notice_period ?? "30 dana",
    probation,
    probationMonths,
    probationEndDateFormatted: formatBsDate(employee.probation_end_date),
    fullTime,
    workHoursPerDay: workHours,
    workHoursLabel: fullTime
      ? "u punom radnom vremenu"
      : `u skraćenom radnom vremenu od ${workHours} sati dnevno`,
    grossSalaryFormatted: formatKM(gross),
    netSalaryFormatted: formatKM(net),
    salaryType,
    mealAllowanceFormatted: formatKM(meal),
    paymentDay: input.paymentDay || "15.",
    annualLeaveDays: parseInt(input.annualLeaveDays ?? "20", 10) || 20,
    workLocation,
    reason: input.reason ?? "",
    dateFrom: input.dateFrom ? formatBsDate(input.dateFrom) : "",
    dateTo: input.dateTo ? formatBsDate(input.dateTo) : "",
    dateFromRaw: input.dateFrom ?? "",
    dateToRaw: input.dateTo ?? "",
    extraNote: input.extraNote ?? "",
    severancePay: input.severancePay ?? "",
    terminationNotice: input.terminationNotice ?? employee.notice_period ?? "30 dana",
    durationDays: input.durationDays ?? "",
    contractSignedDateFormatted: formatBsDate(contractSignedDate),
    terminationDateFormatted: formatBsDate(terminationDate),
    annualLeaveUsage:
      input.annualLeaveUsage === "remaining" ? "remaining" : "full",
    handoverItems: input.handoverItems ?? "",
  };
}

/** @deprecated Use buildDocumentData */
export { buildDocumentData as buildContractContext };
