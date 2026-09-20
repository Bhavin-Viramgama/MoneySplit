import { useState } from 'react';
import { X, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { groupsService } from '../services/groups.service';
import { useNavigate } from 'react-router-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateGroupModal({ isOpen, onClose }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;
    
    try {
      setLoading(true);
      setError('');
      const group = await groupsService.createGroup(name.trim(), user.id);
      onClose();
      navigate(`/groups/${group.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
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
          <div className="p-3 bg-[var(--color-ms-accent)]/10 rounded-2xl text-[var(--color-ms-accent)]">
            <Users className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-semibold text-white tracking-tight">Create Group</h2>
        </div>
        
        <form onSubmit={handleCreate} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Group Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Goa Trip, Apartment, Weekend Party"
              className="!bg-white/5 !border-white/10 text-white"
              error={error}
              autoFocus
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={!name.trim() || loading}
            loading={loading}
          >
            Create Group
          </Button>
        </form>
      </div>
    </div>
  );
}
