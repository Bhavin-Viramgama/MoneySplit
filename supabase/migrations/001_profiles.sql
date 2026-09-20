-- ============================================================
-- MoneySplit — Migration 001: Profiles (Public + Private)
-- ============================================================
-- Creates the profile tables, trigger for auto-creation on
-- auth.users insert, and RLS policies.
--
-- Prerequisites:
--   1. Supabase project with Auth enabled
--   2. Email confirmation DISABLED in Authentication → Providers → Email
--   3. Phone confirmation DISABLED in Authentication → Providers → Phone
--
-- To apply: Run this SQL in Supabase Dashboard → SQL Editor
-- To rollback: Run 001_rollback.sql
-- ============================================================

-- =====================
-- 1. Public Profiles
-- =====================

CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username            TEXT NOT NULL,
  username_normalized TEXT NOT NULL,
  display_name        TEXT,
  avatar_path         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Database-level validation (matches frontend Zod schema)
  CONSTRAINT profiles_username_length
    CHECK (char_length(username_normalized) BETWEEN 3 AND 24),
  CONSTRAINT profiles_username_format
    CHECK (username_normalized ~ '^[a-z0-9_]{3,24}$'),
  CONSTRAINT profiles_username_normalized_match
    CHECK (username_normalized = lower(trim(username)))
);

-- Unique index prevents duplicate usernames at the database level.
-- Concurrent INSERT attempts with the same username will fail here.
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_normalized
  ON public.profiles (username_normalized);

-- =====================
-- 2. Private Profiles
-- =====================

CREATE TABLE IF NOT EXISTS public.private_profiles (
  user_id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  recovery_email            TEXT,
  recovery_email_verified   BOOLEAN NOT NULL DEFAULT false,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- 3. Trigger Function
-- =====================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _username TEXT;
  _username_normalized TEXT;
  _display_name TEXT;
BEGIN
  -- Extract from user metadata (set during signUp via options.data)
  _username := NEW.raw_user_meta_data ->> 'username';
  _display_name := NEW.raw_user_meta_data ->> 'display_name';

  -- Server-side normalization (never trust client alone)
  _username_normalized := lower(trim(COALESCE(_username, '')));

  -- Validate username format at database level
  IF _username_normalized !~ '^[a-z0-9_]{3,24}$' THEN
    RAISE EXCEPTION 'Invalid username format: "%". Must be 3-24 chars, lowercase alphanumeric and underscores only.', _username_normalized;
  END IF;

  -- Create public profile
  -- ID is derived from auth.users.id — not from user-supplied metadata
  -- No ON CONFLICT: duplicate usernames should roll back the entire signup
  INSERT INTO public.profiles (id, username, username_normalized, display_name)
  VALUES (
    NEW.id,
    COALESCE(_username, _username_normalized),
    _username_normalized,
    COALESCE(_display_name, _username_normalized)
  );

  -- Create private profile
  INSERT INTO public.private_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger: fires after a new auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- 4. RLS Policies — profiles
-- =====================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read public profile data
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can update only their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- No INSERT policy — profiles are created only by the trigger
-- No DELETE policy — profiles are removed only by ON DELETE CASCADE

-- =====================
-- 5. RLS Policies — private_profiles
-- =====================

ALTER TABLE public.private_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read only their own private data
CREATE POLICY "private_profiles_select_own"
  ON public.private_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update only their own private data
CREATE POLICY "private_profiles_update_own"
  ON public.private_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No INSERT or DELETE policies — managed by trigger and cascade

-- =====================
-- 6. Updated_at auto-update
-- =====================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER private_profiles_updated_at
  BEFORE UPDATE ON public.private_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
