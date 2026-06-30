-- EPO-1044 obaveze strana: primljene fakture od dobavljača (čl. 51 Pravilnika)
CREATE TABLE IF NOT EXISTS received_invoices (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  partner_id        uuid          REFERENCES partners(id) ON DELETE SET NULL,
  partner_name      text          NOT NULL,
  partner_tax_id    text,
  invoice_number    text,
  invoice_date      date          NOT NULL,
  received_date     date,
  amount            numeric(14,2) NOT NULL,
  payment_date      date,
  paid_amount       numeric(14,2) NOT NULL DEFAULT 0,
  kpr_entry_id      uuid          REFERENCES kpr_entries(id) ON DELETE SET NULL,
  notes             text,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE received_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "received_invoices_owner" ON received_invoices
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS received_invoices_org_idx ON received_invoices (organization_id);
CREATE INDEX IF NOT EXISTS received_invoices_partner_idx ON received_invoices (partner_id) WHERE partner_id IS NOT NULL;
