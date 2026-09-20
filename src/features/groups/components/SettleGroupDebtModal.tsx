import { useState, useEffect } from 'react';
import { X, HandCoins, ArrowRight, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/Button';
import { groupsService, type SimplifiedDebt } from '../services/groups.service';
import { paymentsService } from '@/features/payments/services/payments.service';
import type { Group, GroupMember, PaymentMethod } from '@/types';
import type { User } from '@supabase/supabase-js';
import { formatCurrency, classNames } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  members: GroupMember[];
  user: User;
  balances: Record<string, number>;
  onSettled: () => void;
}

export function SettleGroupDebtModal({ isOpen, onClose, group, members, user, balances, onSettled }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDebt, setSelectedDebt] = useState<SimplifiedDebt | null>(null);
  
  // Payment methods for the recipient
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    if (selectedDebt) {
      loadPaymentMethods(selectedDebt.to);
    } else {
      setPaymentMethods([]);
    }
  }, [selectedDebt]);

  const loadPaymentMethods = async (recipientId: string) => {
    try {
      setLoadingPayments(true);
      const methods = await paymentsService.getUserPaymentMethods(recipientId);
      setPaymentMethods(methods);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPayments(false);
    }
  };

  if (!isOpen) return null;

  const simplified = groupsService.simplifyDebts(balances);
  const myDebts = simplified.filter(d => d.from === user.id || d.to === user.id);

  const handleSettle = async () => {
    if (!selectedDebt) {
      setError('Please select a debt to settle.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await groupsService.addGroupExpense(
        group.id,
        user.id,
        selectedDebt.from, 
        selectedDebt.amount,
        'Settlement',
        [{ user_id: selectedDebt.to, amount_owed: selectedDebt.amount }] 
      );

      onSettled();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record settlement.');
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (id: string) => {
    if (id === user.id) return 'You';
    const profile = members.find(m => m.user_id === id)?.profile;
    return profile?.display_name || profile?.username || 'Unknown';
  };

  // Determine QR Code information for the selected debt (only if current user is paying)
  let upiId = null;
  let upiLink = '';
  const iAmPaying = selectedDebt?.from === user.id;

  if (selectedDebt && iAmPaying && paymentMethods.length > 0) {
    const defaultMethod = paymentMethods.find(m => m.is_default) || paymentMethods[0];
    upiId = defaultMethod?.type === 'upi' ? defaultMethod?.details?.upi_id : null;
    
    if (upiId) {
      const payeeName = defaultMethod?.details?.payee_name || getUserName(selectedDebt.to);
      upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName || '')}&am=${selectedDebt.amount}&cu=INR`;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/60 p-8 shadow-2xl relative backdrop-blur-xl max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-ms-accent)]/10 text-[var(--color-ms-accent)] border border-[var(--color-ms-accent)]/20 shadow-[var(--shadow-ms-glow)]">
            <HandCoins className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-semibold text-white">Settle a Debt</h2>
        </div>
        
        {myDebts.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            You don't have any outstanding debts in this group!
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-slate-400">Select a specific debt to record it as paid:</p>
            
            <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
              {myDebts.map((debt, idx) => {
                const isSelected = selectedDebt === debt;
                const isUserPaying = debt.from === user.id;

                return (
                  <div 
                    key={idx}
                    onClick={() => setSelectedDebt(debt)}
                    className={classNames(
                      "cursor-pointer p-4 rounded-xl border transition-all duration-200",
                      isSelected 
                        ? "bg-[var(--color-ms-accent)]/10 border-[var(--color-ms-accent)]/30 shadow-[var(--shadow-ms-sm)]" 
                        : "bg-white/5 border-white/5 hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={classNames(
                          "font-medium",
                          isUserPaying ? "text-rose-400" : "text-emerald-400"
                        )}>
                          {getUserName(debt.from)}
                        </span>
                        <ArrowRight className="h-4 w-4 text-slate-500" />
                        <span className={classNames(
                          "font-medium",
                          !isUserPaying ? "text-rose-400" : "text-emerald-400"
                        )}>
                          {getUserName(debt.to)}
                        </span>
                      </div>
                      <span className="font-bold text-white tracking-tight">
                        {formatCurrency(debt.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* QR Code Section */}
            {selectedDebt && (
              <div className="mt-6 pt-6 border-t border-white/10">
                {loadingPayments ? (
                  <div className="flex justify-center py-4"><LoadingSpinner className="text-[var(--color-ms-accent)]" /></div>
                ) : (
                  <>
                    {iAmPaying && upiId && (
                      <div className="rounded-2xl border border-white/5 bg-white/5 p-6 flex flex-col items-center backdrop-blur-md">
                        <div className="flex items-center gap-2 text-sm text-slate-300 mb-5 font-medium tracking-wide uppercase">
                          <QrCode className="h-4 w-4" />
                          Scan to Pay (UPI)
                        </div>
                        <div className="bg-white p-3 rounded-2xl mb-4 shadow-xl">
                          <QRCodeSVG value={upiLink} size={160} />
                        </div>
                        <div className="text-sm text-slate-400 font-mono mb-5 tracking-wider bg-black/40 px-4 py-2 rounded-lg border border-white/5">
                          {upiId}
                        </div>
                        <a 
                          href={upiLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius-ms-md)] transition-all duration-[var(--duration-ms-normal)] ease-[var(--ease-ms-smooth)] cursor-pointer active:scale-[0.97] bg-[var(--color-ms-bg-card)] hover:bg-[var(--color-ms-bg-card-hover)] text-[var(--color-ms-text-primary)] border border-[var(--color-ms-border)] px-5 py-2.5 text-sm"
                        >
                          Open UPI App
                        </a>
                      </div>
                    )}
                    
                    {iAmPaying && !upiId && paymentMethods.length === 0 && (
                      <div className="text-sm text-slate-500 text-center py-4 bg-white/5 rounded-xl border border-white/5">
                        {getUserName(selectedDebt.to)} hasn't added any payment methods yet. You'll need to arrange payment outside the app.
                      </div>
                    )}

                    {!iAmPaying && (
                      <div className="text-sm text-slate-500 text-center py-4 bg-white/5 rounded-xl border border-white/5">
                        {getUserName(selectedDebt.from)} is paying you. Wait for them to settle up.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {error && (
              <div className="text-sm text-rose-500 bg-rose-500/10 p-3 rounded-lg">
                {error}
              </div>
            )}

            <Button 
              onClick={handleSettle}
              className="w-full py-6 text-lg" 
              loading={loading}
              disabled={loading || !selectedDebt}
            >
              Record Settlement
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
