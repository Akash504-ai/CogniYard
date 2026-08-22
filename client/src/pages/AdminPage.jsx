import React, { useState, useEffect } from 'react';
import { authAPI, procurementAPI } from '../services/api';
import { useAuth, ROLES, ROLE_LABELS } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Users, 
  Boxes, 
  UserX, 
  UserCheck, 
  Sparkles,
  Search,
  KeyRound,
  Layers,
  CheckCircle2,
  Tag,
  DollarSign
} from 'lucide-react';

export default function AdminPage() {
  const { showNotification, setIsAiOpen } = useAuth();
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [uRes, pRes] = await Promise.all([
        authAPI.getUsers(),
        procurementAPI.getProducts()
      ]);
      setUsers(uRes.data.users || []);
      setProducts(pRes.data.products || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await authAPI.updateUserRole(userId, newRole);
      showNotification(`User role updated to ${ROLE_LABELS[newRole]}!`, 'success');
      fetchAdminData();
    } catch (err) {
      showNotification('Failed to update user role', 'warning');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await authAPI.toggleUserStatus(userId, !currentStatus);
      showNotification(`User account status updated!`, 'info');
      fetchAdminData();
    } catch (err) {
      showNotification('Failed to update user status', 'warning');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  const activeUsersCount = users.filter(u => u.isActive).length;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto min-h-screen">
      
      {/* Top Banner & Action Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                System Administration & Access Governance
              </h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
              Global RBAC privilege matrix, zero-trust account security policies, and enterprise master product catalog synchronization.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAiOpen(true)}
              className="group flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 border border-zinc-200 dark:border-zinc-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-500 group-hover:rotate-12 transition-transform" />
              <span>Admin Copilot</span>
            </button>
          </div>
        </div>

        {/* Operational Overview Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/60 p-3 rounded-xl">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Total Users</span>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-0.5">{users.length} Profiles</div>
          </div>
          <div className="bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/60 p-3 rounded-xl">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Active Accounts</span>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{activeUsersCount} Enabled</div>
          </div>
          <div className="bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/60 p-3 rounded-xl">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Catalog Items</span>
            <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">{products.length} SKUs</div>
          </div>
          <div className="bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/60 p-3 rounded-xl">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Security Protocol</span>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-0.5">RBAC Strict</div>
          </div>
        </div>
      </div>

      {/* Users & RBAC Role Management Table */}
      <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm space-y-2">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              User Accounts & Role Permissions ({filteredUsers.length})
            </h3>
          </div>
          
          {/* Search User Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all w-60"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-zinc-500 dark:text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-200/80 dark:border-zinc-800/80 font-medium">
              <tr>
                <th className="py-3.5 px-4 font-semibold">User Identity</th>
                <th className="py-3.5 px-4 font-semibold">Email Address</th>
                <th className="py-3.5 px-4 font-semibold">Assigned Role</th>
                <th className="py-3.5 px-4 font-semibold">Account State</th>
                <th className="py-3.5 px-4 font-semibold text-right">Modify Permission Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-300">
              {filteredUsers.map((u) => (
                <tr key={u._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs tracking-wider">
                        {getInitials(u.name)}
                      </div>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{u.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-zinc-500 dark:text-zinc-400 text-[11px]">{u.email}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 font-mono">
                      <KeyRound className="w-2.5 h-2.5 text-zinc-400" />
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => handleToggleStatus(u._id, u.isActive)}
                      className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                        u.isActive 
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60 hover:bg-emerald-100' 
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/60 hover:bg-rose-100'
                      }`}
                    >
                      {u.isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                      <span>{u.isActive ? 'Active' : 'Disabled'}</span>
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u._id, e.target.value)}
                      className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                    >
                      <option value={ROLES.PROCUREMENT}>Procurement Manager</option>
                      <option value={ROLES.WAREHOUSE}>Warehouse & Dock Manager</option>
                      <option value={ROLES.FINANCE}>Finance & AP User</option>
                      <option value={ROLES.ADMIN}>System Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Products Master Catalog */}
      <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm space-y-2">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Master Product Catalog ({filteredProducts.length})
            </h3>
          </div>

          {/* Search Product Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search SKU or product..."
              className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all w-60"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-zinc-500 dark:text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-200/80 dark:border-zinc-800/80 font-medium">
              <tr>
                <th className="py-3.5 px-4 font-semibold">SKU Identifier</th>
                <th className="py-3.5 px-4 font-semibold">Product Description</th>
                <th className="py-3.5 px-4 font-semibold">Category Classification</th>
                <th className="py-3.5 px-4 font-semibold">Default Unit Price</th>
                <th className="py-3.5 px-4 font-semibold">Live System Inventory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-300">
              {filteredProducts.map((p) => (
                <tr key={p._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">{p.sku}</td>
                  <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-200">{p.name}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                      <Tag className="w-2.5 h-2.5" />
                      {p.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold font-mono text-zinc-900 dark:text-zinc-100">${p.defaultPrice}</td>
                  <td className="py-3.5 px-4 font-mono font-medium text-zinc-800 dark:text-zinc-300">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{p.currentStock.toLocaleString()}</span> {p.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}