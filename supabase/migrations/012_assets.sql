CREATE TABLE IF NOT EXISTS fixed_assets (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              text        NOT NULL,
  asset_type        text        NOT NULL,
  acquisition_date  date        NOT NULL,
  acquisition_cost  numeric(14,2) NOT NULL,
  depreciation_rate numeric(8,4) NOT NULL,
  useful_life_years int         NOT NULL,
  disposal_date     date,
  disposal_value    numeric(14,2),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fixed_assets_owner" ON fixed_assets
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS fixed_asset_years (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        uuid        NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
  year            int         NOT NULL,
  annual_amount   numeric(14,2) NOT NULL,
  accumulated     numeric(14,2) NOT NULL,
  book_value      numeric(14,2) NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(asset_id, year)
);

ALTER TABLE fixed_asset_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fixed_asset_years_owner" ON fixed_asset_years
  USING (
    asset_id IN (
      SELECT id FROM fixed_assets
      WHERE organization_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
    )
  );
