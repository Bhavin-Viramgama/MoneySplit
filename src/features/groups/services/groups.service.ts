import { supabase } from '@/lib/supabase';
import type { Group, GroupMember, GroupExpense } from '@/types';

export interface GroupBalance {
  user_id: string;
  net_balance: number; // positive = owed money, negative = owes money
}

export interface SimplifiedDebt {
  from: string; // user_id who owes
  to: string; // user_id who is owed
  amount: number;
}

export const groupsService = {
  /**
   * Create a new group and add the creator as the first member
   */
  async createGroup(name: string, creatorId: string): Promise<Group> {
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({ name, created_by: creatorId })
      .select()
      .single();

    if (groupError) throw groupError;

    const { error: memberError } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: creatorId, status: 'accepted' });

    if (memberError) throw memberError;

    return group as Group;
  },

  /**
   * Get all groups the current user is a member of
   */
  async getMyGroups(_userId: string): Promise<Group[]> {
    const { data, error } = await supabase
      .from('groups')
      .select(`
        *,
        members:group_members(
          user_id,
          status,
          joined_at,
          profile:profiles(*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Type casting
    return data as any as Group[];
  },

  /**
   * Add a member to a group
   */
  async addMemberByUsername(groupId: string, username: string): Promise<GroupMember> {
    // Look up user by username
    const { data: friend, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (profileError || !friend) {
      throw new Error('User not found.');
    }

    const { data: member, error: memberError } = await supabase
      .from('group_members')
      .insert({ 
        group_id: groupId, 
        user_id: friend.id,
        status: friend.auto_accept_requests ? 'accepted' : 'pending'
      })
      .select()
      .single();

    if (memberError) {
      if (memberError.code === '23505') {
        throw new Error('User is already in the group.');
      }
      throw memberError;
    }

    return { ...member, profile: friend } as GroupMember;
  },

  /**
   * Add an expense to a group with specific splits
   */
  async addGroupExpense(
    groupId: string,
    creatorId: string,
    paidBy: string,
    amount: number,
    description: string,
    splits: { user_id: string; amount_owed: number }[]
  ): Promise<GroupExpense> {
    const totalSplit = splits.reduce((acc, s) => acc + s.amount_owed, 0);
    // Tolerate small floating point differences
    if (Math.abs(totalSplit - amount) > 0.05) {
      throw new Error(`Splits do not equal total amount (Total: ${amount}, Splits: ${totalSplit})`);
    }

    const { data: expense, error: expenseError } = await supabase
      .from('group_expenses')
      .insert({
        group_id: groupId,
        creator_id: creatorId,
        paid_by: paidBy,
        amount,
        description,
        entry_date: new Date().toISOString()
      })
      .select()
      .single();

    if (expenseError) throw expenseError;

    const splitsToInsert = splits.map(s => ({
      expense_id: expense.id,
      user_id: s.user_id,
      amount_owed: s.amount_owed
    }));

    const { error: splitError } = await supabase
      .from('group_splits')
      .insert(splitsToInsert);

    if (splitError) {
      // Cleanup expense if splits fail (naive rollback)
      await supabase.from('group_expenses').delete().eq('id', expense.id);
      throw splitError;
    }

    return expense as GroupExpense;
  },

  /**
   * Edit a group expense and its splits
   */
  async editGroupExpense(
    expenseId: string,
    newAmount: number,
    newDescription: string,
    oldAmount: number,
    oldDescription: string,
    splits: { user_id: string; amount_owed: number }[]
  ): Promise<GroupExpense> {
    const totalSplit = splits.reduce((acc, s) => acc + s.amount_owed, 0);
    if (Math.abs(totalSplit - newAmount) > 0.05) {
      throw new Error(`Splits do not equal total amount (Total: ${newAmount}, Splits: ${totalSplit})`);
    }

    const { data: expense, error: expenseError } = await supabase
      .from('group_expenses')
      .update({
        amount: newAmount,
        description: newDescription,
        is_edited: true,
        original_amount: oldAmount,
        original_description: oldDescription
      })
      .eq('id', expenseId)
      .select()
      .single();

    if (expenseError) throw expenseError;

    // Delete old splits
    const { error: deleteError } = await supabase
      .from('group_splits')
      .delete()
      .eq('expense_id', expenseId);

    if (deleteError) throw deleteError;

    // Insert new splits
    const splitsToInsert = splits.map(s => ({
      expense_id: expenseId,
      user_id: s.user_id,
      amount_owed: s.amount_owed
    }));

    const { error: splitError } = await supabase
      .from('group_splits')
      .insert(splitsToInsert);

    if (splitError) throw splitError;

    return expense as GroupExpense;
  },

  async deleteGroupExpense(expenseId: string): Promise<void> {
    // Note: Due to foreign key constraints with ON DELETE CASCADE (if configured), 
    // deleting the expense will automatically delete the associated splits.
    // If not configured, we should delete splits first. Assuming CASCADE is not guaranteed, we delete splits first.
    const { error: splitError } = await supabase
      .from('group_splits')
      .delete()
      .eq('expense_id', expenseId);

    if (splitError) throw splitError;

    const { error: expenseError } = await supabase
      .from('group_expenses')
      .delete()
      .eq('id', expenseId);

    if (expenseError) throw expenseError;
  },

  /**
   * Get all expenses for a group
   */
  async getGroupExpenses(groupId: string): Promise<GroupExpense[]> {
    const { data, error } = await supabase
      .from('group_expenses')
      .select(`
        *,
        payer:profiles!group_expenses_paid_by_fkey(*),
        splits:group_splits(
          *,
          profile:profiles(*)
        )
      `)
      .eq('group_id', groupId)
      .order('entry_date', { ascending: true });

    if (error) throw error;
    return data as any as GroupExpense[];
  },

  /**
   * Calculate net balances for each user in the group based on expenses
   */
  calculateBalances(expenses: GroupExpense[]): Record<string, number> {
    const balances: Record<string, number> = {};

    expenses.forEach(expense => {
      // Person who paid gets credited the full amount
      if (!balances[expense.paid_by]) balances[expense.paid_by] = 0;
      balances[expense.paid_by] += expense.amount;

      // People who owe get debited their split
      expense.splits?.forEach(split => {
        if (!balances[split.user_id]) balances[split.user_id] = 0;
        balances[split.user_id] -= Math.round(split.amount_owed * 100) / 100;
      });
    });

    // Clean up floating point inaccuracies on final balances
    Object.keys(balances).forEach(id => {
      balances[id] = Math.round(balances[id] * 100) / 100;
    });

    return balances;
  },

  /**
   * Debt Simplification Algorithm
   * Takes a map of user_id -> net_balance and returns minimal transactions to settle
   */
  simplifyDebts(balances: Record<string, number>): SimplifiedDebt[] {
    const debtors: { user_id: string; amount: number }[] = [];
    const creditors: { user_id: string; amount: number }[] = [];

    // Separate into who owes (debtors) and who is owed (creditors)
    for (const [user_id, balance] of Object.entries(balances)) {
      if (balance < -0.01) {
        debtors.push({ user_id, amount: Math.abs(balance) });
      } else if (balance > 0.01) {
        creditors.push({ user_id, amount: balance });
      }
    }

    // Sort by largest amounts first to minimize transactions
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const transactions: SimplifiedDebt[] = [];
    let i = 0; // debtors index
    let j = 0; // creditors index

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      // Find the smaller of the two amounts
      const amount = Math.min(debtor.amount, creditor.amount);

      transactions.push({
        from: debtor.user_id,
        to: creditor.user_id,
        amount
      });

      debtor.amount -= amount;
      creditor.amount -= amount;

      // Move indices if settled
      if (Math.abs(debtor.amount) < 0.01) i++;
      if (Math.abs(creditor.amount) < 0.01) j++;
    }

    return transactions;
  },

  /**
   * Leave a group (only possible if user has no outstanding balances)
   */
  async leaveGroup(groupId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Delete a group (only possible by the creator)
   */
  async deleteGroup(groupId: string): Promise<void> {
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (error) {
      throw new Error(error.message);
    }
  }
};
