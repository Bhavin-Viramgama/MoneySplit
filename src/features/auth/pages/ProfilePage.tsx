import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { updateProfile } from '@/features/auth/services/auth.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function ProfilePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [editUsername, setEditUsername] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && profile) {
      setEditUsername(profile.username || '');
      setLoading(false);
    }
  }, [user, profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editUsername.trim()) return;

    const usernameRegex = /^[a-z0-9_]{3,24}$/i;
    if (!usernameRegex.test(editUsername.trim())) {
      alert("Username must be between 3 and 24 characters, and can only contain letters, numbers, and underscores.");
      return;
    }

    try {
      setSavingProfile(true);
      await updateProfile(user.id, {
        username: editUsername.trim(),
      });
      alert('Profile updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner className="h-8 w-8 text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto w-full h-full">
      <div className="max-w-3xl mx-auto w-full p-4 md:p-8 space-y-8 pb-12">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-slate-400 hover:text-white">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <User className="h-6 w-6 text-slate-400" />
          <h1 className="text-2xl font-semibold text-white tracking-tight">Your Profile</h1>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">Personal Information</h2>
          
          <form onSubmit={handleUpdateProfile} className="rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur-xl shadow-xl space-y-4">
            <div className="space-y-4 max-w-sm">
              <Input 
                label="Username" 
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="username"
                required
              />
              <Button type="submit" loading={savingProfile} disabled={savingProfile}>
                Save Profile
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
