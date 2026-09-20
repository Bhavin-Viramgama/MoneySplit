import { supabase } from '@/lib/supabase';
import type { FinanceEntry } from '@/types';

export const entriesService = {
  /**
   * Fetch all entries for a specific friendship
   */
  async getFriendshipEntries(friendshipId: string): Promise<FinanceEntry[]> {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('friendship_id', friendshipId)
      .order('entry_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as FinanceEntry[];
  },

  /**
   * Calculate net balance between two users from entries
   * Positive means current user is Owed money
   * Negative means current user Owes money
   */
  calculateNetBalance(entries: FinanceEntry[], currentUserId: string): number {
    return entries.reduce((acc, entry) => {
      // Skip rejected entries
      if (entry.status === 'rejected') return acc;
      // Skip pending settlements (not yet applied to balance)
      if (entry.is_settlement && entry.status === 'pending') return acc;

      if (entry.paid_by === currentUserId) {
        // I paid for it, so they owe me (balance goes up)
        return acc + entry.amount;
      } else if (entry.owed_by === currentUserId) {
        // They paid for it, so I owe them (balance goes down)
        return acc - entry.amount;
      }
      return acc;
    }, 0);
  },

  /**
   * Add a new expense (automatically accepted)
   */
  async addExpense(data: Omit<FinanceEntry, 'id' | 'created_at' | 'updated_at' | 'status' | 'is_settlement'>): Promise<FinanceEntry> {
    const { data: inserted, error } = await supabase
      .from('entries')
      .insert({
        ...data,
        is_settlement: false,
        status: 'accepted'
      })
      .select()
      .single();

    if (error) throw error;
    return inserted as FinanceEntry;
  },

  /**
   * Add a settlement (can be pending if receiver requires approval)
   */
  async addSettlement(
    data: Omit<FinanceEntry, 'id' | 'created_at' | 'updated_at' | 'status' | 'is_settlement'>,
    requireApproval: boolean = false
  ): Promise<FinanceEntry> {
    const { data: inserted, error } = await supabase
      .from('entries')
      .insert({
        ...data,
        is_settlement: true,
        status: requireApproval ? 'pending' : 'accepted'
      })
      .select()
      .single();

    if (error) throw error;
    return inserted as FinanceEntry;
  },

  /**
   * Update the status of an entry (e.g. accept a settlement)
   */
  async updateEntryStatus(entryId: string, status: 'accepted' | 'rejected'): Promise<FinanceEntry> {
    const { data, error } = await supabase
      .from('entries')
      .update({ status })
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw error;
    return data as FinanceEntry;
  },

  /**
   * Edit an existing entry
   */
  async editEntry(
    entryId: string,
    newAmount: number,
    newDescription: string,
    oldAmount: number,
    oldDescription: string
  ): Promise<FinanceEntry> {
    const { data, error } = await supabase
      .from('entries')
      .update({
        amount: newAmount,
        description: newDescription,
        is_edited: true,
        original_amount: oldAmount,
        original_description: oldDescription
      })
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw error;
    return data as FinanceEntry;
  },

  async deleteEntry(entryId: string): Promise<void> {
    const { error } = await supabase
      .from('finance_entries')
      .delete()
      .eq('id', entryId);

    if (error) throw error;
  },

  /**
   * Subscribe to real-time changes for a specific friendship's entries
   */
  subscribeToFriendshipEntries(
    friendshipId: string, 
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(`public:entries:friendship_id=eq.${friendshipId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'finance_entries',
          filter: `friendship_id=eq.${friendshipId}`
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();
  },

  unsubscribe(channel: ReturnType<typeof supabase.channel>) {
    return supabase.removeChannel(channel);
  }
};
