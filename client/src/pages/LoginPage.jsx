import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  Store
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
    {
      role: 'Procurement',
      title: 'Procurement Mgr',
      email: 'procurement@cogniyard.com',
      icon: ShoppingCart,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-500/10'
    },
    {
      role: 'Warehouse',
      title: 'Yard & Logistics',
      email: 'warehouse@cogniyard.com',
      icon: Truck,
      color: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-500/10'
    },
    {
      role: 'Finance',
      title: 'Finance & AP',
      email: 'finance@cogniyard.com',
      icon: Receipt,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-500/10'
    },
    {
      role: 'Admin',
      title: 'System Admin',
      email: 'admin@cogniyard.com',
      icon: ShieldCheck,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10'
    },
    {
      role: 'Supplier',
      title: 'Supplier Portal',
      email: 'supplier@cogniyard.com',
      icon: Store,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-500/10'
    }
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
      setError(err.response?.data?.message || 'Demo login failed. Start MongoDB, then run the setup again.');
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

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      await googleLogin({ token: credentialResponse.credential });
      navigate('/');
    } catch (err) {
      setError('Google Sign-In failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cogniyard-centered min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors selection:bg-purple-500 selection:text-white">

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-5 right-5 p-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-all shadow-2xs cursor-pointer z-10"
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
      </button>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-7 sm:p-8 rounded-3xl shadow-xl space-y-6 relative z-10">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-purple-500 items-center justify-center text-white shadow-md shadow-purple-500/20 mb-1">
            <Boxes className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              CogniYard Platform
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Autonomous Yard Logistics & Procurement AI
            </p>
            <span className="inline-flex mt-2 px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
              {RELEASE_LABEL}
            </span>
          </div>
        </div>

        {/* Error Notification Alert */}
        {error && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="procurement@cogniyard.com"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-1 focus:ring-purple-500 dark:focus:ring-purple-400 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 rounded-xl pl-10 pr-3.5 py-2.5 text-xs focus:outline-none transition-all font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Password
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">Demo: password123</span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-1 focus:ring-purple-500 dark:focus:ring-purple-400 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 rounded-xl pl-10 pr-3.5 py-2.5 text-xs focus:outline-none transition-all font-mono"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-zinc-100 dark:text-zinc-950 text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] cursor-pointer"
          >
            {loading ? (
              <span className="font-mono">Authenticating Session...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center py-0.5">
          <div className="flex-grow border-t border-zinc-200/80 dark:border-zinc-800/80" />
          <span className="flex-shrink mx-3 text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
            Single Sign-On
          </span>
          <div className="flex-grow border-t border-zinc-200/80 dark:border-zinc-800/80" />
        </div>

        {/* Google OAuth Login */}
        <div className="flex justify-center">
          {import.meta.env.VITE_GOOGLE_CLIENT_ID ? <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google Sign-In failed')}
            theme={isDark ? "filled_black" : "outline"}
            shape="pill"
            size="medium"
          /> : <span className="text-[11px] text-zinc-400">Google sign-in is not configured. Email/password login is available.</span>}
        </div>

        {/* Quick Demo Profiles Grid */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            <span>One-Click Demo Sign In</span>
            <span className="font-mono text-purple-600 dark:text-purple-400">Choose your job</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((acc, idx) => {
              const Icon = acc.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickLogin(acc.email, 'password123')}
                  className="p-2.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-950/60 border border-zinc-200/70 dark:border-zinc-800/70 hover:border-purple-300 dark:hover:border-purple-800/60 hover:bg-white dark:hover:bg-zinc-900 text-left transition-all group cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`p-1 rounded-md ${acc.bg} ${acc.color}`}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-200 text-[11px] truncate">
                      {acc.title}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-400 truncate">
                    {acc.email}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Registration Link */}
        <div className="text-center text-xs text-zinc-400 dark:text-zinc-500 pt-1">
          Don't have an enterprise account?{' '}
          <Link to="/register" className="text-purple-600 dark:text-purple-400 font-semibold hover:underline">
            Register workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
