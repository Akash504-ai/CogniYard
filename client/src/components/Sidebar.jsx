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
  ChevronRight,
  Boxes,
  Zap
} from 'lucide-react';

export default function Sidebar() {
  const { currentUser, setIsAiOpen } = useAuth();
  const role = currentUser?.role;

  const allNavItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: [ROLES.PROCUREMENT, ROLES.WAREHOUSE, ROLES.FINANCE, ROLES.ADMIN] },
    { path: '/procurement', label: 'Procurement', icon: ShoppingCart, roles: [ROLES.PROCUREMENT, ROLES.ADMIN] },
    { path: '/logistics', label: 'Logistics & Yard', icon: Truck, roles: [ROLES.WAREHOUSE, ROLES.ADMIN] },
    { path: '/finance', label: 'Finance (3-Way)', icon: Receipt, roles: [ROLES.FINANCE, ROLES.ADMIN] },
    { path: '/admin', label: 'Admin & System', icon: ShieldCheck, roles: [ROLES.ADMIN] }
  ];

  const visibleNavItems = allNavItems.filter(item => item.roles.includes(role));

  return (
    <aside className="w-60 bg-white dark:bg-black border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-screen sticky top-0 z-30 select-none transition-colors">
      {/* Brand Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-md bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-zinc-100 dark:text-zinc-950 font-bold">
          <Boxes className="w-4 h-4" />
        </div>
        <div>
          <h1 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-1.5">
            CogniYard
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono border border-zinc-200 dark:border-zinc-700">MVP</span>
          </h1>
          <p className="text-[10px] text-zinc-500 font-medium">Enterprise Supply Chain</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto">
        <div className="px-2.5 pb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Navigation
        </div>

        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold border-r-2 border-zinc-900 dark:border-zinc-400'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                <span>{item.label}</span>
              </div>
              <ChevronRight className="w-3 h-3 text-zinc-400 dark:text-zinc-600 opacity-60" />
            </NavLink>
          );
        })}

        {/* AI Assistant Quick Launcher */}
        <div className="pt-4">
          <div className="px-2.5 pb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Automations
          </div>
          <button
            onClick={() => setIsAiOpen(true)}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-900/80 hover:bg-zinc-200 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Bot className="w-4 h-4 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors" />
              <span>AI Assistant</span>
            </div>
            <Zap className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
          </button>
        </div>
      </nav>

      {/* Platform Footer Banner */}
      <div className="p-3 m-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-[11px]">
        <div className="font-semibold text-zinc-800 dark:text-zinc-300 mb-0.5">Cognizant NPN_SCM</div>
        <p className="text-zinc-500 text-[10px]">
          E2 Yard Tracker + PR2 Autonomous P2P.
        </p>
      </div>
    </aside>
  );
}
