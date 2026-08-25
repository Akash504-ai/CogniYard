import React, { useEffect, useMemo, useState } from 'react';
import { authAPI, procurementAPI, supplierAPI } from '../services/api';
import { useAuth, ROLES, ROLE_LABELS } from '../context/AuthContext';
import {
  Building2, Edit3, Package, Plus, Search, ShieldCheck, Trash2,
  UserCheck, Users, UserX, X
} from 'lucide-react';

const emptySupplier = {
  name: '', companyName: '', phone: '', email: '', address: '', portalEmail: '', portalPassword: 'password123'
};

export default function AdminPage() {
  const { showNotification } = useAuth();
  const [activeTab, setActiveTab] = useState('suppliers');
  const [users, setUsers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supplierModal, setSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierForm, setSupplierForm] = useState(emptySupplier);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userResponse, supplierResponse, productResponse] = await Promise.all([
        authAPI.getUsers(), supplierAPI.getAll(), procurementAPI.getProducts()
      ]);
      setUsers(userResponse.data.users || []);
      setSuppliers(supplierResponse.data.suppliers || []);
      setProducts(productResponse.data.products || []);
    } catch (error) {
      showNotification(error.response?.data?.message || 'Admin data could not be loaded.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (activeTab === 'users') return users.filter(user => `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(query));
    if (activeTab === 'products') return products.filter(product => `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(query));
    return suppliers.filter(supplier => `${supplier.code} ${supplier.name} ${supplier.companyName} ${supplier.email}`.toLowerCase().includes(query));
  }, [activeTab, products, search, suppliers, users]);

  const openSupplierForm = supplier => {
    setEditingSupplier(supplier || null);
    setSupplierForm(supplier ? {
      ...emptySupplier,
      name: supplier.name || '',
      companyName: supplier.companyName || supplier.name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      portalEmail: supplier.userAccount?.email || '',
      portalPassword: '' // Blank when editing existing supplier unless explicitly updated
    } : emptySupplier);
    setSupplierModal(true);
  };

  const saveSupplier = async event => {
    event.preventDefault();
    try {
      setSaving(true);
      // Ensure default password fallback if creation field is cleared
      const payload = {
        ...supplierForm,
        portalPassword: supplierForm.portalPassword || (editingSupplier ? undefined : 'password123')
      };

      if (editingSupplier) await supplierAPI.update(editingSupplier._id, payload);
      else await supplierAPI.create(payload);

      showNotification(editingSupplier ? 'Supplier updated.' : 'Supplier created and added to the Supplier Chain Matrix.', 'success');
      setSupplierModal(false);
      await loadData();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Supplier could not be saved.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const setSupplierStatus = async supplier => {
    const nextStatus = supplier.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await supplierAPI.setStatus(supplier._id, nextStatus);
      showNotification(`${supplier.name} is now ${nextStatus}.`, 'success');
      await loadData();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Supplier status could not be changed.', 'error');
    }
  };

  const deleteSupplier = async supplier => {
    if (!window.confirm(`Delete ${supplier.name}? Suppliers with Purchase Orders cannot be deleted.`)) return;
    try {
      await supplierAPI.remove(supplier._id);
      showNotification('Supplier deleted.', 'success');
      await loadData();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Supplier could not be deleted.', 'error');
    }
  };

  const changeRole = async (user, role) => {
    try {
      await authAPI.updateUserRole(user._id, role);
      showNotification(`Role changed to ${ROLE_LABELS[role]}.`, 'success');
      await loadData();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Role could not be changed.', 'error');
    }
  };

  const toggleUser = async user => {
    try {
      await authAPI.toggleUserStatus(user._id, !user.isActive);
      showNotification('Account status updated.', 'success');
      await loadData();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Account status could not be changed.', 'error');
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto min-h-screen">
      <section className="rounded-2xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></span>
            <div><h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Step 1: Add and Manage Suppliers</h1><p className="text-xs text-zinc-500 mt-1">Create the supplier and its login here. It then appears automatically in Procurement.</p></div>
          </div>
          {activeTab === 'suppliers' && <button onClick={() => openSupplierForm()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm"><Plus className="w-4 h-4" /> Add supplier</button>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800">
          {[['Users', users.length], ['Active suppliers', suppliers.filter(item => item.status === 'ACTIVE').length], ['Supplier portals', suppliers.filter(item => item.userAccount).length], ['Catalog items', products.length]].map(([label, value]) => <div key={label} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800"><span className="text-[10px] uppercase tracking-wider text-zinc-400">{label}</span><div className="font-mono font-bold text-zinc-900 dark:text-zinc-100 mt-1">{value}</div></div>)}
        </div>
      </section>

      <section className="rounded-2xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden shadow-sm">
        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex gap-1 rounded-xl bg-zinc-100 dark:bg-zinc-950 p-1">
            {[['suppliers', Building2, '1. Suppliers'], ['users', Users, '2. User Access'], ['products', Package, '3. Products']].map(([id, Icon, label]) => <button key={id} onClick={() => { setActiveTab(id); setSearch(''); }} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${activeTab === id ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'}`}><Icon className="w-3.5 h-3.5" />{label}</button>)}
          </div>
          <label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search records…" className="w-64 pl-8 pr-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs outline-none focus:ring-1 focus:ring-purple-500" /></label>
        </div>

        {loading ? <div className="p-12 text-center text-xs text-zinc-400">Loading persisted records…</div> : (
          <div className="overflow-x-auto">
            {activeTab === 'suppliers' && <table className="w-full text-left text-xs"><thead className="bg-zinc-50 dark:bg-zinc-950 text-[10px] uppercase tracking-wider text-zinc-500"><tr><th className="p-4">Supplier</th><th className="p-4">Business Contact</th><th className="p-4">Supplier Login</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">{filteredRecords.map(supplier => <tr key={supplier._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30"><td className="p-4"><div className="font-bold text-zinc-900 dark:text-zinc-100">{supplier.companyName || supplier.name}</div><div className="font-mono text-[10px] text-purple-600">{supplier.code}</div></td><td className="p-4"><div>{supplier.email}</div><div className="text-[10px] text-zinc-400">{supplier.phone}</div></td><td className="p-4">{supplier.userAccount ? <span className="text-emerald-600">{supplier.userAccount.email}</span> : <span className="text-zinc-400">Not created</span>}</td><td className="p-4"><button onClick={() => setSupplierStatus(supplier)} className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${supplier.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200'}`}>{supplier.status}</button></td><td className="p-4"><div className="flex justify-end gap-2"><button onClick={() => openSupplierForm(supplier)} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700"><Edit3 className="w-3.5 h-3.5" /></button><button onClick={() => deleteSupplier(supplier)} className="p-2 rounded-lg border border-rose-200 text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button></div></td></tr>)}{filteredRecords.length === 0 && <tr><td colSpan="5" className="p-10 text-center text-zinc-400">No suppliers found.</td></tr>}</tbody></table>}

            {activeTab === 'users' && <table className="w-full text-left text-xs"><thead className="bg-zinc-50 dark:bg-zinc-950 text-[10px] uppercase tracking-wider text-zinc-500"><tr><th className="p-4">User</th><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4 text-right">Status</th></tr></thead><tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">{filteredRecords.map(user => <tr key={user._id}><td className="p-4 font-bold text-zinc-900 dark:text-zinc-100">{user.name}</td><td className="p-4 font-mono text-[11px]">{user.email}</td><td className="p-4">{user.role === ROLES.SUPPLIER ? <span className="px-2 py-1 rounded-lg bg-violet-50 text-violet-700">Supplier Portal</span> : <select value={user.role} onChange={event => changeRole(user, event.target.value)} className="rounded-lg px-2 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"><option value={ROLES.PROCUREMENT}>Procurement Manager</option><option value={ROLES.WAREHOUSE}>Warehouse Manager</option><option value={ROLES.FINANCE}>Finance User</option><option value={ROLES.ADMIN}>Admin</option></select>}</td><td className="p-4 text-right"><button onClick={() => toggleUser(user)} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${user.isActive ? 'text-emerald-600 border-emerald-200' : 'text-rose-600 border-rose-200'}`}>{user.isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}{user.isActive ? 'Active' : 'Disabled'}</button></td></tr>)}</tbody></table>}

            {activeTab === 'products' && <table className="w-full text-left text-xs"><thead className="bg-zinc-50 dark:bg-zinc-950 text-[10px] uppercase tracking-wider text-zinc-500"><tr><th className="p-4">SKU</th><th className="p-4">Product</th><th className="p-4">Category</th><th className="p-4">Reference Price</th><th className="p-4">Stock</th></tr></thead><tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">{filteredRecords.map(product => <tr key={product._id}><td className="p-4 font-mono font-bold">{product.sku}</td><td className="p-4 font-semibold">{product.name}</td><td className="p-4">{product.category}</td><td className="p-4 font-mono">₹{Number(product.defaultPrice || 0).toLocaleString('en-IN')}</td><td className="p-4 font-mono">{Number(product.currentStock || 0).toLocaleString('en-IN')} {product.unit}</td></tr>)}</tbody></table>}
          </div>
        )}
      </section>

      {supplierModal && <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4"><form onSubmit={saveSupplier} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4"><div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800"><div><h2 className="font-bold text-zinc-900 dark:text-zinc-100">{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h2><p className="text-[11px] text-zinc-400 mt-1">This record feeds the Procurement Supplier Chain Matrix automatically.</p></div><button type="button" onClick={() => setSupplierModal(false)}><X className="w-5 h-5 text-zinc-400" /></button></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[
        ['name', 'Supplier name', true], ['companyName', 'Company name', true], ['phone', 'Phone number', true], ['email', 'Business email', true], ['portalEmail', 'Supplier login email', true], ['portalPassword', editingSupplier ? 'New login password (optional)' : 'Supplier login password (default: password123)', false]
      ].map(([key, label, required]) => <label key={key} className="space-y-1.5"><span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">{label}</span><input type={key === 'portalPassword' ? 'password' : key === 'email' || key === 'portalEmail' ? 'email' : key === 'phone' ? 'tel' : 'text'} value={supplierForm[key]} onChange={event => setSupplierForm(current => ({ ...current, [key]: event.target.value }))} required={required} className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2.5 text-xs outline-none focus:ring-1 focus:ring-purple-500" /></label>)}</div><label className="block space-y-1.5"><span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">Address</span><textarea value={supplierForm.address} onChange={event => setSupplierForm(current => ({ ...current, address: event.target.value }))} rows="2" required className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2.5 text-xs outline-none focus:ring-1 focus:ring-purple-500" /></label><div className="flex justify-end gap-2 pt-3"><button type="button" onClick={() => setSupplierModal(false)} className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold">Cancel</button><button disabled={saving} className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold disabled:opacity-50">{saving ? 'Saving…' : editingSupplier ? 'Save changes' : 'Create supplier'}</button></div></form></div>}
    </div>
  );
}