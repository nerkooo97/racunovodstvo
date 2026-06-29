-- Rješavanje beskonačne rekurzije u RLS politikama
-- Problem: Policy na organizations koristi organization_members, a policy na organization_members koristi organizations.

-- 1. Ukloni problematičnu politiku
DROP POLICY IF EXISTS "org_members_owner_manage" ON public.organization_members;

-- 2. Kreiraj helper funkciju sa SECURITY DEFINER koja zaobilazi RLS provjeru za tabelu organizations
CREATE OR REPLACE FUNCTION public.check_is_org_owner(org_id uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.organizations 
    WHERE id = org_id AND owner_id = user_uuid
  );
$$;

-- 3. Ponovo kreiraj politiku koristeći novu funkciju
CREATE POLICY "org_members_owner_manage" ON public.organization_members
  FOR ALL TO authenticated
  USING (public.check_is_org_owner(organization_id, auth.uid()))
  WITH CHECK (public.check_is_org_owner(organization_id, auth.uid()));
