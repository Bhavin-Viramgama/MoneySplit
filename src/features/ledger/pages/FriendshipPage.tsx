import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, HandCoins, Receipt, Eraser } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { entriesService } from '../services/entries.service';
import { friendshipsService } from '@/features/friendships/services/friendships.service';
import type { FinanceEntry, Friendship } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency, classNames } from '@/lib/utils';
import { SettleUpModal } from './SettleUpModal';
import { EditEntryModal } from '../components/EditEntryModal';
import { supabase } from '@/lib/supabase';

export function FriendshipPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [friendship, setFriendship] = useState<Friendship | null>(null);
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Quick expense form state
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [adding, setAdding] = useState(false);

  // Modals
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinanceEntry | null>(null);

  // Bulk Delete / Selection Mode
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [deletingBulk, setDeletingBulk] = useState(false);
  const pressTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id && user) {
      loadData();
    }
  }, [id, user]);

  useEffect(() => {
    if (id && user) {
      const channel = entriesService.subscribeToFriendshipEntries(id, (_payload) => {
        // Simple reload on any change for now, to ensure balance consistency.
        // In a highly optimized app, we'd apply the payload incrementally.
        loadData();
      });

      const friendshipChannel = supabase
        .channel(`friendship_${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `id=eq.${id}` }, () => {
          loadData();
        })
        .subscribe();

      return () => {
        entriesService.unsubscribe(channel);
        supabase.removeChannel(friendshipChannel);
      };
    }
  }, [id, user]);

  // Scroll to bottom when entries change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const loadData = async () => {
    try {
      if (!id || !user) return;
      const allFriendships = await friendshipsService.getFriendships(user.id);
      const fs = allFriendships.find(f => f.id === id);
      if (!fs) {
        navigate('/');
        return;
      }
      setFriendship(fs);
      
      const loadedEntries = await entriesService.getFriendshipEntries(id);
      setEntries(loadedEntries);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !user || !friendship) return;
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    try {
      setAdding(true);
      await entriesService.addExpense({
        friendship_id: friendship.id,
        creator_id: user.id,
        paid_by: user.id, // Assume current user paid
        owed_by: friendship.user_id_1 === user.id ? friendship.user_id_2 : friendship.user_id_1,
        amount: parsedAmount,
        description,
        entry_date: new Date().toISOString()
      });
      setAmount('');
      setDescription('');
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      await entriesService.deleteEntry(entryId);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete entry');
    }
  };

  const toggleSelection = (entryId: string) => {
    setSelectedEntries(prev => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      if (next.size === 0) setIsSelectionMode(false);
      return next;
    });
  };

  const handlePointerDown = (entryId: string) => {
    // Only allow selection of entries that belong to the user (can be deleted)
    const entry = entries.find(e => e.id === entryId);
    if (!entry || entry.creator_id !== user?.id) return;
    
    pressTimers.current[entryId] = setTimeout(() => {
      setIsSelectionMode(true);
      setSelectedEntries(new Set([entryId]));
      delete pressTimers.current[entryId];
    }, 500);
  };

  const handlePointerUpOrLeave = (entryId: string, isClick: boolean) => {
    if (pressTimers.current[entryId]) {
      clearTimeout(pressTimers.current[entryId]);
      delete pressTimers.current[entryId];
      
      // If it was a short click and we are in selection mode, toggle it
      if (isClick && isSelectionMode) {
        toggleSelection(entryId);
      }
    } else if (isClick && isSelectionMode) {
        // If timer was already cleared (e.g. long press triggered), we don't want to immediately toggle it off on the pointer up event.
        // Wait, if it triggered, the timer is cleared inside the setTimeout? No, setTimeout doesn't clear the key.
        // So the key is still there, but we don't want to toggle if it just triggered.
        // Actually, if the timer fires, we should delete the key so pointerUp knows it was a long press.
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEntries.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedEntries.size} entries?`)) return;
    
    setDeletingBulk(true);
    try {
      await Promise.all(Array.from(selectedEntries).map(id => entriesService.deleteEntry(id)));
      setIsSelectionMode(false);
      setSelectedEntries(new Set());
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete some entries');
    } finally {
      setDeletingBulk(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner className="h-8 w-8 text-emerald-500" />
      </div>
    );
  }

  if (!friendship || !user) return null;

  const netBalance = entriesService.calculateNetBalance(entries, user.id);
  const friendName = friendship.friend?.username;

  // Determine the cleared_at timestamp for the current user
  const isUser1 = friendship.user_id_1 === user.id;
  const myClearedAt = isUser1 ? friendship.user_1_cleared_at : friendship.user_2_cleared_at;

  // Filter entries for display
  const visibleEntries = entries.filter((entry) => {
    if (!myClearedAt) return true;
    return new Date(entry.entry_date) > new Date(myClearedAt);
  });

  // Find the last settlement
  const lastSettlement = [...entries].reverse().find(e => e.is_settlement && e.status === 'accepted');

  const handleClearHistory = async () => {
    if (!lastSettlement) return;
    try {
      await friendshipsService.clearHistory(friendship, user.id, lastSettlement.entry_date);
      setFriendship(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          user_1_cleared_at: isUser1 ? lastSettlement.entry_date : prev.user_1_cleared_at,
          user_2_cleared_at: !isUser1 ? lastSettlement.entry_date : prev.user_2_cleared_at
        };
      });
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full h-full sm:h-[calc(100vh-80px)] sm:max-h-[800px] max-w-2xl mx-auto sm:rounded-3xl overflow-hidden sm:border border-white/5 bg-black sm:shadow-2xl relative">
      
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--color-ms-accent)]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 bg-black/40 px-5 py-4 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="p-2 -ml-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 font-medium uppercase text-slate-300">
              {friendName?.charAt(0)}
            </div>
            <div>
              <h2 className="font-semibold text-slate-100">{friendName}</h2>
              <p className={`text-xs font-medium ${netBalance > 0 ? 'text-emerald-500' : netBalance < 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                {netBalance > 0 ? `Owes you ${formatCurrency(netBalance)}` : netBalance < 0 ? `You owe ${formatCurrency(Math.abs(netBalance))}` : 'Settled up'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {lastSettlement && visibleEntries.some(e => new Date(e.entry_date) <= new Date(lastSettlement.entry_date)) && (
            <Button size="sm" variant="ghost" onClick={handleClearHistory} title="Clear history up to last settlement">
              <Eraser className="h-4 w-4" />
            </Button>
          )}
          {netBalance < 0 && (
            <Button size="sm" variant="secondary" onClick={() => setIsSettleModalOpen(true)}>
              <HandCoins className="mr-2 h-4 w-4" />
              Settle
            </Button>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 space-y-6 scroll-smooth z-10"
      >
        {visibleEntries.length === 0 ? (
          <div className="flex h-full items-center justify-center flex-col text-slate-500">
            <Receipt className="h-12 w-12 mb-4 opacity-50" />
            <p>No expenses to show. Add one below!</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {visibleEntries.map((entry) => {
              const isMine = entry.paid_by === user.id;
              
              return (
                <motion.div 
                  key={entry.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={classNames(
                    "flex w-full",
                    isMine ? "justify-end" : "justify-start"
                  )}
                >
                  <div 
                    onPointerDown={() => handlePointerDown(entry.id)}
                    onPointerUp={() => handlePointerUpOrLeave(entry.id, true)}
                    onPointerLeave={() => handlePointerUpOrLeave(entry.id, false)}
                    className={classNames(
                    "max-w-[95%] sm:max-w-[80%] rounded-2xl px-4 py-3 sm:px-5 sm:py-4 shadow-xl backdrop-blur-md border cursor-pointer transition-all",
                    isSelectionMode && selectedEntries.has(entry.id) ? "ring-2 ring-rose-500/80 scale-[0.98]" : "",
                    isMine 
                      ? "bg-[var(--color-ms-accent)]/10 text-white border-[var(--color-ms-accent)]/20 rounded-br-sm" 
                      : "bg-white/5 text-slate-100 border-white/5 rounded-bl-sm"
                  )}>
                    <div className="flex justify-between items-start gap-4 mb-1">
                      <span className="font-medium text-[15px]">
                        {entry.is_settlement ? 'Settled up' : entry.description}
                      </span>
                      <span className={classNames(
                        "font-bold whitespace-nowrap text-xl tracking-tight",
                        entry.is_settlement ? "text-blue-400" : isMine ? "text-[var(--color-ms-accent)]" : "text-white"
                      )}>
                        {formatCurrency(entry.amount)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-[11px] opacity-60 mt-1">
                      <span>
                        {entry.is_settlement 
                          ? (isMine ? `You paid ${friendName}` : `${friendName} paid you`)
                          : (isMine ? `You paid` : `${friendName} paid`)}
                      </span>
                      <div className="flex items-center gap-2">
                        {entry.is_edited && (
                           <span 
                             className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] uppercase tracking-wider"
                           >
                             Edited
                           </span>
                        )}
                        <span>{format(new Date(entry.entry_date), 'MMM d, h:mm a')}</span>
                        {entry.creator_id === user.id && !entry.is_settlement && (
                           <>
                             <button 
                               onClick={() => setEditingEntry(entry)}
                               className="hover:text-white hover:bg-white/10 px-1 rounded transition-colors ml-1"
                             >
                               Edit
                             </button>
                             <button 
                               onClick={() => handleDeleteEntry(entry.id)}
                               className="hover:text-rose-400 hover:bg-rose-400/10 text-rose-500/80 px-1 rounded transition-colors ml-1"
                             >
                               Delete
                             </button>
                           </>
                        )}
                      </div>
                    </div>

                    {entry.is_settlement && entry.status === 'pending' && (
                      <div className="mt-3 pt-3 border-t border-white/10 flex justify-end gap-2">
                         {/* If they created the settlement but I am owed, I should accept it */}
                         {entry.creator_id !== user.id ? (
                           <>
                             <Button size="sm" variant="ghost" className="h-7 text-xs px-2"
                               onClick={() => entriesService.updateEntryStatus(entry.id, 'rejected')}>Reject</Button>
                             <Button size="sm" className="h-7 text-xs px-2"
                               onClick={() => entriesService.updateEntryStatus(entry.id, 'accepted')}>Accept</Button>
                           </>
                         ) : (
                           <span className="text-xs italic">Waiting for approval...</span>
                         )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-white/5 bg-black/60 backdrop-blur-xl p-4 pb-safe z-10">
        <form onSubmit={handleQuickAdd} className="flex gap-3">
          <Input 
            placeholder="Amount" 
            type="number" 
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28 !bg-white/5 !border-white/10"
          />
          <Input 
            placeholder="What was it for?" 
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="flex-1 !bg-white/5 !border-white/10"
          />
          <Button type="submit" disabled={adding || !amount || !description} className="shrink-0 px-4 rounded-xl">
            {adding ? <LoadingSpinner className="h-5 w-5" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
      </div>

      {isSettleModalOpen && (
         <SettleUpModal 
            isOpen={isSettleModalOpen} 
            onClose={() => setIsSettleModalOpen(false)} 
            friendship={friendship} 
            netBalance={netBalance}
            user={profile!}
            onSettled={loadData}
         />
      )}

      {editingEntry && (
        <EditEntryModal 
          isOpen={!!editingEntry}
          onClose={() => setEditingEntry(null)}
          entry={editingEntry}
          onEdited={loadData}
        />
      )}
      {/* Bulk Delete Floating Action Bar */}
      <AnimatePresence>
        {isSelectionMode && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-xl border border-rose-500/30 text-white px-6 py-4 rounded-full shadow-2xl z-50 flex items-center gap-6"
          >
            <span className="font-medium">{selectedEntries.size} selected</span>
            <div className="flex items-center gap-3">
              <Button size="sm" variant="ghost" onClick={() => {
                setIsSelectionMode(false);
                setSelectedEntries(new Set());
              }} className="text-slate-400 hover:text-white rounded-full">
                Cancel
              </Button>
              <Button size="sm" variant="danger" disabled={deletingBulk || selectedEntries.size === 0} onClick={handleBulkDelete} className="rounded-full shadow-lg shadow-rose-500/20">
                {deletingBulk ? <LoadingSpinner className="h-4 w-4" /> : 'Delete All'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
