-- Migration 015: Add Delete Policies for Group Expenses

-- A user can delete a group expense if they created it
CREATE POLICY "group_expenses_delete_creator"
  ON public.group_expenses FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());
