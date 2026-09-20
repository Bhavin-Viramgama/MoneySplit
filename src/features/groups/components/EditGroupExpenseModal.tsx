import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { groupsService } from '../services/groups.service';
import { X } from 'lucide-react';
import type { GroupExpense, GroupMember } from '@/types';

interface EditGroupExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: GroupMember[];
  expense: GroupExpense;
  onEdited: () => void;
}

export function EditGroupExpenseModal({ isOpen, onClose, members, expense, onEdited }: EditGroupExpenseModalProps) {
  const { user } = useAuth();
  
  const [description, setDescription] = useState(expense.description);
  const [amount, setAmount] = useState(expense.amount.toString());
  const [loading, setLoading] = useState(false);
  const [splits, setSplits] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setDescription(expense.description);
      setAmount(expense.amount.toString());
      
      const newSplits: Record<string, string> = {};
      expense.splits?.forEach(s => {
        newSplits[s.user_id] = s.amount_owed.toString();
      });
      setSplits(newSplits);
    }
  }, [isOpen, expense]);

  const handleSplitChange = (userId: string, val: string) => {
    setSplits(prev => ({ ...prev, [userId]: val }));
  };

  const splitEqually = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    
    const activeMembers = members;
    if (activeMembers.length === 0) return;

    const totalCents = Math.round(numAmount * 100);
    const baseCents = Math.floor(totalCents / activeMembers.length);
    const remainderCents = totalCents - (baseCents * activeMembers.length);

    const newSplits: Record<string, string> = {};
    activeMembers.forEach((m, index) => {
      const cents = baseCents + (index === 0 ? remainderCents : 0);
      newSplits[m.user_id] = (cents / 100).toFixed(2);
    });
    
    setSplits(newSplits);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    setLoading(true);
    try {
      const formattedSplits = Object.entries(splits)
        .map(([user_id, val]) => ({ user_id, amount_owed: parseFloat(val) || 0 }))
        .filter(s => s.amount_owed > 0);

      await groupsService.editGroupExpense(
        expense.id,
        numAmount,
        description.trim(),
        expense.amount,
        expense.description,
        formattedSplits
      );
      
      onEdited();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to edit expense');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/60 p-6 shadow-2xl relative backdrop-blur-xl">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-semibold text-white tracking-tight mb-6">Edit Expense</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
          <Input 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Dinner, Movies, etc."
            required
            className="bg-black/40 border-white/10 text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Amount</label>
          <Input 
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            className="bg-black/40 border-white/10 text-white"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-slate-300">Splits</label>
            <Button type="button" size="sm" variant="ghost" onClick={splitEqually} className="text-xs py-1 h-auto">
              Split Equally
            </Button>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {members.map(m => {
              const profile = m.profile;
              const name = m.user_id === user?.id ? 'You' : profile?.display_name || profile?.username;
              return (
                <div key={m.user_id} className="flex justify-between items-center">
                  <span className="text-sm text-slate-300 truncate max-w-[150px]">{name}</span>
                  <Input 
                    type="number"
                    step="0.01"
                    min="0"
                    value={splits[m.user_id] || ''}
                    onChange={(e) => handleSplitChange(m.user_id, e.target.value)}
                    placeholder="0.00"
                    className="w-24 text-right !h-8 !py-1 bg-black/40 border-white/10"
                  />
                </div>
              )
            })}
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" loading={loading}>
            Save Changes
          </Button>
        </div>
      </form>
      </div>
    </div>
  );
}
