import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { RELEASE_LABEL } from '../config/release';
import { GoogleLogin } from '@react-oauth/google';
import { 
  Boxes, 
  Lock, 
  Mail, 
  ArrowRight, 
  Sun, 
  Moon, 
  AlertCircle,
  Truck,
  Receipt,
  ShoppingCart,
  ShieldCheck,
  Building2,
  CheckCircle2
} from 'lucide-react';

export default function LoginPage() {
  const { login, googleLogin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    { role: 'Procurement', title: 'Procurement Mgr', email: 'procurement@cogniyard.com', icon: ShoppingCart },
    { role: 'Warehouse', title: 'Yard & Logistics', email: 'warehouse@cogniyard.com', icon: Truck },
    { role: 'Finance', title: 'Finance & AP', email: 'finance@cogniyard.com', icon: Receipt },
    { role: 'Admin', title: 'Operations Admin', email: 'admin@cogniyard.com', icon: ShieldCheck },
    { role: 'Supplier', title: 'Supplier Portal', email: 'supplier@cogniyard.com', icon: Building2 }
  ];

  const handleQuickLogin = async (demoEmail, demoPassword = 'password123') => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setLoading(true);
    try {
      await login(demoEmail, demoPassword);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Demo login failed. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F7F5EF] dark:bg-[#111413] text-[#1A1F1D] dark:text-[#F2F4F3] font-sans">
      
      {/* LEFT SIDE: 45% INDUSTRIAL VISUAL PANEL */}
      <div 
        className="md:w-5/12 min-h-[300px] md:min-h-screen relative p-8 md:p-12 flex flex-col justify-between overflow-hidden bg-[#111817] text-white border-r border-[#18211F]"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(22, 101, 52, 0.45) 0%, rgba(17, 24, 23, 0.95) 75%)',
        }}
      >
        {/* Subtle engineering line overlay */}
        <div className="absolute inset-0 bg-grid-paper opacity-20 pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-[#166534] text-white font-mono font-bold text-sm border border-[#15803D] shadow-sm">
            CY
          </div>
          <div>
            <h1 className="text-sm font-bold font-mono tracking-wider uppercase text-white">
              CogniYard
            </h1>
            <p className="text-[10px] font-mono text-[#7A8683]">
              Supply Chain Operations OS
            </p>
          </div>
        </div>

        {/* Industrial Narrative & Cadence */}
        <div className="relative z-10 my-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-sm bg-[#166534]/30 border border-[#15803D]/40 text-[#A3E635] text-[11px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A3E635] animate-pulse" />
            OPERATIONAL CADENCE v2.4
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-white leading-tight font-sans">
            Supply Chain Operations, Connected.
          </h2>
          <p className="text-xs text-[#A3ACA8] leading-relaxed max-w-md">
            Unifying Requisitions, Supplier Matrix, Gate Computer Vision, Yard Digital Twin, and Autonomous 3-Way Reconciliation into an operations workbook.
          </p>

          <div className="pt-4 border-t border-[#232D2B] grid grid-cols-2 gap-3 text-[11px] font-mono text-[#7A8683]">
            <div>
              <span className="text-white block font-bold">Autonomous</span>
              <span>Procure-to-Pay</span>
            </div>
            <div>
              <span className="text-white block font-bold">1:100 Scale</span>
              <span>Yard Simulation</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-[#7A8683]">
          <span>{RELEASE_LABEL}</span>
          <span>© CogniYard Enterprise</span>
        </div>
      </div>

      {/* RIGHT SIDE: 55% WARM PAPER AUTHENTICATION SHEET */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          
          {/* Top Header & Theme Switch */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold font-sans text-[#1A1F1D] dark:text-[#F2F4F3]">
                Console Access
              </h2>
              <p className="text-xs text-[#5D6560] dark:text-[#A3ACA8] mt-0.5">
                Sign in to your operational workspace
              </p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-sm border border-[#DDD9CF] dark:border-[#2B3533] bg-[#FBFAF5] dark:bg-[#181D1C] text-[#5D6560] hover:bg-[#F3F1E8] dark:text-[#A3ACA8] dark:hover:bg-[#1E2423] transition-colors flex items-center gap-1.5 text-xs font-mono"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-[#F59E0B]" /> : <Moon className="w-4 h-4 text-[#4A524E]" />}
              <span className="text-[10px] font-bold">{isDark ? 'LIGHT' : 'DARK'}</span>
            </button>
          </div>

          {/* Quick 1-Click Role Switcher */}
          <div className="p-3.5 rounded-sm bg-[#FBFAF5] dark:bg-[#181D1C] border border-[#DDD9CF] dark:border-[#2B3533] paper-shadow space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5D6560] dark:text-[#A3ACA8]">
              1-Click Operational Role Demo:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {demoAccounts.map((acc) => {
                const Icon = acc.icon;
                return (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => handleQuickLogin(acc.email)}
                    disabled={loading}
                    className="p-2 rounded-xs border border-[#DDD9CF] dark:border-[#2B3533] bg-[#F3F1E8] dark:bg-[#1E2423] hover:bg-[#EAE7DC] dark:hover:bg-[#252D2B] text-left transition-colors flex items-center gap-2 group"
                  >
                    <Icon className="w-3.5 h-3.5 text-[#166534] dark:text-[#15803D] shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold font-mono text-[#1A1F1D] dark:text-[#F2F4F3] truncate">
                        {acc.role}
                      </div>
                      <div className="text-[9px] text-[#5D6560] dark:text-[#A3ACA8] truncate">
                        {acc.title}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-sm bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Traditional Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-mono font-semibold text-[#1A1F1D] dark:text-[#F2F4F3]">
                Operator Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@cogniyard.com"
                  className="w-full px-3 py-2 rounded-sm bg-[#FBFAF5] dark:bg-[#181D1C] border border-[#DDD9CF] dark:border-[#2B3533] text-xs font-sans text-[#1A1F1D] dark:text-[#F2F4F3] placeholder-[#8A908B] focus:border-[#166534] focus:outline-none"
                />
                <Mail className="w-4 h-4 absolute right-3 top-2.5 text-[#8A908B]" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-mono font-semibold text-[#1A1F1D] dark:text-[#F2F4F3]">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 rounded-sm bg-[#FBFAF5] dark:bg-[#181D1C] border border-[#DDD9CF] dark:border-[#2B3533] text-xs font-mono text-[#1A1F1D] dark:text-[#F2F4F3] placeholder-[#8A908B] focus:border-[#166534] focus:outline-none"
                />
                <Lock className="w-4 h-4 absolute right-3 top-2.5 text-[#8A908B]" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-sm bg-[#166534] text-white text-xs font-mono font-bold tracking-wider uppercase hover:bg-[#15803D] transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Authenticating Console...</span>
              ) : (
                <>
                  <span>Sign In to System</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Google Auth & Register Link */}
          <div className="space-y-3 text-center">
            <div className="relative flex items-center justify-center">
              <div className="border-t border-[#DDD9CF] dark:border-[#2B3533] w-full" />
              <span className="bg-[#F7F5EF] dark:bg-[#111413] px-2 text-[10px] font-mono text-[#8A908B] uppercase">
                OR
              </span>
            </div>

            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={googleLogin}
                onError={() => setError('Google Sign-In failed.')}
                theme={isDark ? 'filled_black' : 'outline'}
                shape="rectangular"
                size="medium"
              />
            </div>

            <p className="text-xs text-[#5D6560] dark:text-[#A3ACA8] font-sans">
              Need new operator credentials?{' '}
              <Link to="/register" className="font-semibold text-[#166534] dark:text-[#15803D] hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
