import React, { useState } from 'react';
import { useAuth, ROLE_LABELS } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Shield, Sparkles, CheckCircle2, LogOut, Sun, Moon } from 'lucide-react';

export default function Navbar() {
  const { currentUser, logout, setIsAiOpen, notification } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <header className="h-14 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-6 flex items-center justify-between sticky top-0 z-20 transition-colors">
      {/* Active User Info & Role Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md py-1 px-2.5">
          <Shield className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Role:</span>
          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">
            {ROLE_LABELS[currentUser.role] || currentUser.role}
          </span>
        </div>

        <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>Authenticated</span>
        </span>
      </div>

      {/* Right Header Actions */}
      <div className="flex items-center gap-3">
        {notification && (
          <div className="text-xs px-3 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{notification.message}</span>
          </div>
        )}

        {/* Minimalist Ask Grok AI Button */}
        <button
          onClick={() => setIsAiOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-300 text-xs font-medium transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
          <span>Ask Grok AI</span>
        </button>

        {/* Sun / Moon Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User Profile Menu */}
        <div className="relative pl-3 border-l border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none cursor-pointer"
          >
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt="User Avatar" className="w-7 h-7 rounded-full border border-zinc-300 dark:border-zinc-700 object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200 font-bold text-[11px]">
                {getInitials(currentUser.name)}
              </div>
            )}
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">{currentUser.name}</p>
              <p className="text-[10px] text-zinc-500">{currentUser.email}</p>
            </div>
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl p-2.5 space-y-2 z-50">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2 px-1">
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{currentUser.name}</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{currentUser.email}</p>
                <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 font-medium border border-zinc-200 dark:border-zinc-700">
                  {ROLE_LABELS[currentUser.role] || currentUser.role}
                </span>
              </div>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
