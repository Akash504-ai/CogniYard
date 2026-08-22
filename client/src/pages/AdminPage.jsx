import React, { useState, useEffect } from 'react';
import { authAPI, procurementAPI } from '../services/api';
import { useAuth, ROLES, ROLE_LABELS } from '../context/AuthContext';
import { ShieldCheck, Users, Boxes, UserX, UserCheck } from 'lucide-react';

export default function AdminPage() {
  const { showNotification } = useAuth();
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl transition-colors">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 tracking-tight">
          <ShieldCheck className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
          <span>System Administration & Role Management</span>
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Admin Control Center: Manage user roles, active accounts, and master catalog parameters.
        </p>
      </div>

      {/* Users & RBAC Role Management Table */}
      <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <span>User Accounts & RBAC Role Management ({users.length})</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-200 dark:border-zinc-800 font-medium">
              <tr>
                <th className="p-3.5">User</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5">Current Role</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Assign New Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-zinc-800 dark:text-zinc-300">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="p-3.5 font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200 text-xs">
                      {u.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span>{u.name}</span>
                  </td>
                  <td className="p-3.5 font-mono text-zinc-500 dark:text-zinc-400">{u.email}</td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <button
                      onClick={() => handleToggleStatus(u._id, u.isActive)}
                      className={`text-[10px] px-2 py-1 rounded font-medium flex items-center gap-1 border cursor-pointer ${
                        u.isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {u.isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                      <span>{u.isActive ? 'Active' : 'Disabled'}</span>
                    </button>
                  </td>
                  <td className="p-3.5 text-right">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u._id, e.target.value)}
                      className="bg-zinc-50 dark:bg-zinc-950 text-xs font-medium text-zinc-900 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-md p-1.5 focus:outline-none focus:border-zinc-500 cursor-pointer"
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
      <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <Boxes className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <span>Product Master Catalog ({products.length})</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-200 dark:border-zinc-800 font-medium">
              <tr>
                <th className="p-3.5">SKU</th>
                <th className="p-3.5">Product Name</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Default Price ($)</th>
                <th className="p-3.5">Current Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-zinc-800 dark:text-zinc-300">
              {products.map((p) => (
                <tr key={p._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="p-3.5 font-mono font-semibold text-zinc-900 dark:text-zinc-100">{p.sku}</td>
                  <td className="p-3.5 font-medium text-zinc-900 dark:text-zinc-200">{p.name}</td>
                  <td className="p-3.5 text-zinc-500">{p.category}</td>
                  <td className="p-3.5 font-bold text-zinc-900 dark:text-zinc-100">${p.defaultPrice}</td>
                  <td className="p-3.5 font-medium text-zinc-800 dark:text-zinc-300">{p.currentStock} {p.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
