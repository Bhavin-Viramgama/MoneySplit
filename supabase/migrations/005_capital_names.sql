-- Migration 005: Allow capital letters in usernames

-- Drop the old constraint that forces lowercase
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_username_check;

-- Add a new constraint that allows a-zA-Z0-9_
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_check 
  CHECK (username ~ '^[a-zA-Z0-9_]{3,20}$');
