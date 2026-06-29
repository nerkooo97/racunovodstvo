"use client";

import { useCallback, useState } from "react";
import EmployeeContractGenerator from "./employee-contract-generator";
import EmployeeDocumentHistory from "./employee-document-history";

interface Props {
  employeeId: string;
  employeeName: string;
  defaultPlace?: string;
  defaultDocumentNumber?: string;
  defaultWorkLocation?: string;
  defaultContractSignedDate?: string;
}

export default function EmployeeDocumentsPanel(props: Props) {
  const [historyKey, setHistoryKey] = useState(0);
  const onDocumentSaved = useCallback(() => {
    setHistoryKey((k) => k + 1);
  }, []);

  return (
    <div className="space-y-6">
      <EmployeeContractGenerator {...props} onDocumentSaved={onDocumentSaved} />
      <EmployeeDocumentHistory employeeId={props.employeeId} refreshKey={historyKey} />
    </div>
  );
}
