import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth, ROLES, ROLE_LABELS } from '../context/AuthContext';
import { ShieldAlert, Home, Lock } from 'lucide-react';
import { PaperSheet } from './layout/PaperSheet';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, loading, currentRole } = useAuth();
  const navigate = useNavigate();

  /* Loading State */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E9] dark:bg-[#101514] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="flex flex-col items-center gap-3 text-[#5D6560]">
          <div className="w-10 h-10 rounded-full border-2 border-[#15803D]/20 border-t-[#15803D] animate-spin" />
          <p className="font-mono text-xs font-semibold text-[#1C201E] dark:text-[#F5F7F6]">
            Verifying Workspace Credentials...
          </p>
        </div>
      </div>
    );
  }

  /* Unauthenticated Fallback */
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  /* Supplier Attempting to Access Internal Workspace */
  if (user.role === ROLES.SUPPLIER && allowedRoles && !allowedRoles.includes(ROLES.SUPPLIER)) {
    return <Navigate to="/supplier" replace />;
  }

  /* 403 Forbidden Access State for Unauthorized Internal Role */
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[80vh] w-full flex items-center justify-center p-6">
        <PaperSheet variant="default" className="w-full max-w-md p-8 text-center space-y-5 border-[#E3DDD1] shadow-lg">
          
          {/* Security Icon Badge */}
          <div className="mx-auto w-12 h-12 rounded-sm bg-[#FEE2E2] dark:bg-[#351C1C] border border-[#FECACA] flex items-center justify-center text-[#DC2626]">
            <ShieldAlert className="w-6 h-6 stroke-[2]" />
          </div>

          {/* Heading & Details */}
          <div className="space-y-2">
            <span className="inline-block px-2.5 py-0.5 rounded-xs bg-[#FEE2E2] dark:bg-[#351C1C] border border-[#FECACA] text-[10px] font-mono font-bold text-[#DC2626] uppercase tracking-wider">
              ROLE-RESTRICTED WORKSPACE
            </span>
            <h2 className="text-base font-bold font-sans text-[#1C201E] dark:text-[#F5F7F6] tracking-tight">
              Access Restricted for Your Role
            </h2>
            <p className="text-xs text-[#68716D] dark:text-[#8E9C97] leading-relaxed">
              You are signed in as{' '}
              <strong className="font-semibold text-[#1C201E] dark:text-[#F5F7F6]">
                {ROLE_LABELS?.[user.role] || user.role}
              </strong>
              . This operational module is restricted to authorized departments.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate(user.role === ROLES.SUPPLIER ? '/supplier' : '/')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-sm text-xs font-mono font-bold bg-[#15803D] hover:bg-[#166534] text-white transition-colors cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Return to My Authorized Workspace</span>
            </button>
          </div>

        </PaperSheet>
      </div>
    );
  }

  return children;
}
