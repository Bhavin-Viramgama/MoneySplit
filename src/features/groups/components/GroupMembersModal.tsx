import { useState, useEffect } from 'react';
import { Search, Check, Plus, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { groupsService } from '../services/groups.service';
import type { Group, GroupMember, UserProfile } from '@/types';
import { classNames } from '@/lib/utils';

interface GroupMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  members: GroupMember[];
  onMembersUpdated: () => void;
}

export function GroupMembersModal({ isOpen, onClose, group, members, onMembersUpdated }: GroupMembersModalProps) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  
  const [usernameSearch, setUsernameSearch] = useState('');
  const [addingUsername, setAddingUsername] = useState(false);
  const [addingFriends, setAddingFriends] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && user) {
      loadFriends();
    }
  }, [isOpen, user]);

  const loadFriends = async () => {
    try {
      setLoadingFriends(true);
      // Fetch accepted friends
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          user_id_1,
          user_id_2,
          profile_1:profiles!friendships_user_id_1_fkey(*),
          profile_2:profiles!friendships_user_id_2_fkey(*)
        `)
        .or(`user_id_1.eq.${user?.id},user_id_2.eq.${user?.id}`)
        .eq('status', 'accepted');

      if (error) throw error;

      const friendProfiles: UserProfile[] = data.map((f: any) => 
        f.user_id_1 === user?.id ? f.profile_2 : f.profile_1
      );
      
      setFriends(friendProfiles);
    } catch (err) {
      console.error('Failed to load friends:', err);
    } finally {
      setLoadingFriends(false);
    }
  };

  const toggleFriend = (friendId: string) => {
    const next = new Set(selectedFriendIds);
    if (next.has(friendId)) {
      next.delete(friendId);
    } else {
      next.add(friendId);
    }
    setSelectedFriendIds(next);
  };

  const handleAddFriends = async () => {
    if (selectedFriendIds.size === 0) return;
    setAddingFriends(true);
    try {
      // For each selected friend, add them to the group
      const inserts = Array.from(selectedFriendIds).map(id => {
        const friendProfile = friends.find(f => f.id === id);
        return {
          group_id: group.id,
          user_id: id,
          status: friendProfile?.auto_accept_requests ? 'accepted' : 'pending'
        };
      });
      
      const { error } = await supabase.from('group_members').insert(inserts);
      
      if (error) {
        if (error.code !== '23505') throw error; // Ignore already in group error
      }
      
      setSelectedFriendIds(new Set());
      onMembersUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to add friends');
    } finally {
      setAddingFriends(false);
    }
  };

  const handleAddByUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameSearch.trim()) return;
    
    const cleanUsername = usernameSearch.startsWith('@') ? usernameSearch.substring(1) : usernameSearch;
    setAddingUsername(true);
    try {
      await groupsService.addMemberByUsername(group.id, cleanUsername);
      setUsernameSearch('');
      onMembersUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to add user');
    } finally {
      setAddingUsername(false);
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
        <h2 className="text-xl font-semibold text-white tracking-tight mb-6">Group Members ({members.length})</h2>

      <div className="space-y-6">
        
        {/* Current Members List */}
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-3">Current Members</h4>
          <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
            {members.map(m => (
              <div key={m.user_id} className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-300 font-medium uppercase">
                    {m.profile?.username?.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-200">
                      {m.user_id === user?.id ? 'You' : m.profile?.username}
                    </div>
                    {m.status === 'pending' && (
                      <div className="text-[10px] text-amber-500 uppercase tracking-wider font-semibold">Pending Invite</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <hr className="border-white/10" />

        {/* Add by Username */}
        <div>
           <h4 className="text-sm font-semibold text-slate-300 mb-3">Invite by Username</h4>
           <form onSubmit={handleAddByUsername} className="flex gap-2">
             <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
               <Input 
                 value={usernameSearch}
                 onChange={e => setUsernameSearch(e.target.value)}
                 placeholder="username"
                 className="pl-9 bg-black/40 border-white/10 text-white"
               />
             </div>
             <Button type="submit" loading={addingUsername} disabled={!usernameSearch.trim()}>
               Invite
             </Button>
           </form>
        </div>

        {/* Add from Friends */}
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-3">Invite Friends</h4>
          
          {loadingFriends ? (
            <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
          ) : friends.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-2">No friends to invite.</p>
          ) : (
            <div className="space-y-3">
              <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                {friends.map(friend => {
                  const isAlreadyMember = members.some(m => m.user_id === friend.id);
                  const isSelected = selectedFriendIds.has(friend.id);
                  
                  return (
                    <div 
                      key={friend.id} 
                      onClick={() => !isAlreadyMember && toggleFriend(friend.id)}
                      className={classNames(
                        "flex justify-between items-center p-2 rounded-lg border transition-colors cursor-pointer",
                        isAlreadyMember ? "bg-white/5 border-transparent opacity-50 cursor-not-allowed" :
                        isSelected ? "bg-blue-500/20 border-blue-500/30" : "bg-black/40 border-white/5 hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-300 font-medium uppercase">
                          {friend.username.charAt(0)}
                        </div>
                        <div className="text-sm font-medium text-slate-200">
                          {friend.username}
                        </div>
                      </div>
                      
                      {isAlreadyMember ? (
                        <span className="text-xs text-slate-500">Member</span>
                      ) : (
                        <div className={classNames(
                          "w-5 h-5 rounded-md border flex items-center justify-center transition-colors",
                          isSelected ? "bg-blue-500 border-blue-500 text-white" : "border-slate-600"
                        )}>
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {selectedFriendIds.size > 0 && (
                <Button 
                  className="w-full" 
                  onClick={handleAddFriends} 
                  loading={addingFriends}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add {selectedFriendIds.size} Friend{selectedFriendIds.size > 1 ? 's' : ''}
                </Button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
    </div>
  );
}
