-- Migration 014: Add Delete Policies for Groups

-- Allow the creator of a group to delete it (Delete Group)
CREATE POLICY "groups_delete"
  ON public.groups FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Allow a user to remove themselves from a group (Leave Group)
CREATE POLICY "group_members_delete"
  ON public.group_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
