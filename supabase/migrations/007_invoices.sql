-- Partneri (needed before invoices FK)
CREATE TABLE IF NOT EXISTS partners (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              text        NOT NULL,
  tax_id            text,
  vat_number        text,
  address           text,
  city              text,
  email             text,
  phone             text,
  bank_account      text,
  type              text        NOT NULL DEFAULT 'both' CHECK (type IN ('customer','supplier','both')),
  keywords          text[]      NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partners_owner" ON partners
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Fakture i predračuni
CREATE TABLE IF NOT EXISTS invoices (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  partner_id          uuid        REFERENCES partners(id),
  type                text        NOT NULL DEFAULT 'invoice'
                                  CHECK (type IN ('invoice','proforma','credit_note')),
  status              text        NOT NULL DEFAULT 'draft'
                                  CHECK (status IN ('draft','open','paid','cancelled','overdue')),
  invoice_number      text,
  sequence_number     int         NOT NULL DEFAULT 0,
  year                int         NOT NULL,
  issue_date          date        NOT NULL DEFAULT CURRENT_DATE,
  due_date            date,
  delivery_date       date,
  currency            text        NOT NULL DEFAULT 'BAM',
  exchange_rate       numeric(10,6) NOT NULL DEFAULT 1.0,
  subtotal            numeric(14,2) NOT NULL DEFAULT 0,
  discount_amount     numeric(14,2) NOT NULL DEFAULT 0,
  vat_base_17         numeric(14,2) NOT NULL DEFAULT 0,
  vat_amount_17       numeric(14,2) NOT NULL DEFAULT 0,
  vat_base_0          numeric(14,2) NOT NULL DEFAULT 0,
  total               numeric(14,2) NOT NULL DEFAULT 0,
  note                text,
  credit_note_for     uuid        REFERENCES invoices(id),
  pdf_url             text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_owner" ON invoices
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Stavke fakture
CREATE TABLE IF NOT EXISTS invoice_items (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    uuid        NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description   text        NOT NULL,
  unit          text,
  quantity      numeric(10,3) NOT NULL DEFAULT 1,
  unit_price    numeric(14,2) NOT NULL DEFAULT 0,
  discount      numeric(5,2)  NOT NULL DEFAULT 0,
  vat_rate      numeric(5,2)  NOT NULL DEFAULT 17,
  subtotal      numeric(14,2) NOT NULL DEFAULT 0,
  vat_amount    numeric(14,2) NOT NULL DEFAULT 0,
  total         numeric(14,2) NOT NULL DEFAULT 0,
  sort_order    int           NOT NULL DEFAULT 0,
  created_at    timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_items_owner" ON invoice_items
  USING (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE organization_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
    )
  );

-- Unique index za numeriranje: jedna org može imati samo jedan sequence_number po tipu i godini
CREATE UNIQUE INDEX invoices_sequence_idx
  ON invoices(organization_id, type, year, sequence_number)
  WHERE sequence_number > 0;
