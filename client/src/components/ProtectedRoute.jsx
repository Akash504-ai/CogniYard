import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '../context/AuthContext';
import { ShieldAlert, Home, Lock } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();

  /* Enterprise Loading State */
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="relative flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 rounded-2xl border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
            <div className="absolute w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Lock className="w-3 h-3 text-purple-400" />
            </div>
          </div>

          <div className="text-center space-y-1">
            <p className="text-xs font-semibold text-zinc-200 tracking-tight">
              Loading Your Workspace
            </p>
            <p className="text-[11px] text-zinc-500 font-mono">
              Showing only the tools for your role…
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
        <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-8 shadow-xl text-center space-y-6">
          
          {/* Security Icon Badge */}
          <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm">
            <ShieldAlert className="w-7 h-7 stroke-[1.75]" />
          </div>

          {/* Heading & Details */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-900/40 text-[10px] font-mono font-semibold text-rose-600 dark:text-rose-400 tracking-wide uppercase">
              ROLE-ONLY WORKSPACE
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              This Page Is Not Part of Your Job
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              You are signed in as{' '}
              <span className="font-semibold text-zinc-900 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                {ROLE_LABELS?.[user.role] || user.role}
              </span>
              . To keep the website simple, this module is available only to the team responsible for it.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center pt-2">
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 transition-colors shadow-sm cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>My Workspace</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  return children;
}
