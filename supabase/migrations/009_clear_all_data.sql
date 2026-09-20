-- Clear all application data from tables
-- Execute this in the Supabase SQL Editor to wipe out all entries, groups, friendships, and profiles.

TRUNCATE TABLE group_expenses RESTART IDENTITY CASCADE;
TRUNCATE TABLE group_members RESTART IDENTITY CASCADE;
TRUNCATE TABLE groups RESTART IDENTITY CASCADE;
TRUNCATE TABLE finance_entries RESTART IDENTITY CASCADE;
TRUNCATE TABLE friendships RESTART IDENTITY CASCADE;
TRUNCATE TABLE profiles RESTART IDENTITY CASCADE;

-- If you also want to remove auth users (if using Supabase auth), run this carefully:
-- DELETE FROM auth.users;
