import React, { useEffect, useMemo, useState } from 'react';
import { authAPI, procurementAPI, supplierAPI } from '../services/api';
import { useAuth, ROLES, ROLE_LABELS } from '../context/AuthContext';
import { PaperSheet, SectionHeader } from '../components/layout/PaperSheet';
import {
  Building2,
  Edit3,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  UserX,
  X,
  PlusCircle,
  RefreshCw
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
      const [userRes, supRes, prodRes] = await Promise.all([
        authAPI.getUsers(),
        supplierAPI.getAll(),
        procurementAPI.getProducts()
      ]);
      setUsers(userRes.data.users || []);
      setSuppliers(supRes.data.suppliers || []);
      setProducts(prodRes.data.products || []);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Admin data could not be loaded.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openSupplierForm = (sup) => {
    setEditingSupplier(sup || null);
    setSupplierForm(sup ? {
      name: sup.name || '',
      companyName: sup.companyName || sup.name || '',
      email: sup.email || '',
      phone: sup.phone || '',
      address: sup.address || '',
      portalEmail: sup.userAccount?.email || '',
      portalPassword: ''
    } : emptySupplier);
    setSupplierModal(true);
  };

  const saveSupplier = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...supplierForm,
        portalPassword: supplierForm.portalPassword || (editingSupplier ? undefined : 'password123')
      };

      if (editingSupplier) await supplierAPI.update(editingSupplier._id, payload);
      else await supplierAPI.create(payload);

      showNotification(editingSupplier ? 'Supplier updated.' : 'Supplier added to Supplier Chain Matrix.', 'success');
      setSupplierModal(false);
      await loadData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Error saving supplier record.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleSupplierStatus = async (sup) => {
    const nextStatus = sup.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await supplierAPI.setStatus(sup._id, nextStatus);
      showNotification(`${sup.name} status updated to ${nextStatus}.`, 'success');
      await loadData();
    } catch (err) {
      showNotification('Error changing supplier status.', 'error');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      
      {/* HEADER SHEET */}
      <PaperSheet variant="default" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#166534] text-white font-mono font-bold text-xs">
                ADM
              </span>
              <h1 className="text-lg font-bold font-sans tracking-tight text-[#1A1F1D] dark:text-[#F2F4F3] uppercase">
                System Governance & Master Data Sheet
              </h1>
            </div>
            <p className="text-xs text-[#5D6560] dark:text-[#A3ACA8] mt-1">
              Maintain Supplier Chain Matrix, User Accounts, Role-Based Access Controls (RBAC), and Catalog SKUs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'suppliers' && (
              <button
                type="button"
                onClick={() => openSupplierForm(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#166534] text-white text-xs font-mono font-semibold hover:bg-[#15803D] transition-colors shadow-2xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Supplier</span>
              </button>
            )}
            <div className="inline-flex p-1 rounded-sm bg-[#F3F1E8] dark:bg-[#1E2423] border border-[#DDD9CF] dark:border-[#2B3533] text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveTab('suppliers')}
                className={`px-3 py-1.5 rounded-xs font-semibold transition-colors ${
                  activeTab === 'suppliers'
                    ? 'bg-[#FBFAF5] dark:bg-[#181D1C] text-[#166534] dark:text-[#15803D] shadow-2xs'
                    : 'text-[#5D6560] dark:text-[#A3ACA8]'
                }`}
              >
                Suppliers ({suppliers.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`px-3 py-1.5 rounded-xs font-semibold transition-colors ${
                  activeTab === 'users'
                    ? 'bg-[#FBFAF5] dark:bg-[#181D1C] text-[#166534] dark:text-[#15803D] shadow-2xs'
                    : 'text-[#5D6560] dark:text-[#A3ACA8]'
                }`}
              >
                Users ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className={`px-3 py-1.5 rounded-xs font-semibold transition-colors ${
                  activeTab === 'products'
                    ? 'bg-[#FBFAF5] dark:bg-[#181D1C] text-[#166534] dark:text-[#15803D] shadow-2xs'
                    : 'text-[#5D6560] dark:text-[#A3ACA8]'
                }`}
              >
                SKU Catalog ({products.length})
              </button>
            </div>
          </div>
        </div>
      </PaperSheet>

      {/* TAB 1: SUPPLIERS MATRIX */}
      {activeTab === 'suppliers' && (
        <PaperSheet variant="default" className="p-4 sm:p-6 space-y-4">
          <SectionHeader
            title="Supplier Chain Matrix"
            subtitle="Tier 1 verified logistics vendors, contract terms, and portal accounts"
            icon={Building2}
          />

          <div className="overflow-x-auto rounded-sm border border-[#DDD9CF] dark:border-[#2B3533]">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#DDD9CF] dark:border-[#2B3533] bg-[#F3F1E8] dark:bg-[#1E2423] text-[10px] uppercase text-[#8A908B] dark:text-[#707A76]">
                  <th className="p-2.5 font-semibold">Vendor Code</th>
                  <th className="p-2.5 font-semibold">Company Name</th>
                  <th className="p-2.5 font-semibold">Contact Email</th>
                  <th className="p-2.5 font-semibold">Performance Score</th>
                  <th className="p-2.5 font-semibold">Status</th>
                  <th className="p-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD9CF]/60 dark:divide-[#2B3533]/60 bg-[#FBFAF5] dark:bg-[#181D1C]">
                {suppliers.map((sup) => (
                  <tr key={sup._id} className="hover:bg-[#F3F1E8]/40 dark:hover:bg-[#1E2423]/40">
                    <td className="p-2.5 font-bold text-[#166534] dark:text-[#15803D]">
                      {sup.code || 'SUP-001'}
                    </td>
                    <td className="p-2.5 font-sans font-semibold text-[#1A1F1D] dark:text-[#F2F4F3]">
                      {sup.name || sup.companyName}
                    </td>
                    <td className="p-2.5 text-[#5D6560] dark:text-[#A3ACA8]">
                      {sup.email}
                    </td>
                    <td className="p-2.5">
                      <span className="text-[#166534] dark:text-[#15803D] font-bold">
                        {sup.rating || 4.8}★ (OTD: {sup.otd || 94}%)
                      </span>
                    </td>
                    <td className="p-2.5">
                      <button
                        type="button"
                        onClick={() => toggleSupplierStatus(sup)}
                        className={`px-2 py-0.5 rounded-xs text-[9px] font-bold ${
                          sup.status === 'ACTIVE'
                            ? 'bg-[#15803D]/15 text-[#15803D]'
                            : 'bg-[#DC2626]/15 text-[#DC2626]'
                        }`}
                      >
                        {sup.status || 'ACTIVE'}
                      </button>
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => openSupplierForm(sup)}
                        className="text-[#5D6560] hover:text-[#166534] p-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PaperSheet>
      )}

      {/* TAB 2: USERS & RBAC */}
      {activeTab === 'users' && (
        <PaperSheet variant="default" className="p-4 sm:p-6 space-y-4">
          <SectionHeader
            title="System User Directory & RBAC Roles"
            subtitle="Operator credentials and role permissions across Procurement, Warehouse, Finance, and Supplier portals"
            icon={Users}
          />

          <div className="overflow-x-auto rounded-sm border border-[#DDD9CF] dark:border-[#2B3533]">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#DDD9CF] dark:border-[#2B3533] bg-[#F3F1E8] dark:bg-[#1E2423] text-[10px] uppercase text-[#8A908B] dark:text-[#707A76]">
                  <th className="p-2.5 font-semibold">Operator Name</th>
                  <th className="p-2.5 font-semibold">Email</th>
                  <th className="p-2.5 font-semibold">RBAC Role</th>
                  <th className="p-2.5 font-semibold text-right">Access Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD9CF]/60 dark:divide-[#2B3533]/60 bg-[#FBFAF5] dark:bg-[#181D1C]">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-[#F3F1E8]/40 dark:hover:bg-[#1E2423]/40">
                    <td className="p-2.5 font-bold font-sans text-[#1A1F1D] dark:text-[#F2F4F3]">
                      {u.name}
                    </td>
                    <td className="p-2.5 text-[#5D6560] dark:text-[#A3ACA8]">
                      {u.email}
                    </td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded-xs text-[10px] bg-[#166534]/15 text-[#166534] dark:text-[#15803D] font-bold">
                        {ROLE_LABELS?.[u.role] || u.role}
                      </span>
                    </td>
                    <td className="p-2.5 text-right font-bold text-[#5D6560] dark:text-[#A3ACA8]">
                      {u.role === ROLES.ADMIN ? 'Full Governance' : 'Workspace Scope'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PaperSheet>
      )}

      {/* TAB 3: SKU CATALOG */}
      {activeTab === 'products' && (
        <PaperSheet variant="default" className="p-4 sm:p-6 space-y-4">
          <SectionHeader
            title="Standard Master SKU Catalog"
            subtitle="Procurement master parts and standard unit price references"
            icon={Package}
          />

          <div className="overflow-x-auto rounded-sm border border-[#DDD9CF] dark:border-[#2B3533]">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#DDD9CF] dark:border-[#2B3533] bg-[#F3F1E8] dark:bg-[#1E2423] text-[10px] uppercase text-[#8A908B] dark:text-[#707A76]">
                  <th className="p-2.5 font-semibold">SKU ID</th>
                  <th className="p-2.5 font-semibold">Product Name</th>
                  <th className="p-2.5 font-semibold">Category</th>
                  <th className="p-2.5 font-semibold text-right">Standard Unit Price (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD9CF]/60 dark:divide-[#2B3533]/60 bg-[#FBFAF5] dark:bg-[#181D1C]">
                {products.map((p) => (
                  <tr key={p._id} className="hover:bg-[#F3F1E8]/40 dark:hover:bg-[#1E2423]/40">
                    <td className="p-2.5 font-bold text-[#166534] dark:text-[#15803D]">
                      {p.sku || 'SKU-001'}
                    </td>
                    <td className="p-2.5 font-sans font-semibold text-[#1A1F1D] dark:text-[#F2F4F3]">
                      {p.name}
                    </td>
                    <td className="p-2.5 text-[#5D6560] dark:text-[#A3ACA8]">
                      {p.category || 'Industrial'}
                    </td>
                    <td className="p-2.5 text-right font-bold text-[#1A1F1D] dark:text-[#F2F4F3]">
                      ₹{Number(p.unitPrice || 1200).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PaperSheet>
      )}

      {/* ADD / EDIT SUPPLIER MODAL */}
      {supplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#FBFAF5] dark:bg-[#181D1C] border border-[#DDD9CF] dark:border-[#2B3533] p-5 rounded-sm shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-2 border-b border-[#DDD9CF] dark:border-[#2B3533]">
              <strong className="font-mono text-sm uppercase">
                {editingSupplier ? 'Edit Supplier Record' : 'Enroll New Vendor in Matrix'}
              </strong>
              <button
                type="button"
                onClick={() => setSupplierModal(false)}
                className="text-[#8A908B] hover:text-[#1A1F1D] dark:hover:text-[#F2F4F3]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={saveSupplier} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-[11px] font-semibold text-[#1A1F1D] dark:text-[#F2F4F3]">
                  Company / Supplier Name
                </label>
                <input
                  type="text"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  required
                  placeholder="e.g. Acme Steel Pvt Ltd"
                  className="w-full px-2.5 py-1.5 mt-1 rounded-sm bg-[#FBFAF5] dark:bg-[#181D1C] border border-[#DDD9CF] dark:border-[#2B3533] text-xs font-sans text-[#1A1F1D] dark:text-[#F2F4F3] focus:border-[#166534] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#1A1F1D] dark:text-[#F2F4F3]">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  required
                  placeholder="vendor@company.com"
                  className="w-full px-2.5 py-1.5 mt-1 rounded-sm bg-[#FBFAF5] dark:bg-[#181D1C] border border-[#DDD9CF] dark:border-[#2B3533] text-xs font-sans text-[#1A1F1D] dark:text-[#F2F4F3] focus:border-[#166534] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#1A1F1D] dark:text-[#F2F4F3]">
                  Phone / Dispatch Number
                </label>
                <input
                  type="text"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-2.5 py-1.5 mt-1 rounded-sm bg-[#FBFAF5] dark:bg-[#181D1C] border border-[#DDD9CF] dark:border-[#2B3533] text-xs font-mono text-[#1A1F1D] dark:text-[#F2F4F3] focus:border-[#166534] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#DDD9CF] dark:border-[#2B3533]">
                <button
                  type="button"
                  onClick={() => setSupplierModal(false)}
                  className="px-3 py-1.5 rounded-sm border border-[#DDD9CF] dark:border-[#2B3533] text-xs font-mono text-[#5D6560] dark:text-[#A3ACA8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded-sm bg-[#166534] text-white text-xs font-mono font-bold uppercase tracking-wider hover:bg-[#15803D]"
                >
                  {saving ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}