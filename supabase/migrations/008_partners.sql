-- Partners table already created in 007_invoices.sql
-- This migration adds additional indices and constraints

CREATE INDEX IF NOT EXISTS partners_org_idx ON partners(organization_id);
CREATE INDEX IF NOT EXISTS partners_name_idx ON partners(organization_id, name);
