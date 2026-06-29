"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cancelOrganizationDocument } from "@/app/actions/organization-documents";
import { Button } from "@/components/ui/button";
import { FileText, XCircle } from "lucide-react";

interface Props {
  documentId: string;
  hasFile: boolean;
  status: string;
}

export default function DocumentRowActions({
  documentId,
  hasFile,
  status,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleCancel() {
    if (!confirm("Stornirati dokument?")) return;
    startTransition(async () => {
      const res = await cancelOrganizationDocument(documentId);
      if ("error" in res) alert(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex justify-end gap-1">
      {hasFile && status === "issued" ? (
        <Button asChild variant="ghost" size="sm" className="h-8 gap-1">
          <Link href={`/api/documents/file/${documentId}`} target="_blank">
            <FileText className="h-3.5 w-3.5" />
            PDF
          </Link>
        </Button>
      ) : null}
      {status === "issued" ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8"
          disabled={pending}
          onClick={handleCancel}
        >
          <XCircle className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
