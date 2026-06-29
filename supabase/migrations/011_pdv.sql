CREATE TABLE IF NOT EXISTS pdv_records (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  record_type     text        NOT NULL CHECK (record_type IN ('kuf','kif')),
  period_year     int         NOT NULL,
  period_month    int         NOT NULL,
  entry_date      date        NOT NULL,
  document_type   text        NOT NULL,
  document_number text,
  partner_name    text,
  partner_tax_id  text,
  base_17         numeric(14,2) NOT NULL DEFAULT 0,
  vat_17          numeric(14,2) NOT NULL DEFAULT 0,
  base_0          numeric(14,2) NOT NULL DEFAULT 0,
  total           numeric(14,2) NOT NULL DEFAULT 0,
  invoice_id      uuid        REFERENCES invoices(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pdv_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pdv_records_owner" ON pdv_records
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE INDEX pdv_records_period_idx ON pdv_records(organization_id, period_year, period_month);
