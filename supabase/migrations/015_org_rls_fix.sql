-- Fix organization_members RLS: replace owner-based check with proper user-based policies
DROP POLICY IF EXISTS "org_members_owner" ON organization_members;

-- User can see their own memberships
CREATE POLICY "org_members_select" ON organization_members
  FOR SELECT USING (user_id = auth.uid());

-- User can insert themselves as a member
CREATE POLICY "org_members_insert" ON organization_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Org owners can manage all members of their org
CREATE POLICY "org_members_owner_manage" ON organization_members
  FOR ALL USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Allow org members (non-owners) to SELECT their organization
CREATE POLICY "org_member_select" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
