"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadOrganizationDocument } from "@/app/actions/organization-documents";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_TYPES,
  type DocumentCategory,
} from "@/lib/documents/registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FormSection from "@/components/shared/form-section";
import { Loader2, Upload } from "lucide-react";

interface Props {
  employees?: { id: string; name: string }[];
}

export default function UploadDocumentForm({ employees = [] }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<DocumentCategory>("general");
  const [documentType, setDocumentType] = useState("upload");
  const [documentDate, setDocumentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const typesForCategory = DOCUMENT_TYPES.filter((t) => t.category === category);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const form = new FormData(e.currentTarget);
      form.set("category", category);
      form.set("documentDate", documentDate);
      if (documentType !== "custom") {
        form.set("documentType", documentType);
        const typeDef = DOCUMENT_TYPES.find((t) => t.id === documentType);
        if (typeDef) form.set("documentLabel", typeDef.label);
      }

      const res = await uploadOrganizationDocument(form);
      if ("error" in res) {
        alert(res.error);
        return;
      }
      router.push("/dokumenti");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormSection
        title="Novi dokument"
        description="Upload bilo kojeg PDF-a ili slike u evidenciju. Kasnije možete dodati i generisane dokumente iz drugih modula."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Datoteka</Label>
            <Input
              name="file"
              type="file"
              required
              accept=".pdf,.png,.jpg,.jpeg,.docx,application/pdf,image/*"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kategorija</Label>
            <Select
              value={category}
              onValueChange={(v) => {
                const cat = v as DocumentCategory;
                setCategory(cat);
                const first = DOCUMENT_TYPES.find((t) => t.category === cat);
                if (first) setDocumentType(first.id);
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DOCUMENT_CATEGORIES).map(([key, val]) => (
                  <SelectItem key={key} value={key}>
                    {val.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tip dokumenta</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typesForCategory.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Prilagođeni tip…</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {documentType === "custom" ? (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">ID tipa (slug)</Label>
                <Input
                  name="documentType"
                  className="h-9 text-sm font-mono"
                  placeholder="npr. odluka-uprave"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Naziv tipa</Label>
                <Input
                  name="documentLabel"
                  className="h-9 text-sm"
                  placeholder="Odluka uprave"
                  required
                />
              </div>
            </>
          ) : null}

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datum dokumenta</Label>
            <Input
              className="h-9 text-sm"
              type="date"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Broj (opciono)</Label>
            <Input
              name="documentNumber"
              className="h-9 text-sm font-mono"
              placeholder="Auto ako prazno"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mjesto</Label>
            <Input name="documentPlace" className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Naslov (opciono)</Label>
            <Input name="title" className="h-9 text-sm" />
          </div>

          {employees.length > 0 ? (
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Radnik (opciono)</Label>
              <select
                name="employeeId"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue=""
              >
                <option value="">Nije vezano za radnika</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Napomena</Label>
            <Textarea name="notes" className="text-sm min-h-[56px]" />
          </div>
        </div>

        <div className="pt-3">
          <Button type="submit" size="sm" className="gap-1.5" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Spremi dokument
          </Button>
        </div>
      </FormSection>
    </form>
  );
}
