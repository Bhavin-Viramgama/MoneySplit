import { useState, useEffect } from 'react';
import { X, HandCoins, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/Button';
import { paymentsService } from '@/features/payments/services/payments.service';
import { entriesService } from '../services/entries.service';
import type { Friendship, PaymentMethod, UserProfile } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  friendship: Friendship;
  netBalance: number;
  user: UserProfile;
  onSettled?: () => void;
}

export function SettleUpModal({ isOpen, onClose, friendship, netBalance, user, onSettled }: Props) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [error, setError] = useState('');

  // The receiver is the person who is owed money
  const receiverId = netBalance > 0 ? user.id : (friendship.user_id_1 === user.id ? friendship.user_id_2 : friendship.user_id_1);
  const iAmPaying = netBalance < 0;

  useEffect(() => {
    if (isOpen) {
      loadPaymentMethods();
    }
  }, [isOpen]);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const methods = await paymentsService.getUserPaymentMethods(receiverId);
      setPaymentMethods(methods);
    } catch (err) {
      console.error(err);
      setError('Failed to load payment methods.');
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async () => {
    try {
      setSettling(true);
      setError('');
      
      const requireApproval = iAmPaying 
        ? friendship.friend?.require_settlement_approval 
        : user.require_settlement_approval;

      const otherId = friendship.user_id_1 === user.id ? friendship.user_id_2 : friendship.user_id_1;

      await entriesService.addSettlement({
        friendship_id: friendship.id,
        creator_id: user.id,
        paid_by: iAmPaying ? user.id : otherId,
        owed_by: iAmPaying ? otherId : user.id,
        amount: Math.abs(netBalance),
        description: 'Settled up',
        entry_date: new Date().toISOString()
      }, requireApproval);

      onSettled?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to settle up.');
    } finally {
      setSettling(false);
    }
  };

  if (!isOpen) return null;

  const defaultMethod = paymentMethods.find(m => m.is_default) || paymentMethods[0];
  const upiId = defaultMethod?.type === 'upi' ? defaultMethod?.details?.upi_id : null;
  const payeeName = defaultMethod?.details?.payee_name || friendship.friend?.display_name || friendship.friend?.username;
  
  // Format for UPI deep link
  const upiLink = upiId ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName || '')}&am=${Math.abs(netBalance)}&cu=INR` : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-black/60 p-8 shadow-2xl relative backdrop-blur-xl">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-ms-accent)]/10 text-[var(--color-ms-accent)] border border-[var(--color-ms-accent)]/20 shadow-[var(--shadow-ms-glow)]">
            <HandCoins className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-semibold text-white">Settle Up</h2>
        </div>
        
        {loading ? (
          <div className="py-8 flex justify-center"><LoadingSpinner className="text-emerald-500" /></div>
        ) : (
          <div className="space-y-6">
            <div className="text-center rounded-2xl bg-white/5 p-8 border border-white/5 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[var(--color-ms-accent)]/20 rounded-full blur-[40px] pointer-events-none" />
              <p className="text-sm text-slate-400 mb-3 relative z-10 font-medium">
                {iAmPaying ? 'You are paying' : `${friendship.friend?.display_name} is paying you`}
              </p>
              <div className="text-5xl font-bold tracking-tighter text-white relative z-10 drop-shadow-md">
                {formatCurrency(Math.abs(netBalance))}
              </div>
            </div>

            {error && (
              <div className="text-sm text-rose-500 bg-rose-500/10 p-3 rounded-lg">
                {error}
              </div>
            )}

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
              <div className="text-sm text-slate-500 text-center py-4">
                {friendship.friend?.display_name} hasn't added any payment methods yet. You'll need to arrange payment outside the app.
              </div>
            )}

            <Button 
              onClick={handleSettle} 
              className="w-full py-6 text-lg" 
              loading={settling}
              disabled={settling}
            >
              Record Settlement
            </Button>
            
            <p className="text-xs text-slate-500 text-center px-4">
              {iAmPaying && friendship.friend?.require_settlement_approval 
                ? "This will send a request to your friend to approve the settlement."
                : "This will instantly update the balance."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
