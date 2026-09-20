import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { entriesService } from '../../ledger/services/entries.service';
import { X } from 'lucide-react';
import type { FinanceEntry } from '@/types';

interface EditEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: FinanceEntry;
  onEdited: () => void;
}

export function EditEntryModal({ isOpen, onClose, entry, onEdited }: EditEntryModalProps) {
  const [description, setDescription] = useState(entry.description);
  const [amount, setAmount] = useState(entry.amount.toString());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDescription(entry.description);
      setAmount(entry.amount.toString());
    }
  }, [isOpen, entry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    setLoading(true);
    try {
      await entriesService.editEntry(
        entry.id,
        numAmount,
        description.trim(),
        entry.amount,
        entry.description
      );
      
      onEdited();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to edit entry');
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
        <h2 className="text-xl font-semibold text-white tracking-tight mb-6">Edit Entry</h2>

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
