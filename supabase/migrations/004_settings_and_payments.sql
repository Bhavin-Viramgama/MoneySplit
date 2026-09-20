-- Migration 004: Payment Methods and Settings

CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('upi', 'bank_transfer', 'crypto', 'other')),
  details JSONB NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- payment_methods policies
-- Users can read their own payment methods, OR payment methods of their friends
CREATE POLICY "payment_methods_select"
  ON public.payment_methods FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE (f.user_id_1 = auth.uid() AND f.user_id_2 = payment_methods.user_id)
         OR (f.user_id_2 = auth.uid() AND f.user_id_1 = payment_methods.user_id)
    )
  );

-- Users can only insert/update/delete their own payment methods
CREATE POLICY "payment_methods_insert"
  ON public.payment_methods FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "payment_methods_update"
  ON public.payment_methods FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "payment_methods_delete"
  ON public.payment_methods FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add settings to profiles
ALTER TABLE public.profiles 
  ADD COLUMN require_settlement_approval BOOLEAN NOT NULL DEFAULT false;
