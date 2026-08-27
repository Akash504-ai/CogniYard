import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth, ROLES, ROLE_LABELS } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  ClipboardList,
  Truck,
  Route,
  CreditCard,
  FileUp,
  ShieldCheck,
  Sparkles,
  ShieldAlert,
  Settings,
  ChevronDown,
  ChevronLeft,
  LogOut,
  Boxes,
  Sun,
  Moon
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { currentUser, currentRole, logout, setIsAiOpen } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getRoleNavSections = () => {
    switch (currentRole) {
      case ROLES.PROCUREMENT:
        return [
          {
            title: 'WORKSPACE',
            items: [
              { to: '/', label: 'Home Dashboard', icon: LayoutDashboard },
              { to: '/procurement', label: 'Create Purchase Order', icon: ClipboardList }
            ]
          },
          {
            title: 'INTELLIGENCE',
            items: [
              { action: 'ai', label: 'Ask AI for Help', icon: Sparkles }
            ]
          }
        ];

      case ROLES.WAREHOUSE:
        return [
          {
            title: 'WORKSPACE',
            items: [
              { to: '/', label: 'Home Dashboard', icon: LayoutDashboard },
              { to: '/logistics', label: 'Receive Goods & GRN', icon: Truck },
              { to: '/yard-simulation', label: 'Intelligent Truck Simulation', icon: Route }
            ]
          },
          {
            title: 'INTELLIGENCE',
            items: [
              { action: 'ai', label: 'Ask AI', icon: Sparkles }
            ]
          }
        ];

      case ROLES.FINANCE:
        return [
          {
            title: 'WORKSPACE',
            items: [
              { to: '/', label: 'Home Dashboard', icon: LayoutDashboard },
              { to: '/finance', label: 'Match & Pay Invoice', icon: CreditCard }
            ]
          },
          {
            title: 'INTELLIGENCE',
            items: [
              { action: 'ai', label: 'Ask AI for Help', icon: Sparkles }
            ]
          }
        ];

      case ROLES.SUPPLIER:
        return [
          {
            title: 'WORKSPACE',
            items: [
              { to: '/supplier', label: 'Supplier Invoice Portal', icon: FileUp }
            ]
          }
        ];

      case ROLES.ADMIN:
      default:
        return [
          {
            title: 'WORKSPACE',
            items: [
              { to: '/', label: 'Home Dashboard', icon: LayoutDashboard },
              { to: '/admin', label: 'Add Suppliers & Users', icon: ShieldCheck },
              { to: '/procurement', label: 'Create Purchase Order', icon: ClipboardList },
              { to: '/logistics', label: 'Receive Goods & GRN', icon: Truck },
              { to: '/yard-simulation', label: 'Intelligent Truck Simulation', icon: Route },
              { to: '/finance', label: 'Match & Pay Invoice', icon: CreditCard }
            ]
          },
          {
            title: 'INTELLIGENCE',
            items: [
              { action: 'ai', label: 'Ask AI for Help', icon: Sparkles },
              { to: '/control-tower', label: 'Control Tower', icon: Boxes },
              { to: '/exceptions', label: 'Exceptions', icon: ShieldAlert }
            ]
          },
          {
            title: 'SYSTEM',
            items: [
              { to: '/admin', label: 'Administration', icon: Settings }
            ]
          }
        ];
    }
  };

  const navSections = getRoleNavSections();
  const spiralRings = Array.from({ length: 22 });

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col justify-between bg-[#121917] text-[#9EA8A4] transition-all duration-200 border-r border-[#23302C] select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'w-16' : 'w-64'}`}
      >
        {/* SPIRAL BINDING RINGS ON THE RIGHT EDGE */}
        <div className="absolute top-3 bottom-3 -right-3 z-50 flex flex-col justify-between pointer-events-none">
          {spiralRings.map((_, index) => (
            <div
              key={`ring-${index}`}
              className="w-5 h-2 rounded-full bg-gradient-to-r from-[#505D58] via-[#8C9893] to-[#2B3834] shadow-[1px_1px_2px_rgba(0,0,0,0.5)] border border-[#1A2320]"
            />
          ))}
        </div>

        {/* LOGO & BRAND HEADER */}
        <div className="p-4 border-b border-[#23302C] flex items-center justify-between bg-[#0F1413]">
          <NavLink to={currentRole === ROLES.SUPPLIER ? '/supplier' : '/'} className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-xs bg-[#15803D]/20 border border-[#15803D]/60 flex items-center justify-center text-[#4ADE80] shadow-xs group-hover:bg-[#15803D]/30 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>

            {!collapsed && (
              <div>
                <span className="font-handwriting font-bold text-lg text-[#F5F7F6] tracking-wide block leading-none">
                  CogniYard
                </span>
                <span className="text-[9px] text-[#4ADE80] uppercase tracking-wider block font-mono mt-1 font-semibold">
                  AI-ENABLED SCM PLATFORM
                </span>
              </div>
            )}
          </NavLink>
        </div>

        {/* ROLE-SCOPED NAVIGATION SECTIONS */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 font-sans text-xs scrollbar-thin scrollbar-thumb-[#23302C]">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              {!collapsed && (
                <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-[#5C6B66] border-b border-[#23302C]/40 pb-0.5 mb-1.5">
                  {section.title}
                </div>
              )}

              {section.items.map((item, idx) => {
                const Icon = item.icon;

                if (item.action === 'ai') {
                  return (
                    <button
                      key={`action-${idx}`}
                      type="button"
                      onClick={() => {
                        setIsAiOpen(true);
                        if (window.innerWidth < 1024) onClose?.();
                      }}
                      className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xs text-[#9EA8A4] hover:text-[#F5F7F6] hover:bg-[#1A2421] transition-colors group text-left border border-transparent hover:border-[#23302C]"
                    >
                      <Icon className="w-4 h-4 shrink-0 text-[#4ADE80] group-hover:scale-110 transition-transform" />
                      {!collapsed && (
                        <span className="font-medium truncate text-[#F5F7F6]">
                          {item.label}
                        </span>
                      )}
                    </button>
                  );
                }

                const isActive = item.to === '/'
                  ? location.pathname === '/' || location.pathname === '/dashboard'
                  : location.pathname.startsWith(item.to);

                return (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose?.();
                    }}
                    className={`flex items-center gap-3 px-2.5 py-2 rounded-xs transition-all group ${
                      isActive
                        ? 'bg-[#15803D]/15 text-[#4ADE80] border border-[#15803D]/50 shadow-xs font-semibold'
                        : 'text-[#9EA8A4] hover:text-[#F5F7F6] hover:bg-[#1A2421] border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-[#4ADE80]'
                          : 'text-[#68716D] group-hover:text-[#F5F7F6]'
                      }`}
                    />

                    {!collapsed && (
                      <span className="truncate">
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        {/* USER PROFILE & LOGOUT FOOTER */}
        <div className="p-2.5 border-t border-[#23302C] space-y-2 bg-[#0F1413]">
          {/* User Card */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center justify-between p-1.5 rounded-xs hover:bg-[#1A2421] border border-transparent hover:border-[#23302C] transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-xs bg-[#15803D] text-white flex items-center justify-center font-mono font-bold text-xs shrink-0 shadow-xs">
                  {currentUser?.name?.slice(0, 2).toUpperCase() || 'AL'}
                </div>

                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-[#F5F7F6] truncate">
                      {currentUser?.name || 'Alex Vance'}
                    </div>
                    <div className="text-[10px] text-[#8E9C97] font-mono truncate">
                      {ROLE_LABELS?.[currentRole] || 'Procurement Manager'}
                    </div>
                  </div>
                )}
              </div>

              {!collapsed && (
                <ChevronDown className="w-3.5 h-3.5 text-[#68716D]" />
              )}
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 p-1 rounded-xs bg-[#16201D] border border-[#23302C] shadow-2xl text-xs font-mono">
                {currentRole !== ROLES.SUPPLIER && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAiOpen(true);
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xs text-[#9EA8A4] hover:text-[#F5F7F6] hover:bg-[#23302C]"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#4ADE80]" />
                    <span>Launch AI Copilot</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    toggleTheme();
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xs text-[#9EA8A4] hover:text-[#F5F7F6] hover:bg-[#23302C]"
                >
                  {isDark ? <Sun className="w-3.5 h-3.5 text-[#F59E0B]" /> : <Moon className="w-3.5 h-3.5 text-[#9EA8A4]" />}
                  <span>{isDark ? 'Light Journal Mode' : 'Dark Journal Mode'}</span>
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xs text-[#EF4444] hover:bg-[#23302C]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>

          {/* Operational Status Indicator */}
          {!collapsed && (
            <div className="px-2 py-0.5 flex items-center gap-1.5 text-[10px] font-mono text-[#4ADE80]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
              <span>System Operational</span>
            </div>
          )}

          {/* Collapse Toggle */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full hidden lg:flex items-center gap-2 px-2 py-1 text-[11px] font-mono text-[#68716D] hover:text-[#9EA8A4] transition-colors"
          >
            <ChevronLeft className={`w-3.5 h-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}