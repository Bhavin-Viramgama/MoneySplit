-- Migration 003: Finance Entries

CREATE TABLE public.entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  friendship_id UUID NOT NULL REFERENCES public.friendships(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.profiles(id),
  paid_by UUID NOT NULL REFERENCES public.profiles(id),
  owed_by UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  is_settlement BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'rejected')),
  entry_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

-- entries policies
-- A user can select an entry if they are part of the friendship
CREATE POLICY "entries_select_friendship"
  ON public.entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.id = entries.friendship_id
      AND (f.user_id_1 = auth.uid() OR f.user_id_2 = auth.uid())
    )
  );

-- A user can insert an entry if they are part of the friendship
CREATE POLICY "entries_insert_friendship"
  ON public.entries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.id = friendship_id
      AND (f.user_id_1 = auth.uid() OR f.user_id_2 = auth.uid())
    )
    AND creator_id = auth.uid()
  );

-- A user can update an entry (e.g., to accept a pending settlement) if they are part of the friendship
CREATE POLICY "entries_update_friendship"
  ON public.entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.id = entries.friendship_id
      AND (f.user_id_1 = auth.uid() OR f.user_id_2 = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.id = friendship_id
      AND (f.user_id_1 = auth.uid() OR f.user_id_2 = auth.uid())
    )
  );

-- A user can delete an entry if they created it
CREATE POLICY "entries_delete_creator"
  ON public.entries FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());


CREATE TRIGGER entries_updated_at
  BEFORE UPDATE ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable replication for realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.entries;
