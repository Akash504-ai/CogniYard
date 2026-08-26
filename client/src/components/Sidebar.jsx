import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth, ROLES, ROLE_LABELS } from '../context/AuthContext';
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
  Bot,
  ChevronDown,
  ChevronLeft,
  LogOut,
  Boxes
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { currentUser, currentRole, logout, setIsAiOpen } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Define strictly role-scoped navigation sections
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
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col justify-between bg-[#101514] text-[#9EA8A4] transition-all duration-200 border-r border-[#1E2825] select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'w-16' : 'w-64'}`}
      >
        {/* LOGO & BRAND HEADER */}
        <div className="p-4 border-b border-[#1E2825] flex items-center justify-between">
          <NavLink to={currentRole === ROLES.SUPPLIER ? '/supplier' : '/'} className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-sm bg-[#14281E] border border-[#22C55E]/40 flex items-center justify-center text-[#22C55E] shadow-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>

            {!collapsed && (
              <div>
                <span className="font-bold text-sm text-white tracking-tight font-sans block">
                  CogniYard
                </span>
                <span className="text-[9px] text-[#68716D] uppercase tracking-wider block font-mono">
                  AI-Enabled SCM Platform
                </span>
              </div>
            )}
          </NavLink>
        </div>

        {/* ROLE-SCOPED NAVIGATION SECTIONS */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 font-sans text-xs">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              {!collapsed && (
                <div className="px-2 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#5A6561]">
                  {section.title}
                </div>
              )}

              {section.items.map((item, idx) => {
                const Icon = item.icon;

                // Handle AI modal action trigger
                if (item.action === 'ai') {
                  return (
                    <button
                      key={`action-${idx}`}
                      type="button"
                      onClick={() => {
                        setIsAiOpen(true);
                        if (window.innerWidth < 1024) onClose?.();
                      }}
                      className="w-full flex items-center gap-3 px-2.5 py-2 rounded-sm text-[#9EA8A4] hover:text-white hover:bg-[#151D1B] transition-colors group text-left"
                    >
                      <Icon className="w-4 h-4 shrink-0 text-[#22C55E] group-hover:text-white" />
                      {!collapsed && (
                        <span className="font-medium truncate text-white">
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
                    className={`flex items-center gap-3 px-2.5 py-2 rounded-sm transition-colors group ${
                      isActive
                        ? 'bg-[#14281E] text-white border border-[#22C55E]/60 shadow-xs font-semibold'
                        : 'text-[#9EA8A4] hover:text-white hover:bg-[#151D1B]'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-[#22C55E]'
                          : 'text-[#68716D] group-hover:text-white'
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
        <div className="p-2.5 border-t border-[#1E2825] space-y-2">
          {/* User Card */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center justify-between p-1.5 rounded-sm hover:bg-[#151D1B] transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-sm bg-[#142E20] border border-[#22C55E]/40 text-[#22C55E] flex items-center justify-center font-mono font-bold text-xs shrink-0">
                  {currentUser?.name?.slice(0, 2).toUpperCase() || 'AS'}
                </div>

                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white truncate">
                      {currentUser?.name || 'Authorized User'}
                    </div>
                    <div className="text-[10px] text-[#68716D] truncate">
                      {ROLE_LABELS?.[currentRole] || currentRole}
                    </div>
                  </div>
                )}
              </div>

              {!collapsed && (
                <ChevronDown className="w-3.5 h-3.5 text-[#68716D]" />
              )}
            </button>

            {/* Logout Dropdown */}
            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-1 p-1 rounded-sm bg-[#151D1B] border border-[#1E2825] shadow-xl text-xs font-mono">
                {currentRole !== ROLES.SUPPLIER && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAiOpen(true);
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xs text-[#9EA8A4] hover:text-white hover:bg-[#1E2825]"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#22C55E]" />
                    <span>Launch AI Copilot</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xs text-[#DC2626] hover:bg-[#1E2825]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>

          {/* Operational Status Indicator */}
          {!collapsed && (
            <div className="px-2 py-1 flex items-center gap-1.5 text-[10px] font-mono text-[#22C55E]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              <span>System Operational</span>
            </div>
          )}

          {/* Collapse Toggle */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full hidden lg:flex items-center gap-2 px-2 py-1 text-[11px] font-mono text-[#5A6561] hover:text-[#9EA8A4] transition-colors"
          >
            <ChevronLeft className={`w-3.5 h-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
