-- Business plan: više korisnika po organizaciji
CREATE TABLE IF NOT EXISTS organization_members (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text        NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member','accountant')),
  invited_at      timestamptz NOT NULL DEFAULT now(),
  accepted_at     timestamptz,
  UNIQUE(organization_id, user_id)
);

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_owner" ON organization_members
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
    OR user_id = auth.uid()
  );
