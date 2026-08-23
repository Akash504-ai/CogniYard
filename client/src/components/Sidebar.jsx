import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Truck, 
  Receipt, 
  Bot, 
  ShieldCheck, 
  ShieldAlert,
  Boxes,
  Sparkles,
  ChevronRight,
  CircleDot,
  Calculator,
  Camera
} from 'lucide-react';

export default function Sidebar() {
  const { currentUser, setIsAiOpen } = useAuth();
  const role = currentUser?.role;

  const allNavItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: [ROLES.PROCUREMENT, ROLES.WAREHOUSE, ROLES.FINANCE, ROLES.ADMIN] },
    { path: '/control-tower', label: 'Control Tower', icon: Sparkles, roles: [ROLES.ADMIN] },
    { path: '/exceptions', label: 'Exception Center', icon: ShieldAlert, roles: [ROLES.PROCUREMENT, ROLES.WAREHOUSE, ROLES.FINANCE, ROLES.ADMIN] },
    { path: '/inventory-planning', label: 'Inventory Intelligence', icon: Calculator, roles: [ROLES.PROCUREMENT, ROLES.WAREHOUSE, ROLES.FINANCE, ROLES.ADMIN] },
    { path: '/vision', label: 'Smart CCTV', icon: Camera, roles: [ROLES.PROCUREMENT, ROLES.WAREHOUSE, ROLES.FINANCE, ROLES.ADMIN] },
    { path: '/procurement', label: 'Procurement', icon: ShoppingCart, roles: [ROLES.PROCUREMENT, ROLES.ADMIN] },
    { path: '/logistics', label: 'Logistics & Yard', icon: Truck, roles: [ROLES.WAREHOUSE, ROLES.ADMIN] },
    { path: '/finance', label: 'Finance (3-Way)', icon: Receipt, roles: [ROLES.FINANCE, ROLES.ADMIN] },
    { path: '/admin', label: 'Admin & System', icon: ShieldCheck, roles: [ROLES.ADMIN] }
  ];

  const visibleNavItems = allNavItems.filter(item => item.roles.includes(role));

  return (
    <aside className="w-64 bg-zinc-50/50 dark:bg-zinc-950/70 backdrop-blur-xl border-r border-zinc-200/80 dark:border-zinc-800/80 flex flex-col h-screen sticky top-0 z-30 select-none transition-colors">
      
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
            <Boxes className="w-4.5 h-4.5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 tracking-tight">
                CogniYard
              </h1>
              <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                MVP
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
              Autonomous Supply Chain
            </p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto scrollbar-none">
        
        {/* Core Navigation Items */}
        <div className="space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Main Operations
          </div>

          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs border border-zinc-200/80 dark:border-zinc-800'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/70 dark:hover:bg-zinc-900/50 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Intelligence / Automation Suite */}
        <div className="space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Intelligence
          </div>
          
          <button
            onClick={() => setIsAiOpen(true)}
            className="w-full group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium bg-gradient-to-r from-indigo-500/5 via-indigo-500/10 to-purple-500/5 dark:from-indigo-950/30 dark:via-indigo-950/50 dark:to-purple-950/20 hover:from-indigo-500/10 hover:to-purple-500/10 text-zinc-800 dark:text-zinc-200 border border-indigo-200/40 dark:border-indigo-800/40 transition-all cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">Grok Copilot</span>
            </div>

            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500 dark:text-indigo-400 transition-transform group-hover:rotate-12" />
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>
      </nav>

      {/* Workspace Footer Hub */}
      <div className="p-3 m-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold tracking-wide uppercase text-zinc-400 dark:text-zinc-500">
            Cluster Hub
          </span>
          <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-600 dark:text-emerald-400">
            <CircleDot className="w-2.5 h-2.5 animate-pulse" />
            Online
          </span>
        </div>
        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
          Cognizant NPN_SCM
        </p>
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 leading-tight">
          Yard Tracking & PR2 Autonomous P2P Engine
        </p>
      </div>

    </aside>
  );
}