-- Migration 006: Add history clearing tracking

ALTER TABLE public.friendships
ADD COLUMN user_1_cleared_at TIMESTAMPTZ,
ADD COLUMN user_2_cleared_at TIMESTAMPTZ;
