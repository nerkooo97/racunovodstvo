"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  cancelOrganizationDocument,
  listOrganizationDocuments,
  type OrganizationDocumentRow,
} from "@/app/actions/organization-documents";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import FormSection from "@/components/shared/form-section";
import { FileText, Loader2, XCircle } from "lucide-react";

interface Props {
  employeeId: string;
  refreshKey?: number;
}

export default function EmployeeDocumentHistory({
  employeeId,
  refreshKey = 0,
}: Props) {
  const [documents, setDocuments] = useState<OrganizationDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listOrganizationDocuments({ employeeId, limit: 100 }).then((res) => {
      if (cancelled) return;
      if ("error" in res) {
        setError(res.error);
        setDocuments([]);
      } else {
        setError(null);
        setDocuments(res.documents);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [employeeId, refreshKey]);

  function handleCancel(id: string) {
    if (!confirm("Označiti dokument kao storniran?")) return;
    startTransition(async () => {
      const res = await cancelOrganizationDocument(id);
      if ("error" in res) {
        alert(res.error);
        return;
      }
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: "cancelled" } : d))
      );
    });
  }

  return (
    <FormSection
      title="Evidencija dokumenata"
      description="Pregled izdatih ugovora i rješenja za ovog radnika."
    >
      <p className="text-xs text-muted-foreground -mt-2 mb-3">
        <Link href={`/dokumenti?radnik=${employeeId}`} className="underline">
          Otvori sve dokumente firme →
        </Link>
      </p>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Učitavanje...
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : documents.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          Još nema spremljenih dokumenata. Koristite „Spremi i preuzmi“ pri generisanju.
        </p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Broj</TableHead>
                <TableHead>Vrsta</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Mjesto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-mono text-sm whitespace-nowrap">
                    {doc.document_number}
                  </TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">
                    {doc.document_label}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {formatDate(doc.document_date)}
                  </TableCell>
                  <TableCell className="text-sm">{doc.document_place ?? "—"}</TableCell>
                  <TableCell>
                    {doc.status === "cancelled" ? (
                      <Badge variant="secondary">Stornirano</Badge>
                    ) : (
                      <Badge variant="outline">Izdat</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {doc.storage_path && doc.status === "issued" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1"
                          asChild
                        >
                          <a
                            href={`/api/documents/file/${doc.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            PDF
                          </a>
                        </Button>
                      ) : null}
                      {doc.status === "issued" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-muted-foreground"
                          disabled={pending}
                          onClick={() => handleCancel(doc.id)}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </FormSection>
  );
}
