import React, { useState, useRef, useEffect } from 'react';
import { useAuth, ROLE_LABELS } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Shield,
  Sparkles,
  CheckCircle2,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
  User,
  Settings,
  Activity
} from 'lucide-react';

export default function Navbar() {
  const { currentUser, logout, setIsAiOpen, notification } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-16 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/80 dark:border-zinc-800/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-all">
      {/* Left: Active Role & Telemetry */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 rounded-lg py-1.5 px-3 shadow-2xs">
          <div className="w-5 h-5 rounded-md bg-indigo-500/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium uppercase tracking-wider">Role</span>
          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {ROLE_LABELS?.[currentUser?.role] || currentUser?.role || 'Guest'}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-emerald-500/5 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Live Ops</span>
        </div>
      </div>

      {/* Right: Actions, AI Trigger, Theme Toggle & Profile */}
      <div className="flex items-center gap-2.5">
        {/* Dynamic Notification Toast */}
        {notification && (
          <div className="hidden md:flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 animate-in fade-in slide-in-from-top-1 duration-200 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-medium max-w-[200px] truncate">{notification.message}</span>
          </div>
        )}

        {/* Ask Grok AI Action Button */}
        <button
          onClick={() => setIsAiOpen(true)}
          className="group relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-100 dark:to-zinc-200 text-zinc-100 dark:text-zinc-900 hover:opacity-95 shadow-sm text-xs font-medium transition-all active:scale-[0.98] cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 dark:text-indigo-600 transition-transform group-hover:rotate-12" />
          <span>Ask Grok AI</span>
        </button>

        {/* Sun / Moon Theme Switcher */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="p-2 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer shadow-2xs"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
        </button>

        <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800 mx-1 hidden sm:block" />

        {/* User Profile Container */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowProfileMenu(prev => !prev)}
            aria-expanded={showProfileMenu}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900/80 border border-transparent hover:border-zinc-200/60 dark:hover:border-zinc-800 transition-all cursor-pointer focus:outline-none"
          >
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt="Profile"
                className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center tracking-wide shadow-2xs">
                {getInitials(currentUser?.name)}
              </div>
            )}
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                {currentUser?.name || 'User'}
              </p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono tracking-tight leading-tight truncate max-w-[110px]">
                {currentUser?.email || 'user@cogniyard.ai'}
              </p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Profile Dropdown Window */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-60 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200/90 dark:border-zinc-800/90 rounded-xl shadow-2xl p-1.5 space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800/80 mb-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{currentUser?.name}</p>
                  <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                    {ROLE_LABELS?.[currentUser?.role] || currentUser?.role}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">{currentUser?.email}</p>
              </div>

              <div className="px-1 space-y-0.5">
                <button
                  onClick={() => setShowProfileMenu(false)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Profile Overview</span>
                </button>
                <button
                  onClick={() => setShowProfileMenu(false)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Audit Logs</span>
                </button>
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-1 mt-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}