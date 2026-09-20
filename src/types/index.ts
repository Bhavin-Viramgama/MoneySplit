import type { Session, User } from '@supabase/supabase-js';

/** Public profile data — safe for any authenticated user to see */
export interface UserProfile {
  id: string;
  username: string;
  username_normalized: string;
  avatar_path: string | null;
  require_settlement_approval: boolean;
  auto_accept_requests: boolean;
  created_at: string;
  updated_at: string;
}

/** Private profile data — only visible to the owner */
export interface PrivateProfile {
  user_id: string;
  recovery_email: string | null;
  recovery_email_verified: boolean;
  created_at: string;
  updated_at: string;
}

/** User Invite link */
export interface UserInvite {
  user_id: string;
  token: string;
  created_at: string;
  updated_at: string;
}

/** Friendship connection */
export interface Friendship {
  id: string;
  user_id_1: string;
  user_id_2: string;
  creator_id?: string;
  status: 'pending' | 'accepted';
  created_at: string;
  updated_at: string;
  user_1_cleared_at?: string;
  user_2_cleared_at?: string;
  
  // Joined relation for UI convenience
  friend?: UserProfile; 
}

/** Finance Entry (Expense or Settlement) */
export interface FinanceEntry {
  id: string;
  friendship_id: string;
  creator_id: string;
  paid_by: string;
  owed_by: string;
  amount: number;
  description: string;
  is_settlement: boolean;
  status: 'pending' | 'accepted' | 'rejected';
  is_edited?: boolean;
  original_amount?: number | null;
  original_description?: string | null;
  entry_date: string;
  created_at: string;
  updated_at: string;
}

/** Payment Method */
export interface PaymentMethod {
  id: string;
  user_id: string;
  type: 'upi' | 'bank_transfer' | 'crypto' | 'other';
  upi_id?: string;
  payee_name?: string;
  details?: Record<string, any>;
  is_default?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Joined relation for UI convenience
  members?: GroupMember[];
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  status: 'pending' | 'accepted';
  joined_at: string;
  
  // Joined relation
  profile?: UserProfile;
}

export interface GroupExpense {
  id: string;
  group_id: string;
  creator_id: string;
  paid_by: string;
  amount: number;
  description: string;
  is_edited?: boolean;
  original_amount?: number | null;
  original_description?: string | null;
  entry_date: string;
  created_at: string;
  updated_at: string;
  
  // Joined relations
  splits?: GroupSplit[];
  payer?: UserProfile;
}

export interface GroupSplit {
  expense_id: string;
  user_id: string;
  amount_owed: number;
  
  // Joined relation
  profile?: UserProfile;
}

/** Auth context state */
export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
}
