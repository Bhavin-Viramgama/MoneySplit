import { useState, useEffect } from 'react';
import { X, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { groupsService } from '../services/groups.service';
import type { Group, GroupMember } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  members: GroupMember[];
  onAdded: () => void;
}

export function AddGroupExpenseModal({ isOpen, onClose, group, members, onAdded }: Props) {
  const { user } = useAuth();
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState<string>('');
  
  // By default split equally
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && isOpen && !paidBy) {
      setPaidBy(user.id);
    }
  }, [user, isOpen, paidBy]);

  if (!isOpen || !user) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || !paidBy) return;
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Invalid amount');
      return;
    }

    // Split equally among all members using integer cents to prevent floating point inaccuracies
    const totalCents = Math.round(numAmount * 100);
    const baseCents = Math.floor(totalCents / members.length);
    const remainderCents = totalCents - (baseCents * members.length);

    const splits = members.map((m, index) => {
      const cents = baseCents + (index === 0 ? remainderCents : 0);
      return {
        user_id: m.user_id,
        amount_owed: cents / 100
      };
    });

    try {
      setLoading(true);
      setError('');
      await groupsService.addGroupExpense(group.id, user.id, paidBy, numAmount, description, splits);
      
      setDescription('');
      setAmount('');
      onAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/60 p-8 shadow-2xl relative backdrop-blur-xl">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
            <Receipt className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-semibold text-white tracking-tight">Add Group Expense</h2>
        </div>
        
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Dinner at Taj"
              className="!bg-white/5 !border-white/10 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Amount</label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="!bg-white/5 !border-white/10 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Paid By</label>
            <select 
              value={paidBy}
              onChange={e => setPaidBy(e.target.value)}
              className="w-full h-11 px-3 bg-white/5 border border-white/10 text-white rounded-xl outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all text-sm appearance-none"
            >
              {members.map(m => (
                <option key={m.user_id} value={m.user_id} className="bg-slate-900 text-white">
                  {m.profile?.username}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            <p className="text-xs text-slate-400 mb-4">
              This expense will be split equally among all {members.length} members.
            </p>
            {error && <p className="text-sm text-rose-500 mb-4">{error}</p>}
            <Button 
              type="submit" 
              className="w-full"
              disabled={!description || !amount || loading}
              loading={loading}
            >
              Add Expense
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
