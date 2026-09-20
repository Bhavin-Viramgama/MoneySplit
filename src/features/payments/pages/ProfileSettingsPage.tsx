import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, CreditCard, Plus, Trash2, QrCode, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { paymentsService } from '../services/payments.service';
import type { PaymentMethod } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function ProfileSettingsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);
  const [autoAcceptRequests, setAutoAcceptRequests] = useState(false);

  // New method form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newType, setNewType] = useState<'upi' | 'bank_transfer'>('upi');
  const [newUpiId, setNewUpiId] = useState('');
  const [newPayeeName, setNewPayeeName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (user && profile) {
      loadSettings();
    }
  }, [user, profile]);

  const loadSettings = async () => {
    if (!user || !profile) return;
    try {
      setLoading(true);
      setRequireApproval(profile.require_settlement_approval);
      setAutoAcceptRequests(profile.auto_accept_requests);
      const userMethods = await paymentsService.getUserPaymentMethods(user.id);
      setMethods(userMethods);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApproval = async () => {
    if (!user) return;
    const newValue = !requireApproval;
    setRequireApproval(newValue);
    try {
      await paymentsService.updateSettlementSetting(user.id, newValue);
    } catch (err) {
      console.error(err);
      setRequireApproval(!newValue); // Revert on error
    }
  };

  const handleToggleAutoAccept = async () => {
    if (!user) return;
    const newValue = !autoAcceptRequests;
    setAutoAcceptRequests(newValue);
    try {
      await paymentsService.updateAutoAcceptSetting(user.id, newValue);
    } catch (err) {
      console.error(err);
      setAutoAcceptRequests(!newValue);
    }
  };

  const handleAddMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (newType === 'upi' && !newUpiId)) return;

    try {
      setAdding(true);
      const newMethod = await paymentsService.addPaymentMethod({
        user_id: user.id,
        type: newType,
        details: { upi_id: newUpiId, payee_name: newPayeeName || undefined },
        is_default: methods.length === 0 // Make default if it's the first one
      });
      setMethods([newMethod, ...methods]);
      setShowAddForm(false);
      setNewUpiId('');
      setNewPayeeName('');
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteMethod = async (id: string) => {
    try {
      await paymentsService.deletePaymentMethod(id);
      setMethods(methods.filter(m => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner className="h-8 w-8 text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto w-full h-full">
      <div className="max-w-3xl mx-auto w-full p-4 md:p-8 space-y-8 pb-12">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-slate-400 hover:text-white">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Settings className="h-6 w-6 text-slate-400" />
          <h1 className="text-2xl font-semibold text-white tracking-tight">Settings</h1>
        </div>

        {/* Payment Methods */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-200">Payment Methods</h2>
            {!showAddForm && (
              <Button size="sm" onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Method
              </Button>
            )}
          </div>

          {showAddForm && (
            <form onSubmit={handleAddMethod} className="rounded-3xl border border-white/5 bg-white/5 p-6 space-y-5 backdrop-blur-xl shadow-xl">
              <h3 className="font-medium text-white">Add New Payment Method</h3>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="upi">UPI ID</option>
                  <option value="bank_transfer" disabled>Bank Transfer (Coming Soon)</option>
                </select>
              </div>

              {newType === 'upi' && (
                <div className="space-y-3">
                  <Input
                    label="UPI ID"
                    placeholder="username@bank"
                    value={newUpiId}
                    onChange={(e) => setNewUpiId(e.target.value)}
                    required
                  />
                  <Input
                    label="Payee Name (Optional)"
                    placeholder="Exact name registered with bank"
                    value={newPayeeName}
                    onChange={(e) => setNewPayeeName(e.target.value)}
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 mt-4">
                <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
                <Button type="submit" loading={adding} disabled={adding || !newUpiId}>Save</Button>
              </div>
            </form>
          )}

          {methods.length === 0 && !showAddForm ? (
            <div className="rounded-3xl border border-white/10 border-dashed bg-white/5 p-8 text-center backdrop-blur-xl">
              <CreditCard className="mx-auto h-8 w-8 text-slate-600 mb-3" />
              <p className="text-slate-500">No payment methods added yet.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {methods.map(method => (
                <div key={method.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur-md">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-ms-accent)]/10 text-[var(--color-ms-accent)] border border-[var(--color-ms-accent)]/20">
                      <QrCode className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-200 capitalize">{method.type}</h3>
                      <p className="text-sm text-slate-500">{method.details?.upi_id}</p>
                      {method.details?.payee_name && (
                        <p className="text-xs text-slate-600 mt-0.5">Payee: {method.details?.payee_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {method.is_default && (
                      <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">Default</span>
                    )}
                    <button
                      onClick={() => handleDeleteMethod(method.id)}
                      className="p-2 text-slate-500 hover:text-rose-500 rounded-full hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Account Settings */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">Account</h2>

          <div className="rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-white">Require Settlement Approval</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-md">
                  When friends record that they paid you back, it will require your approval before updating the balance.
                </p>
              </div>

              {/* Simple toggle switch */}
              <button
                onClick={handleToggleApproval}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${requireApproval ? 'bg-[var(--color-ms-accent)]' : 'bg-slate-700'
                  }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${requireApproval ? 'translate-x-6' : 'translate-x-1'
                  }`} />
              </button>
            </div>

            <hr className="border-white/5 my-4" />

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-white">Auto-Accept Invites</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-md">
                  Automatically accept incoming friend and group invites. If disabled, you'll need to manually approve them.
                </p>
              </div>

              <button
                onClick={handleToggleAutoAccept}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${autoAcceptRequests ? 'bg-[var(--color-ms-accent)]' : 'bg-slate-700'
                  }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoAcceptRequests ? 'translate-x-6' : 'translate-x-1'
                  }`} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
