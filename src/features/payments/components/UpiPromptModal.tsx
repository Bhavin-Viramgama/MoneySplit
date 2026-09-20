import { X, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function UpiPromptModal({ isOpen, onClose }: Props) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-black/60 p-8 shadow-2xl relative backdrop-blur-xl flex flex-col items-center text-center">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="h-16 w-16 bg-[var(--color-ms-accent)]/10 text-[var(--color-ms-accent)] rounded-full flex items-center justify-center mb-4 border border-[var(--color-ms-accent)]/20">
          <QrCode className="h-8 w-8" />
        </div>
        
        <h2 className="text-xl font-semibold text-white mb-2">Enable UPI Payments</h2>
        <p className="text-sm text-slate-400 mb-6">
          Add your UPI ID so your friends can easily pay you back directly through the app.
        </p>

        <div className="w-full space-y-3">
          <Button 
            className="w-full" 
            onClick={() => {
              onClose();
              navigate('/settings');
            }}
          >
            Add UPI ID Now
          </Button>
          <Button 
            variant="ghost" 
            className="w-full text-slate-400 hover:text-white" 
            onClick={onClose}
          >
            Maybe Later
          </Button>
        </div>
      </div>
    </div>
  );
}
