-- Migration 012: Invites System

-- Add auto accept requests preference to profiles
ALTER TABLE public.profiles
ADD COLUMN auto_accept_requests BOOLEAN NOT NULL DEFAULT false;

-- Add creator_id to friendships to track who sent the request
ALTER TABLE public.friendships
ADD COLUMN creator_id UUID REFERENCES public.profiles(id);

-- Add status to group members
ALTER TABLE public.group_members
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted'));

-- Allow users to update their own status (to accept) or for creators to update
CREATE POLICY "group_members_update_own"
  ON public.group_members FOR UPDATE
  TO authenticated
  USING ( user_id = auth.uid() OR EXISTS(SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.created_by = auth.uid()) )
  WITH CHECK ( user_id = auth.uid() OR EXISTS(SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.created_by = auth.uid()) );

-- Allow users to delete their own membership (reject invite)
CREATE POLICY "group_members_delete_own"
  ON public.group_members FOR DELETE
  TO authenticated
  USING ( user_id = auth.uid() OR EXISTS(SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.created_by = auth.uid()) );

-- Trigger function to redistribute debt when a member is removed (or rejects invite)
CREATE OR REPLACE FUNCTION public.handle_group_member_removal()
RETURNS TRIGGER AS $$
DECLARE
  exp_record RECORD;
  remaining_users_count INT;
  deleted_amount NUMERIC;
  additional_share NUMERIC;
BEGIN
  -- For every expense in the group where the user had a split
  FOR exp_record IN 
    SELECT gs.expense_id, gs.amount_owed 
    FROM public.group_splits gs 
    JOIN public.group_expenses ge ON ge.id = gs.expense_id
    WHERE ge.group_id = OLD.group_id AND gs.user_id = OLD.user_id
  LOOP
    deleted_amount := exp_record.amount_owed;

    -- Delete the user's split
    DELETE FROM public.group_splits 
    WHERE expense_id = exp_record.expense_id AND user_id = OLD.user_id;

    -- Count remaining users in this split
    SELECT count(*) INTO remaining_users_count 
    FROM public.group_splits 
    WHERE expense_id = exp_record.expense_id;

    IF remaining_users_count > 0 THEN
      -- Calculate the additional share per user
      additional_share := deleted_amount / remaining_users_count;

      -- Update remaining users (redistribute the rejected user's share equally)
      UPDATE public.group_splits
      SET amount_owed = amount_owed + additional_share
      WHERE expense_id = exp_record.expense_id;
    END IF;
  END LOOP;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER group_member_removal_trigger
  AFTER DELETE ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_group_member_removal();
