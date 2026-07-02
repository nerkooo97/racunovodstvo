import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getActiveYear } from "@/lib/year";
import PageHeader from "@/components/shared/page-header";
import { formatDate } from "@/lib/utils";
import {
  getCategoryLabel,
  DOCUMENT_CATEGORIES,
  type DocumentCategory,
} from "@/lib/documents/registry";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import DocumentRowActions from "@/components/documents/document-row-actions";

export default async function DokumentiPage({
  searchParams,
}: {
  searchParams: Promise<{
    kategorija?: string;
    status?: string;
    radnik?: string;
  }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!org) redirect("/nova-djelatnost");

  const year = await getActiveYear();
  const category = (sp.kategorija ?? "all") as DocumentCategory | "all";
  const status = (sp.status ?? "issued") as "issued" | "cancelled" | "all";
  const employeeFilter = sp.radnik ?? "";

  let query = supabase
    .from("organization_documents")
    .select(
      "id, category, document_type, document_label, document_number, document_date, document_place, title, status, source, storage_path, created_at, employees(first_name, last_name)"
    )
    .eq("organization_id", org.id)
    .eq("year", year)
    .order("created_at", { ascending: false });

  if (category !== "all") query = query.eq("category", category);
  if (status !== "all") query = query.eq("status", status);
  if (employeeFilter) query = query.eq("employee_id", employeeFilter);

  const { data: documents } = await query;

  function filterUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    params.set("kategorija", overrides.kategorija ?? category);
    params.set("status", overrides.status ?? status);
    return `/dokumenti?${params.toString()}`;
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Evidencija dokumenata"
        description={`${org.name} · svi spremljeni i generisani dokumenti`}
      >
        <Button asChild size="sm">
          <Link href="/dokumenti/novi">+ Novi dokument</Link>
        </Button>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <Link
          href={filterUrl({ kategorija: "all" })}
          className={`px-2.5 py-1 rounded-md border text-xs ${
            category === "all" ? "bg-muted font-medium" : "text-muted-foreground"
          }`}
        >
          Sve kategorije
        </Link>
        {Object.entries(DOCUMENT_CATEGORIES).map(([key, val]) => (
          <Link
            key={key}
            href={filterUrl({ kategorija: key })}
            className={`px-2.5 py-1 rounded-md border text-xs ${
              category === key ? "bg-muted font-medium" : "text-muted-foreground"
            }`}
          >
            {val.label}
          </Link>
        ))}
      </div>

      <div className="flex gap-2">
        {(["issued", "cancelled", "all"] as const).map((s) => (
          <Link
            key={s}
            href={filterUrl({ status: s })}
            className={`px-2.5 py-1 rounded-md border text-xs ${
              status === s ? "bg-muted font-medium" : "text-muted-foreground"
            }`}
          >
            {s === "issued" ? "Izdat" : s === "cancelled" ? "Stornirano" : "Svi statusi"}
          </Link>
        ))}
      </div>

      {!documents?.length ? (
        <p className="text-sm text-muted-foreground py-8 text-center border rounded-md">
          Nema dokumenata za odabrane filtere. Generišite dokument kod radnika ili{" "}
          <Link href="/dokumenti/novi" className="underline">
            uploadujte novi
          </Link>
          .
        </p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Broj</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Kategorija</TableHead>
                <TableHead>Vrsta</TableHead>
                <TableHead>Radnik / naslov</TableHead>
                <TableHead>Izvor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => {
                const emp = doc.employees as {
                  first_name: string;
                  last_name: string;
                } | null;
                const empName = emp
                  ? `${emp.first_name} ${emp.last_name}`
                  : doc.title ?? "—";

                return (
                  <TableRow key={doc.id}>
                    <TableCell className="font-mono text-sm whitespace-nowrap">
                      {doc.document_number}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDate(doc.document_date)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {getCategoryLabel(doc.category)}
                    </TableCell>
                    <TableCell className="text-sm max-w-[180px] truncate">
                      {doc.document_label}
                    </TableCell>
                    <TableCell className="text-sm max-w-[160px] truncate">
                      {empName}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground capitalize">
                      {doc.source === "generated" ? "Generisan" : doc.source}
                    </TableCell>
                    <TableCell>
                      {doc.status === "cancelled" ? (
                        <Badge variant="secondary">Stornirano</Badge>
                      ) : (
                        <Badge variant="outline">Izdat</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DocumentRowActions
                        documentId={doc.id}
                        hasFile={Boolean(doc.storage_path)}
                        status={doc.status}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
