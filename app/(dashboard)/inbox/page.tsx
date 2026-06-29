import PageHeader from "@/components/shared/page-header";

export default function InboxPage() {
  return (
    <div>
      <PageHeader
        title="Inbox"
        description="Ulazni dokumenti i računi"
      />
      <p className="text-muted-foreground text-sm mt-6">
        Ovdje će biti prikazani ulazni dokumenti. Uskoro.
      </p>
    </div>
  );
}
