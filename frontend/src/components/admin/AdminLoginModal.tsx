import React, { useState } from 'react';
import { Lock, User, KeyRound, X, AlertCircle } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { TouchButton } from '../common/TouchButton';

export const AdminLoginModal: React.FC = () => {
  const { isAdminOpen, setIsAdminOpen, isAuthenticated, login, error } = useAdmin();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAdminOpen || isAuthenticated) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await login(username, password);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-cream-200 animate-pop relative">
        <button
          onClick={() => setIsAdminOpen(false)}
          className="absolute top-6 right-6 p-2 rounded-xl text-neutral-400 hover:text-neutral-800 hover:bg-cream-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-korean-charcoal text-white flex items-center justify-center shadow-touch">
            <Lock className="w-6 h-6 text-korean-butter" />
          </div>
          <div>
            <h3 className="text-xl font-black text-korean-charcoal">
              Admin Authentication
            </h3>
            <p className="text-xs font-semibold text-neutral-400">
              Photo Booth Kiosk Management
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
              Username
            </label>
            <div className="relative flex items-center">
              <User className="w-5 h-5 text-neutral-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-cream-300 font-bold text-sm focus:outline-none focus:border-korean-charcoal bg-cream-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
              Password
            </label>
            <div className="relative flex items-center">
              <KeyRound className="w-5 h-5 text-neutral-400 absolute left-4 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-cream-300 font-bold text-sm focus:outline-none focus:border-korean-charcoal bg-cream-50"
              />
            </div>
          </div>

          <div className="text-[11px] text-neutral-400 bg-cream-100 p-2.5 rounded-xl">
            Default credentials: <span className="font-bold text-neutral-600">admin / admin123</span>
          </div>

          <TouchButton
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSubmitting}
            className="mt-2 w-full"
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
          </TouchButton>
        </form>
      </div>
    </div>
  );
};
