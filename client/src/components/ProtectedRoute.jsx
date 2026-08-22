import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft, Home, Lock, RefreshCw } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();

  /* Enterprise Loading State */
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 rounded-2xl border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <div className="absolute w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Lock className="w-3 h-3 text-indigo-400" />
            </div>
          </div>

          <div className="text-center space-y-1">
            <p className="text-xs font-semibold text-zinc-200 tracking-tight">
              Verifying CogniYard Credentials
            </p>
            <p className="text-[11px] text-zinc-500 font-mono">
              Establishing zero-trust session...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* Unauthenticated Fallback */
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  /* 403 Forbidden Access State */
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[80vh] w-full flex items-center justify-center p-6 relative">
        {/* Ambient Red Glow */}
        <div className="absolute w-96 h-96 bg-rose-500/5 dark:bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-8 shadow-xl text-center space-y-6">
          
          {/* Security Icon Badge */}
          <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm">
            <ShieldAlert className="w-7 h-7 stroke-[1.75]" />
          </div>

          {/* Heading & Details */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-900/40 text-[10px] font-mono font-semibold text-rose-600 dark:text-rose-400 tracking-wide uppercase">
              403 • Insufficient Privileges
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Access Restricted
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Your profile is authenticated under{' '}
              <span className="font-semibold text-zinc-900 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                {ROLE_LABELS?.[user.role] || user.role}
              </span>
              , which lacks access permissions for this operational console.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <button
              onClick={() => navigate(-1)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Go Back</span>
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 transition-colors shadow-sm cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
          </div>

          {/* Footer Security Note */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
            <p className="text-[10px] text-zinc-400 dark:text-zinc-600 font-mono">
              Event logged • Request role elevation from your sysadmin
            </p>
          </div>
        </div>
      </div>
    );
  }

  return children;
}