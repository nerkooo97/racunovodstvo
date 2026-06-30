-- KP-1042: Knjiga prometa za paušalne obrtnike (čl. 49 Pravilnika)
-- Kolone prema zvaničnom obrascu:
--   cash_amount    = kol. 12: gotovina i/ili čekovi
--   noncash_amount = kol. 13: bezgotovinsko od pravnih lica (fakture)
--   total_amount   = kol. 14: ukupno (computed)
CREATE TABLE IF NOT EXISTS kp_entries (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entry_number      int           NOT NULL,
  year              int           NOT NULL,
  entry_date        date          NOT NULL,
  document_number   text,
  document_type     text,
  cash_amount       numeric(14,2) NOT NULL DEFAULT 0,
  noncash_amount    numeric(14,2) NOT NULL DEFAULT 0,
  total_amount      numeric(14,2) GENERATED ALWAYS AS (cash_amount + noncash_amount) STORED,
  transaction_id    uuid          REFERENCES transactions(id) ON DELETE SET NULL,
  notes             text,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  UNIQUE(organization_id, year, entry_number)
);

ALTER TABLE kp_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kp_entries_owner" ON kp_entries
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS kp_entries_org_year_idx ON kp_entries (organization_id, year);
