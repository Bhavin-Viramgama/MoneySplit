import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Wallet, Users, ArrowRight } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { friendshipsService } from '../services/friendships.service';
import { entriesService } from '@/features/ledger/services/entries.service';
import type { Friendship } from '@/types';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AddFriendModal } from '../components/AddFriendModal';
import { CreateGroupModal } from '@/features/groups/components/CreateGroupModal';
import { formatCurrency } from '@/lib/utils';
import { groupsService } from '@/features/groups/services/groups.service';
import { supabase } from '@/lib/supabase';
import type { Group } from '@/types';
import { paymentsService } from '@/features/payments/services/payments.service';
import { UpiPromptModal } from '@/features/payments/components/UpiPromptModal';

export function DashboardPage() {
  const { user } = useAuth();
  const [friendships, setFriendships] = useState<(Friendship & { balance: number })[]>([]);
  const [groups, setGroups] = useState<(Group & { balance: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'groups' | 'requests'>('friends');
  const [isUpiPromptOpen, setIsUpiPromptOpen] = useState(false);

  useEffect(() => {
    if (user) {
      const hasDismissed = localStorage.getItem(`ms_upi_prompt_${user.id}`);
      if (!hasDismissed) {
        paymentsService.getUserPaymentMethods(user.id)
          .then(methods => {
            const hasUpi = methods.some(m => m.type === 'upi');
            if (!hasUpi) {
              setIsUpiPromptOpen(true);
            }
          })
          .catch(console.error);
      }
    }
  }, [user]);

  const handleCloseUpiPrompt = () => {
    localStorage.setItem(`ms_upi_prompt_${user?.id}`, 'true');
    setIsUpiPromptOpen(false);
  };

  useEffect(() => {
    if (user) {
      loadDashboard();

      // Subscribe to real-time changes for friend requests and group invites
      const channel = supabase
        .channel('dashboard_updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `user_id_1=eq.${user.id}` }, () => {
          loadDashboard();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `user_id_2=eq.${user.id}` }, () => {
          loadDashboard();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: `user_id=eq.${user.id}` }, () => {
          loadDashboard();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_entries' }, () => {
          loadDashboard();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'group_expenses' }, () => {
          loadDashboard();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      if (!user) return;
      
      const friendsData = await friendshipsService.getFriendships(user.id);
      
      // Calculate balance for each friend
      const withBalances = await Promise.all(
        friendsData.map(async (friendship) => {
          const entries = await entriesService.getFriendshipEntries(friendship.id);
          const balance = entriesService.calculateNetBalance(entries, user.id);
          return { ...friendship, balance };
        })
      );
      
      // Load Groups
      const userGroups = await groupsService.getMyGroups(user.id);
      const groupsWithBalances = await Promise.all(
        userGroups.map(async (group) => {
          const expenses = await groupsService.getGroupExpenses(group.id);
          const balances = groupsService.calculateBalances(expenses);
          const myBalance = balances[user.id] || 0;
          return { ...group, balance: myBalance };
        })
      );
      
      setFriendships(withBalances);
      setGroups(groupsWithBalances);
    } catch (error) {
      console.error('Failed to load dashboard', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptFriend = async (friendshipId: string) => {
    try {
      await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
      loadDashboard();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectFriend = async (friendshipId: string) => {
    try {
      await supabase.from('friendships').delete().eq('id', friendshipId);
      loadDashboard();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptGroup = async (groupId: string) => {
    try {
      await supabase.from('group_members').update({ status: 'accepted' }).eq('group_id', groupId).eq('user_id', user!.id);
      loadDashboard();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectGroup = async (groupId: string) => {
    try {
      await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', user!.id);
      loadDashboard();
    } catch (e) {
      console.error(e);
    }
  };

  const pendingFriendships = friendships.filter(f => f.status === 'pending' && f.creator_id !== user?.id);
  const activeFriendships = friendships.filter(f => f.status === 'accepted' || (f.status === 'pending' && f.creator_id === user?.id));
  
  const pendingGroups = groups.filter(g => {
    const me = g.members?.find(m => m.user_id === user?.id);
    return me?.status === 'pending';
  });
  
  const activeGroups = groups.filter(g => {
    const me = g.members?.find(m => m.user_id === user?.id);
    return me?.status === 'accepted';
  });

  const totalRequests = pendingFriendships.length + pendingGroups.length;

  const totalFriendsBalance = activeFriendships.reduce((acc, f) => acc + f.balance, 0);
  const totalGroupsBalance = activeGroups.reduce((acc, g) => acc + g.balance, 0);
  const totalBalance = totalFriendsBalance + totalGroupsBalance;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner className="h-8 w-8 text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto w-full h-full">
      <div className="max-w-4xl mx-auto w-full p-4 md:p-8 space-y-8 pb-24">
        {/* Overview Cards */}
        <div className="grid gap-4">
          <div className="rounded-3xl border border-white/5 bg-white/5 p-6 shadow-xl relative overflow-hidden backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-ms-accent)]/20 rounded-full blur-[50px] pointer-events-none" />
            <div className="flex items-center gap-3 text-slate-400">
              <Wallet className="h-5 w-5" />
              <h3 className="font-medium">Total Balance</h3>
            </div>
            <div className={`mt-4 text-5xl font-bold tracking-tighter ${
              totalBalance > 0 ? 'text-[var(--color-ms-accent)]' : totalBalance < 0 ? 'text-rose-500' : 'text-white'
            }`}>
              {totalBalance > 0 ? '+' : ''}{formatCurrency(totalBalance)}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {totalBalance > 0 ? 'You are owed' : totalBalance < 0 ? 'You owe' : 'All settled up'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 border-b border-white/10 pb-4 overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setActiveTab('friends')}
            className={`text-lg font-semibold transition-colors ${activeTab === 'friends' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Friends ({activeFriendships.length})
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`text-lg font-semibold transition-colors ${activeTab === 'groups' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Groups ({activeGroups.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`text-lg font-semibold transition-colors flex items-center gap-2 ${activeTab === 'requests' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Requests ({totalRequests})
          </button>
        </div>

        {/* List Area */}
        <div>
          {activeTab === 'friends' && (
            <>
              <div className="flex justify-end mb-4">
                <Button onClick={() => setIsModalOpen(true)} variant="secondary" size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Friend
                </Button>
              </div>
              {activeFriendships.length === 0 ? (
                <div className="rounded-3xl border border-white/10 border-dashed bg-white/5 p-12 text-center backdrop-blur-xl">
                  <Users className="mx-auto h-12 w-12 text-slate-600 mb-4" />
                  <h3 className="text-lg font-medium text-slate-300">No friends yet</h3>
                  <p className="text-slate-500 mt-2 mb-6 max-w-sm mx-auto">
                    Add a friend to start tracking shared expenses and splitting bills.
                  </p>
                  <Button onClick={() => setIsModalOpen(true)}>
                    Invite a Friend
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {activeFriendships.map((friendship) => (
                    <Link 
                      key={friendship.id} 
                      to={`/friendship/${friendship.id}`}
                      className="group flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10 hover:border-white/10 backdrop-blur-md"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-ms-accent)]/10 text-[var(--color-ms-accent)] font-medium uppercase text-lg border border-[var(--color-ms-accent)]/20">
                          {friendship.friend?.display_name?.charAt(0) || friendship.friend?.username?.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-200">{friendship.friend?.display_name || friendship.friend?.username}</h3>
                          <p className="text-sm text-slate-500">
                             @{friendship.friend?.username}
                             {friendship.status === 'pending' && <span className="ml-2 text-[10px] text-amber-500 uppercase tracking-wider font-semibold">Pending Invite</span>}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className={`font-semibold text-lg ${
                            friendship.balance > 0 ? 'text-[var(--color-ms-accent)]' : friendship.balance < 0 ? 'text-rose-500' : 'text-slate-400'
                          }`}>
                            {friendship.balance > 0 ? '+' : ''}{formatCurrency(friendship.balance)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {friendship.balance > 0 ? 'owes you' : friendship.balance < 0 ? 'you owe' : 'settled'}
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-slate-600 transition-colors group-hover:text-slate-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'groups' && (
            <>
              <div className="flex justify-end mb-4">
                <Button onClick={() => setIsGroupModalOpen(true)} variant="secondary" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              </div>
              {activeGroups.length === 0 ? (
                <div className="rounded-3xl border border-white/10 border-dashed bg-white/5 p-12 text-center backdrop-blur-xl">
                  <Users className="mx-auto h-12 w-12 text-slate-600 mb-4" />
                  <h3 className="text-lg font-medium text-slate-300">No groups yet</h3>
                  <p className="text-slate-500 mt-2 mb-6 max-w-sm mx-auto">
                    Create a group to split expenses like trips, dinners, or rent among multiple friends.
                  </p>
                  <Button onClick={() => setIsGroupModalOpen(true)}>
                    Create a Group
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {activeGroups.map((group) => (
                    <Link 
                      key={group.id} 
                      to={`/groups/${group.id}`}
                      className="group flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10 hover:border-white/10 backdrop-blur-md"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 font-medium uppercase text-lg border border-blue-500/20">
                          {group.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-200">{group.name}</h3>
                          <p className="text-sm text-slate-500">{group.members?.length || 0} members</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className={`font-semibold text-lg ${
                            group.balance > 0 ? 'text-[var(--color-ms-accent)]' : group.balance < 0 ? 'text-rose-500' : 'text-slate-400'
                          }`}>
                            {group.balance > 0 ? '+' : ''}{formatCurrency(group.balance)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {group.balance > 0 ? 'you are owed' : group.balance < 0 ? 'you owe' : 'settled'}
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-slate-600 transition-colors group-hover:text-slate-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'requests' && (
            <>
              {totalRequests === 0 ? (
                <div className="rounded-3xl border border-white/10 border-dashed bg-white/5 p-12 text-center backdrop-blur-xl">
                  <UserPlus className="mx-auto h-12 w-12 text-slate-600 mb-4" />
                  <h3 className="text-lg font-medium text-slate-300">No pending requests</h3>
                  <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                    You're all caught up!
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {pendingFriendships.map(friendship => (
                    <div key={friendship.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-md">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-ms-accent)]/10 text-[var(--color-ms-accent)] font-medium uppercase text-lg border border-[var(--color-ms-accent)]/20">
                          {friendship.friend?.display_name?.charAt(0) || friendship.friend?.username?.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-200">{friendship.friend?.display_name || friendship.friend?.username}</h3>
                          <p className="text-sm text-slate-500">@{friendship.friend?.username} sent you a friend request</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                         <Button size="sm" variant="ghost" onClick={() => handleRejectFriend(friendship.id)}>Reject</Button>
                         <Button size="sm" onClick={() => handleAcceptFriend(friendship.id)}>Accept</Button>
                      </div>
                    </div>
                  ))}
                  
                  {pendingGroups.map(group => (
                    <div key={group.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-md">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 font-medium uppercase text-lg border border-blue-500/20">
                          {group.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-200">{group.name}</h3>
                          <p className="text-sm text-slate-500">Group invite • {group.members?.length || 0} members</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                         <Button size="sm" variant="ghost" onClick={() => handleRejectGroup(group.id)}>Reject</Button>
                         <Button size="sm" onClick={() => handleAcceptGroup(group.id)}>Accept</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <AddFriendModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onAdded={loadDashboard}
        />
        <CreateGroupModal
          isOpen={isGroupModalOpen}
          onClose={() => setIsGroupModalOpen(false)}
        />
        <UpiPromptModal
          isOpen={isUpiPromptOpen}
          onClose={handleCloseUpiPrompt}
        />
      </div>
    </div>
  );
}
