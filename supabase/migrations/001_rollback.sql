-- ============================================================
-- MoneySplit — Rollback for Migration 001: Profiles
-- ============================================================
-- Reverses all changes made by 001_profiles.sql
-- Run this in Supabase Dashboard → SQL Editor to rollback
-- ============================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS private_profiles_updated_at ON public.private_profiles;
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_updated_at();

-- Drop tables (cascading will clean up policies and indexes)
DROP TABLE IF EXISTS public.private_profiles;
DROP TABLE IF EXISTS public.profiles;
