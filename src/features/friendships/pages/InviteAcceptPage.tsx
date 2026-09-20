import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserPlus, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { friendshipsService } from '../services/friendships.service';
import type { UserProfile } from '@/types';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [friend, setFriend] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (token) {
      loadFriend();
    } else {
      setError('Invalid invite link.');
      setLoading(false);
    }
  }, [token]);

  const loadFriend = async () => {
    try {
      setLoading(true);
      const profile = await friendshipsService.getUserByInviteToken(token!);
      if (profile.id === user?.id) {
        setError('This is your own invite link.');
      }
      setFriend(profile);
    } catch (err: any) {
      setError(err.message || 'Failed to load invite.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!token || !user || !friend) return;
    try {
      setAccepting(true);
      const friendship = await friendshipsService.acceptInvite(token, user.id);
      // Navigate to the chat page for this friendship
      navigate(`/friendship/${friendship.id}`, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to add friend.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner className="h-8 w-8 text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md pt-12">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)}
        className="mb-6 -ml-4 text-slate-400 hover:text-white"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
        {error ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-white">Oops!</h2>
            <p className="mb-6 text-slate-400">{error}</p>
            <Button onClick={() => navigate('/')} className="w-full">
              Go to Dashboard
            </Button>
          </div>
        ) : friend ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-800 text-2xl font-medium uppercase text-slate-300">
              {friend.display_name?.charAt(0) || friend.username.charAt(0)}
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-1">
              {friend.display_name || friend.username}
            </h2>
            <p className="text-slate-500 mb-8">@{friend.username}</p>

            <p className="text-slate-300 mb-8">
              is inviting you to connect on MoneySplit.
            </p>

            <Button 
              onClick={handleAccept} 
              disabled={accepting} 
              loading={accepting}
              className="w-full py-6 text-lg"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              Add Friend
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
