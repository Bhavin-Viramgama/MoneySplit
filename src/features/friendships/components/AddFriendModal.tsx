import { useState, useEffect } from 'react';
import { Copy, Check, QrCode, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { friendshipsService } from '../services/friendships.service';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdded?: () => void;
}

export function AddFriendModal({ isOpen, onClose, onAdded }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [joinToken, setJoinToken] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  const [usernameSearch, setUsernameSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  const [showInviteDetails, setShowInviteDetails] = useState(false);

  useEffect(() => {
    if (isOpen && user && !inviteToken) {
      loadToken();
    }
  }, [isOpen, user]);

  const loadToken = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const token = await friendshipsService.getMyInviteToken(user.id);
      setInviteToken(token);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const inviteLink = inviteToken ? `${window.location.origin}/invite/${inviteToken}` : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinToken) return;
    
    // Extract token if they pasted full link
    let tokenToUse = joinToken;
    try {
      const url = new URL(joinToken);
      const parts = url.pathname.split('/');
      tokenToUse = parts[parts.length - 1];
    } catch {
      // Not a URL, use as is
    }

    try {
      setJoinLoading(true);
      setJoinError('');
      // Navigate to the invite page to show the confirmation UI
      navigate(`/invite/${tokenToUse}`);
      onClose();
    } catch (err: any) {
      setJoinError(err.message || 'Invalid token');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleAddByUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameSearch || !user) return;
    
    // Remove @ if user typed it
    const cleanUsername = usernameSearch.startsWith('@') ? usernameSearch.substring(1) : usernameSearch;

    try {
      setSearchLoading(true);
      setSearchError('');
      await friendshipsService.addFriendByUsername(cleanUsername, user.id);
      onAdded?.();
      onClose(); // Automatically close on success since they are added directly
    } catch (err: any) {
      setSearchError(err.message || 'User not found');
    } finally {
      setSearchLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/60 p-8 shadow-2xl relative backdrop-blur-xl overflow-hidden">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-semibold text-white mb-6">Add a Friend</h2>
        
        {/* Add by Username Section (Default Primary) */}
        <form onSubmit={handleAddByUsername} className="space-y-4 mb-8">
          <label className="block text-sm font-medium text-slate-300">Add by Username</label>
          <div className="flex gap-2">
            <Input
              value={usernameSearch}
              onChange={(e) => setUsernameSearch(e.target.value)}
              placeholder="@username"
              className="flex-1 !bg-white/5 !border-white/10 text-white"
              error={searchError}
              autoFocus
            />
            <Button 
              type="submit" 
              disabled={!usernameSearch || searchLoading}
              loading={searchLoading}
              className="px-4 shrink-0 h-[42px]"
            >
              Add Friend
            </Button>
          </div>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5" />
          </div>
          <div className="relative flex justify-center text-xs uppercase font-medium">
            <span className="bg-black/60 px-2 text-slate-500">Other options</span>
          </div>
        </div>

        {/* Join by Code Section */}
        <form onSubmit={handleJoin} className="space-y-4 mb-6">
          <div className="flex gap-2">
            <Input
              value={joinToken}
              onChange={(e) => setJoinToken(e.target.value)}
              placeholder="Paste invite link or code..."
              className="flex-1 !bg-white/5 !border-white/10 text-white"
              error={joinError}
            />
            <Button 
              type="submit" 
              variant="secondary"
              disabled={!joinToken || joinLoading}
              loading={joinLoading}
              className="px-4 shrink-0 h-[42px]"
            >
              Review
            </Button>
          </div>
        </form>

        {/* Generate Invite Section */}
        <div className="space-y-4">
          <Button 
            type="button"
            variant="ghost" 
            onClick={() => setShowInviteDetails(!showInviteDetails)}
            className="w-full text-slate-400 hover:text-white"
          >
            <QrCode className="h-4 w-4 mr-2" />
            {showInviteDetails ? 'Hide Invite Link' : 'Show Invite Link & QR'}
          </Button>
          
          {showInviteDetails && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in slide-in-from-top-2">
              {loading || !inviteLink ? (
                <LoadingSpinner className="h-8 w-8 text-emerald-500" />
              ) : (
                <>
                  <div className="bg-white p-2 rounded-xl mb-4">
                    <QRCodeSVG value={inviteLink} size={120} />
                  </div>
                  
                  <div className="flex w-full items-center gap-2">
                    <Input 
                      value={inviteLink} 
                      readOnly 
                      className="flex-1 font-mono text-sm !bg-black/40 !border-white/5 text-slate-300"
                    />
                    <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={handleCopy}
                      className="shrink-0 rounded-xl"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400 mt-3 text-center">
                    Share this QR or link. Anyone with the link can add you.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
