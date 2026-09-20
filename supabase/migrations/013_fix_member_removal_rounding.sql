-- Migration 013: Fix member removal rounding and sanitize group splits

-- 1. Round all existing group_splits.amount_owed to 2 decimal places
UPDATE public.group_splits
SET amount_owed = ROUND(amount_owed::numeric, 2);

-- 2. Recalculate and fix any off-by-penny splits for existing expenses
DO $$
DECLARE
  exp RECORD;
  sum_splits NUMERIC;
  diff NUMERIC;
  target_user UUID;
BEGIN
  FOR exp IN SELECT id, amount FROM public.group_expenses LOOP
    SELECT COALESCE(SUM(amount_owed), 0) INTO sum_splits 
    FROM public.group_splits 
    WHERE expense_id = exp.id;

    diff := exp.amount - sum_splits;

    IF diff <> 0 AND sum_splits > 0 THEN
      SELECT user_id INTO target_user 
      FROM public.group_splits 
      WHERE expense_id = exp.id 
      LIMIT 1;

      IF target_user IS NOT NULL THEN
        UPDATE public.group_splits 
        SET amount_owed = amount_owed + diff 
        WHERE expense_id = exp.id AND user_id = target_user;
      END IF;
    END IF;
  END LOOP;
END $$;

-- 3. Replace handle_group_member_removal trigger function with precise 2-decimal rounding
CREATE OR REPLACE FUNCTION public.handle_group_member_removal()
RETURNS TRIGGER AS $$
DECLARE
  exp_record RECORD;
  remaining_users_count INT;
  deleted_amount NUMERIC;
  additional_share NUMERIC;
  total_expense_amount NUMERIC;
  current_split_sum NUMERIC;
  diff NUMERIC;
  first_user_id UUID;
BEGIN
  -- For every expense in the group where the user had a split
  FOR exp_record IN 
    SELECT gs.expense_id, gs.amount_owed 
    FROM public.group_splits gs 
    JOIN public.group_expenses ge ON ge.id = gs.expense_id
    WHERE ge.group_id = OLD.group_id AND gs.user_id = OLD.user_id
  LOOP
    deleted_amount := exp_record.amount_owed;

    SELECT amount INTO total_expense_amount 
    FROM public.group_expenses 
    WHERE id = exp_record.expense_id;

    -- Delete the user's split
    DELETE FROM public.group_splits 
    WHERE expense_id = exp_record.expense_id AND user_id = OLD.user_id;

    -- Count remaining users in this split
    SELECT count(*) INTO remaining_users_count 
    FROM public.group_splits 
    WHERE expense_id = exp_record.expense_id;

    IF remaining_users_count > 0 THEN
      -- Calculate rounded additional share per user (2 decimal places)
      additional_share := ROUND(deleted_amount / remaining_users_count, 2);

      -- Update remaining users with rounded additional share
      UPDATE public.group_splits
      SET amount_owed = ROUND(amount_owed + additional_share, 2)
      WHERE expense_id = exp_record.expense_id;

      -- Check sum of splits against total_expense_amount to fix rounding penny error
      SELECT SUM(amount_owed) INTO current_split_sum 
      FROM public.group_splits 
      WHERE expense_id = exp_record.expense_id;

      diff := total_expense_amount - current_split_sum;

      IF diff <> 0 THEN
        -- Adjust the difference on the first remaining split
        SELECT user_id INTO first_user_id 
        FROM public.group_splits 
        WHERE expense_id = exp_record.expense_id 
        LIMIT 1;

        IF first_user_id IS NOT NULL THEN
          UPDATE public.group_splits
          SET amount_owed = amount_owed + diff
          WHERE expense_id = exp_record.expense_id AND user_id = first_user_id;
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
