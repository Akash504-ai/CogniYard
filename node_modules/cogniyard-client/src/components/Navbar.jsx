import React, { useEffect, useRef, useState } from 'react';
import { useAuth, ROLE_LABELS, ROLES } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Shield,
  Sparkles,
  Sun
} from 'lucide-react';

export default function Navbar({ onOpenNavigation }) {
  const { currentUser, logout, setIsAiOpen } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef(null);
  const canUseAi = [ROLES.ADMIN, ROLES.PROCUREMENT].includes(currentUser?.role);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
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
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-3 dark:border-zinc-800 dark:bg-zinc-950 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenNavigation}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Shield className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
          <span className="hidden text-zinc-500 sm:inline">Role</span>
          <strong className="truncate font-medium text-zinc-900 dark:text-zinc-100">
            {ROLE_LABELS?.[currentUser?.role] || currentUser?.role || 'Guest'}
          </strong>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {canUseAi && (
          <button
            type="button"
            onClick={() => setIsAiOpen(true)}
            className="hidden min-h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 sm:inline-flex"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
            Ask AI
          </button>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu(previous => !previous)}
            aria-expanded={showProfileMenu}
            aria-haspopup="menu"
            className="flex min-h-10 items-center gap-2 rounded-md px-1.5 text-left transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:hover:bg-zinc-900 sm:px-2"
          >
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt=""
                className="h-8 w-8 rounded-md border border-zinc-200 object-cover dark:border-zinc-700"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-50 text-xs font-semibold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                {getInitials(currentUser?.name)}
              </div>
            )}
            <div className="hidden min-w-0 xl:block">
              <p className="max-w-40 truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
                {currentUser?.name || 'User'}
              </p>
              <p className="max-w-40 truncate text-[10px] text-zinc-500">
                {currentUser?.email || 'user@cogniyard.ai'}
              </p>
            </div>
            <ChevronDown className={`hidden h-3.5 w-3.5 text-zinc-400 transition-transform sm:block ${showProfileMenu ? 'rotate-180' : ''}`} />
          </button>

          {showProfileMenu && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-64 rounded-lg border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="border-b border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
                <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">{currentUser?.name}</p>
                <p className="mt-0.5 truncate text-[11px] text-zinc-500">{currentUser?.email}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                }}
                className="mt-1 flex min-h-9 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-400 dark:hover:bg-rose-950/30"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
