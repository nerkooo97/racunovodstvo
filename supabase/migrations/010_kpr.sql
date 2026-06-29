CREATE TABLE IF NOT EXISTS kpr_entries (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entry_number    int         NOT NULL,
  year            int         NOT NULL,
  entry_date      date        NOT NULL,
  document_type   text        NOT NULL,
  document_number text,
  partner_name    text,
  partner_tax_id  text,
  description     text,
  debit           numeric(14,2) NOT NULL DEFAULT 0,
  credit          numeric(14,2) NOT NULL DEFAULT 0,
  account_code    text,
  transaction_id  uuid        REFERENCES transactions(id),
  invoice_id      uuid        REFERENCES invoices(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, year, entry_number)
);

ALTER TABLE kpr_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kpr_entries_owner" ON kpr_entries
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );
