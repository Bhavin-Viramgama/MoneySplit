import { supabase } from '@/lib/supabase';
import type { Friendship, UserProfile } from '@/types';

export const friendshipsService = {
  /**
   * Get or create a unique invite token for the current user
   */
  async getMyInviteToken(userId: string): Promise<string> {
    // Check if token exists
    const { data: existing, error: fetchError } = await supabase
      .from('user_invites')
      .select('token')
      .eq('user_id', userId)
      .single();

    if (existing && !fetchError) {
      return existing.token;
    }

    // Generate a new random token
    const token = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);

    const { data: inserted, error: insertError } = await supabase
      .from('user_invites')
      .insert({ user_id: userId, token })
      .select('token')
      .single();

    if (insertError) throw insertError;
    return inserted.token;
  },

  /**
   * Get user profile by invite token
   */
  async getUserByInviteToken(token: string): Promise<UserProfile> {
    const { data: invite, error: inviteError } = await supabase
      .from('user_invites')
      .select('user_id')
      .eq('token', token)
      .single();

    if (inviteError || !invite) throw new Error('Invalid or expired invite link.');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', invite.user_id)
      .single();

    if (profileError) throw new Error('User profile not found.');
    return profile as UserProfile;
  },

  /**
   * Accept an invite and create a friendship
   */
  async acceptInvite(token: string, currentUserId: string): Promise<Friendship> {
    const friend = await this.getUserByInviteToken(token);
    
    if (friend.id === currentUserId) {
      throw new Error('You cannot add yourself as a friend.');
    }

    // Sort IDs to maintain constraints
    const userId1 = currentUserId < friend.id ? currentUserId : friend.id;
    const userId2 = currentUserId < friend.id ? friend.id : currentUserId;

    // Check if friendship already exists
    const { data: existing, error: _checkError } = await supabase
      .from('friendships')
      .select('*')
      .eq('user_id_1', userId1)
      .eq('user_id_2', userId2)
      .single();

    if (existing) {
      // Return existing
      return { ...existing, friend } as Friendship;
    }

    // Insert new friendship
    const { data: inserted, error: insertError } = await supabase
      .from('friendships')
      .insert({
        user_id_1: userId1,
        user_id_2: userId2,
        creator_id: currentUserId,
        status: friend.auto_accept_requests ? 'accepted' : 'pending',
      })
      .select()
      .single();

    if (insertError) {
      // Handle race conditions or constraints
      if (insertError.code === '23505') {
         throw new Error('You are already friends.');
      }
      throw insertError;
    }

    return { ...inserted, friend } as Friendship;
  },

  /**
   * Add a friend directly by their username
   */
  async addFriendByUsername(username: string, currentUserId: string): Promise<Friendship> {
    // Look up the user by username (case-insensitive due to DB constraints usually, but let's do exactly what's typed or use ilike if needed)
    const { data: friend, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (profileError || !friend) {
      throw new Error('User not found.');
    }

    if (friend.id === currentUserId) {
      throw new Error('You cannot add yourself as a friend.');
    }

    // Sort IDs to maintain constraints
    const userId1 = currentUserId < friend.id ? currentUserId : friend.id;
    const userId2 = currentUserId < friend.id ? friend.id : currentUserId;

    // Check if friendship already exists
    const { data: existing, error: _checkError } = await supabase
      .from('friendships')
      .select('*')
      .eq('user_id_1', userId1)
      .eq('user_id_2', userId2)
      .single();

    if (existing) {
      return { ...existing, friend: friend as UserProfile } as Friendship;
    }

    // Insert new friendship
    const { data: inserted, error: insertError } = await supabase
      .from('friendships')
      .insert({
        user_id_1: userId1,
        user_id_2: userId2,
        creator_id: currentUserId,
        status: friend.auto_accept_requests ? 'accepted' : 'pending',
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
         throw new Error('You are already friends.');
      }
      throw insertError;
    }

    return { ...inserted, friend: friend as UserProfile } as Friendship;
  },

  /**
   * Fetch all friendships for the user
   */
  async getFriendships(userId: string): Promise<Friendship[]> {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        *,
        user1:profiles!friendships_user_id_1_fkey(*),
        user2:profiles!friendships_user_id_2_fkey(*)
      `)
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

    if (error) throw error;

    // Map the joined profile data to a simpler 'friend' property
    return data.map((f: any) => {
      const isUser1 = f.user_id_1 === userId;
      const friendProfile = isUser1 ? f.user2 : f.user1;
      
      const friendship: Friendship = {
        id: f.id,
        user_id_1: f.user_id_1,
        user_id_2: f.user_id_2,
        creator_id: f.creator_id,
        status: f.status,
        created_at: f.created_at,
        updated_at: f.updated_at,
        user_1_cleared_at: f.user_1_cleared_at,
        user_2_cleared_at: f.user_2_cleared_at,
        friend: friendProfile as UserProfile
      };
      
      return friendship;
    });
  },

  /**
   * Clear history for a user up to a specific timestamp
   */
  async clearHistory(friendship: Friendship, currentUserId: string, clearTimestamp: string): Promise<void> {
    const isUser1 = friendship.user_id_1 === currentUserId;
    const updatePayload = isUser1 
      ? { user_1_cleared_at: clearTimestamp } 
      : { user_2_cleared_at: clearTimestamp };

    const { error } = await supabase
      .from('friendships')
      .update(updatePayload)
      .eq('id', friendship.id);

    if (error) throw error;
  }
};
