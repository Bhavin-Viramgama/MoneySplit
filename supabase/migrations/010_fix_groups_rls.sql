-- Migration 010: Fix groups SELECT policy so creators can read the group immediately

DROP POLICY IF EXISTS "groups_select_member" ON public.groups;

CREATE POLICY "groups_select_member"
  ON public.groups FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR 
    public.is_group_member(id)
  );
