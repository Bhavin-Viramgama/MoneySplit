import { supabase } from '@/lib/supabase';
import type { PaymentMethod } from '@/types';

export const paymentsService = {
  /**
   * Fetch all payment methods for a specific user (self or friend)
   */
  async getUserPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as PaymentMethod[];
  },

  /**
   * Add a new payment method
   */
  async addPaymentMethod(data: Omit<PaymentMethod, 'id' | 'created_at' | 'updated_at'>): Promise<PaymentMethod> {
    // If this is set as default, we might need to unset others first
    // For simplicity, we can do it client side or just let it be (we order by is_default anyway)
    // But ideally we'd unset others if this is true
    if (data.is_default) {
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', data.user_id)
        .eq('is_default', true);
    }

    const { data: inserted, error } = await supabase
      .from('payment_methods')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return inserted as PaymentMethod;
  },

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(id: string): Promise<void> {
    const { error } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Update settings (require_settlement_approval)
   */
  async updateSettlementSetting(userId: string, requireApproval: boolean): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ require_settlement_approval: requireApproval })
      .eq('id', userId);

    if (error) throw error;
  },

  /**
   * Update settings (auto_accept_requests)
   */
  async updateAutoAcceptSetting(userId: string, autoAccept: boolean): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ auto_accept_requests: autoAccept })
      .eq('id', userId);

    if (error) throw error;
  }
};
