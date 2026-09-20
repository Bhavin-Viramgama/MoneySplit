import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Receipt, Users, Calculator, Plus, MoreVertical, LogOut, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { groupsService } from '../services/groups.service';
import type { SimplifiedDebt } from '../services/groups.service';
import type { Group, GroupExpense, GroupMember } from '@/types';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency, classNames } from '@/lib/utils';
import { AddGroupExpenseModal } from '../components/AddGroupExpenseModal';
import { EditGroupExpenseModal } from '../components/EditGroupExpenseModal';
import { GroupMembersModal } from '../components/GroupMembersModal';
import { SettleGroupDebtModal } from '../components/SettleGroupDebtModal';
import { supabase } from '@/lib/supabase';

export function GroupDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [isMobileMembersOpen, setIsMobileMembersOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<GroupExpense | null>(null);
  const [simplifiedDebts, setSimplifiedDebts] = useState<SimplifiedDebt[] | null>(null);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  // Bulk Delete / Selection Mode
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [deletingBulk, setDeletingBulk] = useState(false);
  const pressTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id && user) {
      loadData();
    }
  }, [id, user]);

  useEffect(() => {
    if (id) {
      const channel = supabase
        .channel(`group_data_${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'group_expenses', filter: `group_id=eq.${id}` }, () => {
          loadData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${id}` }, () => {
          loadData();
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [expenses]);

  const loadData = async () => {
    try {
      if (!id || !user) return;
      
      const allGroups = await groupsService.getMyGroups(user.id);
      const fs = allGroups.find(g => g.id === id);
      
      if (!fs) {
        navigate('/');
        return;
      }
      
      setGroup(fs);
      setMembers(fs.members || []);
      
      const loadedExpenses = await groupsService.getGroupExpenses(id);
      setExpenses(loadedExpenses);
      
      // Clear simplified view when data reloads
      setSimplifiedDebts(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimplifyDebts = () => {
    const balances = groupsService.calculateBalances(expenses);
    const simplified = groupsService.simplifyDebts(balances);
    setSimplifiedDebts(simplified);
  };

  const handleLeaveGroup = async (myBalance: number) => {
    if (!id || !user) return;
    if (Math.abs(myBalance) > 0.01) {
      alert("You cannot leave the group until all your debts are settled.");
      return;
    }
    if (!confirm("Are you sure you want to leave this group?")) return;
    
    try {
      setProcessingAction(true);
      await groupsService.leaveGroup(id, user.id);
      navigate('/');
    } catch (err: any) {
      alert(err.message || "Failed to leave group");
    } finally {
      setProcessingAction(false);
      setIsSettingsOpen(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!id) return;
    if (!confirm("Are you sure you want to permanently delete this group and all its expenses? This cannot be undone.")) return;
    
    try {
      setProcessingAction(true);
      await groupsService.deleteGroup(id);
      navigate('/');
    } catch (err: any) {
      alert(err.message || "Failed to delete group");
    } finally {
      setProcessingAction(false);
      setIsSettingsOpen(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await groupsService.deleteGroupExpense(expenseId);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete expense');
    }
  };

  const toggleSelection = (expenseId: string) => {
    setSelectedExpenses(prev => {
      const next = new Set(prev);
      if (next.has(expenseId)) next.delete(expenseId);
      else next.add(expenseId);
      if (next.size === 0) setIsSelectionMode(false);
      return next;
    });
  };

  const handlePointerDown = (expenseId: string) => {
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense || expense.creator_id !== user?.id) return;
    
    pressTimers.current[expenseId] = setTimeout(() => {
      setIsSelectionMode(true);
      setSelectedExpenses(new Set([expenseId]));
      delete pressTimers.current[expenseId];
    }, 500);
  };

  const handlePointerUpOrLeave = (expenseId: string, isClick: boolean) => {
    if (pressTimers.current[expenseId]) {
      clearTimeout(pressTimers.current[expenseId]);
      delete pressTimers.current[expenseId];
      
      if (isClick && isSelectionMode) {
        toggleSelection(expenseId);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedExpenses.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedExpenses.size} expenses?`)) return;
    
    setDeletingBulk(true);
    try {
      await Promise.all(Array.from(selectedExpenses).map(id => groupsService.deleteGroupExpense(id)));
      setIsSelectionMode(false);
      setSelectedExpenses(new Set());
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete some expenses');
    } finally {
      setDeletingBulk(false);
    }
  };

  if (loading || !group || !user) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner className="h-8 w-8 text-blue-500" />
      </div>
    );
  }

  const balances = groupsService.calculateBalances(expenses);
  const myBalance = balances[user.id] || 0;

  return (
    <div className="flex-1 flex flex-col w-full h-full max-w-6xl mx-auto overflow-hidden border-x border-white/5 bg-[var(--color-ms-bg-primary)] pb-20 md:pb-0 relative">
      
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[var(--color-ms-accent)]/10 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 bg-black/40 px-5 py-4 backdrop-blur-xl z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="p-2 -ml-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-ms-accent)]/10 text-[var(--color-ms-accent)] font-medium uppercase border border-[var(--color-ms-accent)]/20">
              {group.name.charAt(0)}
            </div>
            <div>
              <h2 className="font-semibold text-slate-100">{group.name}</h2>
              <p className={`text-xs font-medium ${myBalance > 0 ? 'text-emerald-400' : myBalance < 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                {myBalance > 0 ? `You are owed ${formatCurrency(myBalance)}` : myBalance < 0 ? `You owe ${formatCurrency(Math.abs(myBalance))}` : 'Settled up'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 items-center relative">
          <Button size="sm" variant="secondary" onClick={() => setIsMobileMembersOpen(true)} className="md:hidden">
            <Users className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Members</span> ({members.length})
          </Button>

          <div className="hidden md:flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handleSimplifyDebts}>
              <Calculator className="mr-2 h-4 w-4" />
              Simplify Debts
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setIsSettleModalOpen(true)}>
              Settle Up
            </Button>
            <Button size="sm" onClick={() => setIsAddExpenseOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Expense
            </Button>
          </div>
          
          <button 
            className="p-2 ml-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          
          {isSettingsOpen && (
            <div className="absolute right-0 top-12 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50">
              <button 
                className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 flex items-center gap-2 disabled:opacity-50"
                onClick={() => handleLeaveGroup(myBalance)}
                disabled={processingAction}
              >
                <LogOut className="h-4 w-4" /> Leave Group
              </button>
              
              {group.created_by === user.id && (
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 disabled:opacity-50 mt-1"
                  onClick={handleDeleteGroup}
                  disabled={processingAction}
                >
                  <Trash2 className="h-4 w-4" /> Delete Group
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden z-10">
        {/* Main Chat / Expense Feed */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-5 space-y-6 scroll-smooth"
        >
          {simplifiedDebts ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md max-w-xl mx-auto mt-4">
              <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                <h3 className="text-lg font-semibold text-white">Simplified Debts</h3>
                <Button size="sm" variant="ghost" onClick={() => setSimplifiedDebts(null)}>Close</Button>
              </div>
              
              {simplifiedDebts.length === 0 ? (
                <p className="text-slate-400 text-center">Everyone is settled up!</p>
              ) : (
                <div className="space-y-4">
                  {simplifiedDebts.map((debt, i) => {
                    const fromUser = members.find(m => m.user_id === debt.from)?.profile;
                    const toUser = members.find(m => m.user_id === debt.to)?.profile;
                    const fromName = fromUser?.id === user.id ? 'You' : fromUser?.display_name || fromUser?.username;
                    const toName = toUser?.id === user.id ? 'You' : toUser?.display_name || toUser?.username;

                    return (
                      <div key={i} className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2">
                           <span className="font-medium text-rose-400">{fromName}</span>
                           <span className="text-slate-500 text-sm">owes</span>
                           <span className="font-medium text-emerald-400">{toName}</span>
                        </div>
                        <span className="font-bold text-white">{formatCurrency(debt.amount)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          ) : expenses.length === 0 ? (
            <div className="flex h-full items-center justify-center flex-col text-slate-500">
              <Receipt className="h-12 w-12 mb-4 opacity-50" />
              <p>No group expenses yet.</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {expenses.map((expense) => {
                const isMine = expense.paid_by === user.id;
                const payer = members.find(m => m.user_id === expense.paid_by)?.profile;
                
                return (
                  <motion.div 
                    key={expense.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={classNames(
                      "flex w-full",
                      isMine ? "justify-end" : "justify-start"
                    )}
                  >
                  <div 
                    onPointerDown={() => handlePointerDown(expense.id)}
                    onPointerUp={() => handlePointerUpOrLeave(expense.id, true)}
                    onPointerLeave={() => handlePointerUpOrLeave(expense.id, false)}
                    className={classNames(
                    "min-w-[240px] sm:min-w-[280px] max-w-[95%] sm:max-w-[80%] rounded-2xl px-4 py-3 sm:px-5 sm:py-4 shadow-xl backdrop-blur-md border cursor-pointer transition-all",
                    isSelectionMode && selectedExpenses.has(expense.id) ? "ring-2 ring-rose-500/80 scale-[0.98]" : "",
                    isMine 
                      ? "bg-[var(--color-ms-accent)]/10 text-white border-[var(--color-ms-accent)]/20 rounded-br-sm" 
                      : "bg-white/5 text-slate-100 border-white/5 rounded-bl-sm"
                  )}>
                      <div className="flex justify-between items-start gap-4 mb-1">
                        <span className="font-medium text-[15px]">
                          {expense.description}
                        </span>
                        <span className={classNames(
                          "font-bold whitespace-nowrap text-xl tracking-tight",
                          isMine ? "text-[var(--color-ms-accent-light)]" : "text-white"
                        )}>
                          {formatCurrency(expense.amount)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-[11px] opacity-60 mt-1">
                        <span>
                           {isMine ? 'You paid' : `${payer?.display_name || payer?.username} paid`}
                        </span>
                        <div className="flex items-center gap-2">
                           {expense.is_edited && (
                              <span 
                                className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] uppercase tracking-wider"
                              >
                                Edited
                              </span>
                           )}
                           <span>{format(new Date(expense.entry_date), 'MMM d, h:mm a')}</span>
                           
                           {expense.creator_id === user.id && (
                              <>
                                <button 
                                  onClick={() => setEditingExpense(expense)}
                                  className="hover:text-white hover:bg-white/10 px-1 rounded transition-colors ml-1"
                                >
                                  Edit
                                </button>
                                <button 
                                  onClick={() => handleDeleteExpense(expense.id)}
                                  className="hover:text-rose-400 hover:bg-rose-400/10 text-rose-500/80 px-1 rounded transition-colors ml-1"
                                >
                                  Delete
                                </button>
                              </>
                           )}
                        </div>
                      </div>

                      {/* Splits Breakdown */}
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-1">
                        {expense.splits?.map(split => {
                          if (split.amount_owed === 0) return null;
                          const splitUser = members.find(m => m.user_id === split.user_id)?.profile;
                          const name = splitUser?.id === user.id ? 'You' : splitUser?.display_name || splitUser?.username;
                          return (
                            <div key={split.user_id} className="flex justify-between text-xs text-slate-400">
                               <span>{name}</span>
                               <span>{formatCurrency(split.amount_owed)}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Sidebar (Members) - Hidden on very small screens */}
        <div className="hidden md:flex flex-col w-64 border-l border-white/5 bg-black/20">
          <div className="p-5 flex-1">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                 <Users className="h-4 w-4" /> Members ({members.length})
               </h3>
             </div>
             <div className="space-y-3">
               {members.map(m => {
               const bal = balances[m.user_id] || 0;
               return (
                 <div key={m.user_id} className="flex justify-between items-center text-sm">
                   <div className="flex items-center gap-2">
                     <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-300 uppercase">
                       {(m.profile?.display_name || m.profile?.username)?.charAt(0)}
                     </div>
                     <span className="text-slate-200">{m.user_id === user.id ? 'You' : m.profile?.display_name || m.profile?.username}</span>
                   </div>
                   <span className={`text-xs font-medium ${bal > 0 ? 'text-emerald-400' : bal < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                     {bal > 0 ? '+' : ''}{bal === 0 ? '0' : formatCurrency(bal)}
                   </span>
                 </div>
               )
             })}
           </div>
          </div>
          <div className="p-5 border-t border-white/5">
            <Button variant="secondary" className="w-full" onClick={() => setIsMembersModalOpen(true)}>
              Manage Members
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 w-full border-t border-white/5 bg-black/80 backdrop-blur-xl p-4 pb-safe flex gap-2 z-50">
         <Button variant="secondary" className="flex-1 px-1 text-xs sm:text-sm" onClick={handleSimplifyDebts}>
           <Calculator className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
           Simplify
         </Button>
         <Button variant="secondary" className="flex-1 px-1 text-xs sm:text-sm" onClick={() => setIsSettleModalOpen(true)}>
           Settle
         </Button>
         <Button className="flex-1 px-1 text-xs sm:text-sm" onClick={() => setIsAddExpenseOpen(true)}>
           <Plus className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
           Expense
         </Button>
      </div>

      <AddGroupExpenseModal 
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        group={group}
        members={members}
        onAdded={loadData}
      />

      {isMobileMembersOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md md:hidden">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-black/60 shadow-2xl relative backdrop-blur-xl flex flex-col">
            <div className="p-5 flex items-center justify-between border-b border-white/5">
              <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                <Users className="h-5 w-5 text-[var(--color-ms-accent)]" /> 
                Group Members ({members.length})
              </h3>
              <button onClick={() => setIsMobileMembersOpen(false)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-5 max-h-[50vh] overflow-y-auto space-y-4">
               {members.map(m => {
                 const bal = balances[m.user_id] || 0;
                 return (
                   <div key={m.user_id} className="flex justify-between items-center text-sm">
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-[var(--color-ms-accent)]/10 border border-[var(--color-ms-accent)]/20 flex items-center justify-center text-xs text-[var(--color-ms-accent)] uppercase">
                         {(m.profile?.display_name || m.profile?.username)?.charAt(0)}
                       </div>
                       <span className="text-slate-200 font-medium">{m.user_id === user.id ? 'You' : m.profile?.display_name || m.profile?.username}</span>
                     </div>
                     <span className={`font-semibold ${bal > 0 ? 'text-emerald-400' : bal < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                       {bal > 0 ? '+' : ''}{bal === 0 ? '0' : formatCurrency(bal)}
                     </span>
                   </div>
                 )
               })}
            </div>
            
            <div className="p-5 border-t border-white/5">
              <Button 
                variant="secondary" 
                className="w-full" 
                onClick={() => {
                  setIsMobileMembersOpen(false);
                  setIsMembersModalOpen(true);
                }}
              >
                Manage Members
              </Button>
            </div>
          </div>
        </div>
      )}

      {editingExpense && (
        <EditGroupExpenseModal
          isOpen={!!editingExpense}
          onClose={() => setEditingExpense(null)}
          members={members}
          expense={editingExpense}
          onEdited={loadData}
        />
      )}

      {isMembersModalOpen && (
        <GroupMembersModal 
          isOpen={isMembersModalOpen}
          onClose={() => setIsMembersModalOpen(false)}
          group={group}
          members={members}
          onMembersUpdated={loadData}
        />
      )}

      {isSettleModalOpen && (
        <SettleGroupDebtModal
          isOpen={isSettleModalOpen}
          onClose={() => setIsSettleModalOpen(false)}
          group={group}
          members={members}
          user={user}
          balances={balances}
          onSettled={loadData}
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
            <span className="font-medium">{selectedExpenses.size} selected</span>
            <div className="flex items-center gap-3">
              <Button size="sm" variant="ghost" onClick={() => {
                setIsSelectionMode(false);
                setSelectedExpenses(new Set());
              }} className="text-slate-400 hover:text-white rounded-full">
                Cancel
              </Button>
              <Button size="sm" variant="danger" disabled={deletingBulk || selectedExpenses.size === 0} onClick={handleBulkDelete} className="rounded-full shadow-lg shadow-rose-500/20">
                {deletingBulk ? <LoadingSpinner className="h-4 w-4" /> : 'Delete All'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
