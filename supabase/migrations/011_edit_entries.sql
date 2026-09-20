-- Migration 011: Edit Entries Tracking

-- Add edit columns to 1-on-1 entries
ALTER TABLE public.entries
ADD COLUMN is_edited BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN original_amount NUMERIC(12, 2),
ADD COLUMN original_description TEXT;

-- Add edit columns to group expenses
ALTER TABLE public.group_expenses
ADD COLUMN is_edited BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN original_amount NUMERIC(12, 2),
ADD COLUMN original_description TEXT;

-- Policy for updating group expenses
CREATE POLICY "group_expenses_update_creator"
  ON public.group_expenses FOR UPDATE
  TO authenticated
  USING ( creator_id = auth.uid() )
  WITH CHECK ( creator_id = auth.uid() );

-- Policy for updating group splits (when editing an expense)
-- Note: A creator needs to be able to modify the splits for an expense they created.
-- We can drop old splits and insert new ones, or update existing ones.
CREATE POLICY "group_splits_update_creator"
  ON public.group_splits FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_expenses ge
      WHERE ge.id = group_splits.expense_id AND ge.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_expenses ge
      WHERE ge.id = group_splits.expense_id AND ge.creator_id = auth.uid()
    )
  );

CREATE POLICY "group_splits_delete_creator"
  ON public.group_splits FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_expenses ge
      WHERE ge.id = group_splits.expense_id AND ge.creator_id = auth.uid()
    )
  );

-- Function to protect entries from unauthorized field modifications
CREATE OR REPLACE FUNCTION public.check_entry_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If non-creator is updating, they can only change status
  IF auth.uid() != OLD.creator_id THEN
    IF NEW.amount != OLD.amount OR NEW.description != OLD.description OR NEW.is_edited != OLD.is_edited THEN
      RAISE EXCEPTION 'Only the creator can edit the entry details.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_entry_update_trigger
  BEFORE UPDATE ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.check_entry_update();
