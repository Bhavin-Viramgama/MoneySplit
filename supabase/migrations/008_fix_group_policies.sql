-- Migration 008: Fix infinite recursion in group policies

-- Create a SECURITY DEFINER function to bypass RLS when checking membership
CREATE OR REPLACE FUNCTION public.is_group_member(check_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = check_group_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old recursive policies
DROP POLICY IF EXISTS "groups_select_member" ON public.groups;
DROP POLICY IF EXISTS "groups_update_member" ON public.groups;

DROP POLICY IF EXISTS "group_members_select" ON public.group_members;
DROP POLICY IF EXISTS "group_members_insert" ON public.group_members;

DROP POLICY IF EXISTS "group_expenses_select" ON public.group_expenses;
DROP POLICY IF EXISTS "group_expenses_insert" ON public.group_expenses;

DROP POLICY IF EXISTS "group_splits_select" ON public.group_splits;

-- Recreate policies using the helper function
CREATE POLICY "groups_select_member"
  ON public.groups FOR SELECT
  TO authenticated
  USING ( public.is_group_member(id) );

CREATE POLICY "groups_update_member"
  ON public.groups FOR UPDATE
  TO authenticated
  USING ( public.is_group_member(id) );

CREATE POLICY "group_members_select"
  ON public.group_members FOR SELECT
  TO authenticated
  USING ( public.is_group_member(group_id) );

CREATE POLICY "group_members_insert"
  ON public.group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    public.is_group_member(group_id) OR
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_id AND g.created_by = auth.uid()
    )
  );

CREATE POLICY "group_expenses_select"
  ON public.group_expenses FOR SELECT
  TO authenticated
  USING ( public.is_group_member(group_id) );

CREATE POLICY "group_expenses_insert"
  ON public.group_expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_group_member(group_id) AND creator_id = auth.uid()
  );

CREATE POLICY "group_splits_select"
  ON public.group_splits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_expenses ge
      WHERE ge.id = group_splits.expense_id AND public.is_group_member(ge.group_id)
    )
  );
