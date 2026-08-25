import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext';
import { RELEASE_LABEL } from '../config/release';
import {
  Bot,
  Boxes,
  Calculator,
  Camera,
  ClipboardList,
  CreditCard,
  FileUp,
  LayoutDashboard,
  Route,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Truck,
  X
} from 'lucide-react';

const coreItems = [
  { path: '/', label: 'Home Dashboard', icon: LayoutDashboard, roles: [ROLES.PROCUREMENT, ROLES.WAREHOUSE, ROLES.FINANCE, ROLES.ADMIN] },
  { path: '/admin', label: 'Add Suppliers & Users', icon: ShieldCheck, roles: [ROLES.ADMIN] },
  { path: '/procurement', label: 'Create Purchase Order', icon: ClipboardList, roles: [ROLES.PROCUREMENT, ROLES.ADMIN] },
  { path: '/logistics', label: 'Receive Goods & GRN', icon: Truck, roles: [ROLES.WAREHOUSE, ROLES.ADMIN] },
  { path: '/yard-simulation', label: 'Intelligent Truck Simulation', icon: Route, roles: [ROLES.WAREHOUSE, ROLES.ADMIN] },
  { path: '/supplier', label: 'Upload Invoice', icon: FileUp, roles: [ROLES.SUPPLIER] },
  { path: '/finance', label: 'Match & Pay Invoice', icon: CreditCard, roles: [ROLES.FINANCE, ROLES.ADMIN] }
];

const optionalItems = [
  { path: '/control-tower', label: 'Control Tower', icon: Sparkles, roles: [ROLES.ADMIN] },
  { path: '/exceptions', label: 'Exceptions', icon: ShieldAlert, roles: [ROLES.ADMIN] },
  { path: '/inventory-planning', label: 'Inventory Planning', icon: Calculator, roles: [ROLES.ADMIN] },
  { path: '/vision', label: 'Smart CCTV Demo', icon: Camera, roles: [ROLES.ADMIN] }
];

function SimpleLink({ item, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      onClick={onNavigate}
      className={({ isActive }) => `group flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 ${
        isActive
          ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">{item.label}</span>
    </NavLink>
  );
}

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const { currentUser, setIsAiOpen } = useAuth();
  const role = currentUser?.role;
  const visibleCore = coreItems.filter(item => item.roles.includes(role));
  const visibleOptional = optionalItems.filter(item => item.roles.includes(role));
  const canUseAi = [ROLES.ADMIN, ROLES.PROCUREMENT].includes(role);

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/35 lg:hidden"
          aria-label="Close navigation"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-zinc-200 bg-white text-left transition-transform duration-200 dark:border-zinc-800 dark:bg-zinc-950 lg:sticky lg:top-0 lg:z-30 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Primary navigation"
      >
        <div className="flex min-h-16 items-center gap-3 border-b border-zinc-200 px-4 dark:border-zinc-800">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-white">
            <Boxes className="h-4.5 w-4.5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">CogniYard</h1>
            <p className="truncate text-[11px] text-zinc-500">Supply Chain Workspace</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-100 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Workspace</p>
          <div className="space-y-1">
            {visibleCore.map(item => <SimpleLink key={item.path} item={item} onNavigate={onClose} />)}
          </div>

          {canUseAi && (
            <div className="my-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setIsAiOpen(true);
                  onClose();
                }}
                className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              >
                <Bot className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                <span>Ask AI for help</span>
              </button>
            </div>
          )}

          {visibleOptional.length > 0 && (
            <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Administration</p>
              <div className="space-y-1">
                {visibleOptional.map(item => <SimpleLink key={item.path} item={item} onNavigate={onClose} />)}
              </div>
            </div>
          )}
        </nav>

        <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">{RELEASE_LABEL}</p>
        </div>
      </aside>
    </>
  );
}
