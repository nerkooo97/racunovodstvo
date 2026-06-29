CREATE TABLE IF NOT EXISTS membership_cards (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_name     text        NOT NULL,
  member_code     text        NOT NULL,
  club_name       text,
  color           text        NOT NULL DEFAULT '#1a56db',
  valid_from      date,
  valid_until     date,
  qr_data         text,
  pdf_url         text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE membership_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membership_cards_owner" ON membership_cards
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE INDEX membership_cards_org_idx ON membership_cards(organization_id);
