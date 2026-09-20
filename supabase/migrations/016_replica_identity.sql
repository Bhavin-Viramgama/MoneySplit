-- Migration 016: Set Replica Identity Full for Realtime Filters
-- This allows Supabase realtime to send the full old record on UPDATE/DELETE,
-- which is required for filters like `friendship_id=eq...` to work on DELETE events.

ALTER TABLE public.entries REPLICA IDENTITY FULL;
ALTER TABLE public.group_expenses REPLICA IDENTITY FULL;
ALTER TABLE public.friendships REPLICA IDENTITY FULL;
ALTER TABLE public.group_members REPLICA IDENTITY FULL;
ALTER TABLE public.group_splits REPLICA IDENTITY FULL;
