import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { RELEASE_LABEL } from '../config/release';
import { Boxes, Lock, Mail, User, ArrowRight, Sun, Moon, AlertCircle, Building2, ShieldCheck } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(name, email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Check user credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F7F5EF] dark:bg-[#111413] text-[#1A1F1D] dark:text-[#F2F4F3] font-sans">
      {/* LEFT SIDE: 45% INDUSTRIAL VISUAL PANEL */}
      <div 
        className="md:w-5/12 min-h-[260px] md:min-h-screen relative p-8 md:p-12 flex flex-col justify-between overflow-hidden bg-[#111817] text-white border-r border-[#18211F]"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(22, 101, 52, 0.45) 0%, rgba(17, 24, 23, 0.95) 75%)',
        }}
      >
        <div className="absolute inset-0 bg-grid-paper opacity-20 pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-[#166534] text-white font-mono font-bold text-sm border border-[#15803D]">
            CY
          </div>
          <div>
            <h1 className="text-sm font-bold font-mono tracking-wider uppercase text-white">CogniYard</h1>
            <p className="text-[10px] font-mono text-[#7A8683]">Operations OS</p>
          </div>
        </div>

        <div className="relative z-10 my-8 space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-sm bg-[#166534]/30 border border-[#15803D]/40 text-[#A3E635] text-[11px] font-mono">
            OPERATOR ONBOARDING
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white leading-tight font-sans">
            Provision New Operational Workspace
          </h2>
          <p className="text-xs text-[#A3ACA8] leading-relaxed max-w-md">
            Join the autonomous supply chain network. Manage yard dispatch, purchase requisitions, computer vision gate logs, and invoice matching.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-[#7A8683]">
          <span>{RELEASE_LABEL}</span>
          <span>© CogniYard</span>
        </div>
      </div>

      {/* RIGHT SIDE: 55% WARM PAPER REGISTRATION FORM */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold font-sans text-[#1A1F1D] dark:text-[#F2F4F3]">
                Create Operator Account
              </h2>
              <p className="text-xs text-[#5D6560] dark:text-[#A3ACA8] mt-0.5">
                Enter your credentials to provision console access
              </p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-sm border border-[#DDD9CF] dark:border-[#2B3533] bg-[#FBFAF5] dark:bg-[#181D1C] text-[#5D6560] hover:bg-[#F3F1E8] dark:text-[#A3ACA8] dark:hover:bg-[#1E2423]"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-sm bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-mono font-semibold text-[#1A1F1D] dark:text-[#F2F4F3]">
                Full Operator Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Akash Santre"
                  className="w-full px-3 py-2 rounded-sm bg-[#FBFAF5] dark:bg-[#181D1C] border border-[#DDD9CF] dark:border-[#2B3533] text-xs font-sans text-[#1A1F1D] dark:text-[#F2F4F3] placeholder-[#8A908B] focus:border-[#166534] focus:outline-none"
                />
                <User className="w-4 h-4 absolute right-3 top-2.5 text-[#8A908B]" />
              </div>
            </div>

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
              {loading ? <span>Creating Account...</span> : <span>Register Workspace</span>}
            </button>
          </form>

          <p className="text-center text-xs text-[#5D6560] dark:text-[#A3ACA8]">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-[#166534] dark:text-[#15803D] hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
