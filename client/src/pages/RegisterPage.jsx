import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Boxes, 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  Sun, 
  Moon, 
  AlertCircle,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      await register(name, email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors selection:bg-indigo-500 selection:text-white">
      
      {/* Ambient Radial Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 right-10 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-5 right-5 p-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-all shadow-2xs cursor-pointer z-10"
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
      </button>

      {/* Main Container Card */}
      <div className="w-full max-w-md bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-7 sm:p-8 rounded-3xl shadow-xl space-y-6 relative z-10">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 items-center justify-center text-white shadow-md shadow-indigo-500/20 mb-1">
            <Boxes className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Create CogniYard Account
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Autonomous Supply Chain & Yard Operations
            </p>
          </div>
        </div>

        {/* Error Notification Alert */}
        {error && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Akash Santra"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 rounded-xl pl-10 pr-3.5 py-2.5 text-xs focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="akash@cogniyard.com"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 rounded-xl pl-10 pr-3.5 py-2.5 text-xs focus:outline-none transition-all font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 rounded-xl pl-10 pr-3.5 py-2.5 text-xs focus:outline-none transition-all font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 rounded-xl pl-10 pr-3.5 py-2.5 text-xs focus:outline-none transition-all font-mono"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-zinc-100 dark:text-zinc-950 text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] cursor-pointer"
            >
              {loading ? (
                <span className="font-mono">Provisioning Identity...</span>
              ) : (
                <>
                  <span>Create Workspace Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security Assurance Badge */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Role-Based Zero-Trust Encryption</span>
        </div>

        {/* Footer Navigation */}
        <div className="text-center text-xs text-zinc-400 dark:text-zinc-500 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
          Already have an operational account?{' '}
          <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}