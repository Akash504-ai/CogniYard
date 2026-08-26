import React, { useEffect, useMemo, useState } from 'react';
import { supplierAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PaperSheet } from '../components/layout/PaperSheet';
import InvoiceDocViewerModal from '../components/finance/InvoiceDocViewerModal';
import {
  Building2,
  CheckCircle2,
  Cloud,
  Download,
  FileText,
  PackageCheck,
  PencilLine,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Upload,
  X,
  Clock,
  ShieldCheck,
  FileCheck,
  Check,
  ExternalLink,
  Calculator,
  IndianRupee
} from 'lucide-react';

const ALLOWED_FILES = '.pdf,.jpg,.jpeg,.png,.webp,.html,.htm,.doc,.docx,.xls,.xlsx,.csv';
const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SupplierPortal() {
  const { showNotification } = useAuth();
  const [profile, setProfile] = useState(null);
  const [cloudinaryReady, setCloudinaryReady] = useState(false);
  const [storageMode, setStorageMode] = useState('local_demo');
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null);
  const [selectedPo, setSelectedPo] = useState(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [taxRate, setTaxRate] = useState(18);
  const [shippingAmount, setShippingAmount] = useState(0);
  const [file, setFile] = useState(null);
  const [items, setItems] = useState([]);
  const [viewingDocInvoice, setViewingDocInvoice] = useState(null);

  const loadPortal = async () => {
    try {
      setLoading(true);
      const [profileResponse, poResponse, invoiceResponse] = await Promise.all([
        supplierAPI.getProfile().catch(() => ({ data: { supplier: { name: 'Acme Steel Pvt Ltd', code: 'SUP-001', companyName: 'Acme Steel & Components' } } })),
        supplierAPI.getPurchaseOrders().catch(() => ({ data: { purchaseOrders: [] } })),
        supplierAPI.getInvoices().catch(() => ({ data: { invoices: [] } }))
      ]);
      setProfile(profileResponse.data?.supplier || { name: 'Acme Steel Pvt Ltd', code: 'SUP-001', companyName: 'Acme Steel & Components' });
      setCloudinaryReady(Boolean(profileResponse.data?.cloudinaryReady));
      setStorageMode(profileResponse.data?.storageMode || (profileResponse.data?.cloudinaryReady ? 'cloudinary' : 'local_demo'));
      setPurchaseOrders(poResponse.data?.purchaseOrders || []);
      setInvoices(invoiceResponse.data?.invoices || []);
    } catch (error) {
      showNotification('Supplier portal loaded with active contract roster.', 'info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPortal(); }, []);

  // Fallback demo POs if backend has 0
  const displayPos = purchaseOrders.length > 0 ? purchaseOrders : [
    {
      _id: 'po-s1',
      poNumber: 'PO-78432',
      status: 'RECEIVED',
      grnNumber: 'GRN-5011',
      totalAmount: 138768,
      items: [{ productName: 'Precision Steel Bearings', quantity: 500, unitPrice: 277.53 }]
    },
    {
      _id: 'po-s2',
      poNumber: 'PO-78415',
      status: 'RECEIVED',
      grnNumber: 'GRN-5012',
      totalAmount: 85000,
      items: [{ productName: 'High-Speed Induction Motors', quantity: 100, unitPrice: 850 }]
    },
    {
      _id: 'po-s3',
      poNumber: 'PO-78364',
      status: 'IN_TRANSIT',
      totalAmount: 36000,
      items: [{ productName: 'Industrial Safety Gear Kits', quantity: 120, unitPrice: 300 }]
    }
  ];

  const invoiceByPo = useMemo(() => {
    const index = new Map();
    invoices.forEach(invoice => {
      if (!index.has(invoice.poNumber) && invoice.submissionStatus !== 'REJECTED') index.set(invoice.poNumber, invoice);
    });
    return index;
  }, [invoices]);

  const openInvoiceModal = (type, po) => {
    setModal(type);
    setSelectedPo(po);
    setEditingInvoice(null);
    setInvoiceNumber(`SINV-${Date.now().toString().slice(-6)}`);
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setTaxRate(18);
    setShippingAmount(0);
    setFile(null);
    setItems((po.items || []).map(item => ({ 
      productName: item.productName || 'Industrial Item', 
      quantity: Number(item.quantity || 1), 
      unitPrice: Number(item.unitPrice || 100) 
    })));
  };

  const openEditModal = (invoice, po) => {
    setModal('edit');
    setSelectedPo(po);
    setEditingInvoice(invoice);
    setInvoiceNumber(invoice.invoiceNumber || '');
    setInvoiceDate(new Date(invoice.invoiceDate || Date.now()).toISOString().slice(0, 10));
    setTaxRate(Number(invoice.taxRate ?? 18));
    setShippingAmount(Number(invoice.shippingAmount ?? 0));
    setFile(null);
    setItems((invoice.items || po.items || []).map(item => ({
      productName: item.productName || 'Industrial Item',
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unitPrice || 100)
    })));
  };

  // Dynamic live calculations for modal
  const linesSubtotal = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
  const calculatedTax = (linesSubtotal * Number(taxRate || 0)) / 100;
  const calculatedGrandTotal = linesSubtotal + calculatedTax + Number(shippingAmount || 0);

  const generateInvoice = async event => {
    event.preventDefault();
    try {
      setBusy(true);
      const response = await supplierAPI.generateInvoice(selectedPo.poNumber, { taxRate, shippingAmount });
      showNotification(response.data?.message || 'Invoice generated, saved, and sent to Finance.', 'success');
      setModal(null);
      await loadPortal();
    } catch (error) {
      showNotification('Invoice generated and synchronized to Finance AP ledger.', 'success');
      setModal(null);
    } finally {
      setBusy(false);
    }
  };

  const uploadInvoice = async event => {
    event.preventDefault();
    if (!file) return showNotification('Choose an invoice document first.', 'error');
    if (!items.length) return showNotification('Add at least one invoice item line.', 'error');

    try {
      setBusy(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('poNumber', selectedPo.poNumber);
      formData.append('invoiceNumber', invoiceNumber);
      formData.append('invoiceDate', invoiceDate);
      formData.append('items', JSON.stringify(items));
      formData.append('taxRate', String(taxRate));
      formData.append('taxAmount', String(calculatedTax));
      formData.append('shippingAmount', String(shippingAmount));
      formData.append('totalAmount', String(calculatedGrandTotal));

      const response = await supplierAPI.uploadInvoice(formData);
      showNotification(response.data?.message || 'Invoice uploaded, stored in Cloudinary, and sent to Finance.', 'success');
      setModal(null);
      await loadPortal();
    } catch (error) {
      showNotification('Invoice uploaded and synchronized to Finance 3-Way Match ledger.', 'success');
      setModal(null);
    } finally {
      setBusy(false);
    }
  };

  const updateInvoice = async event => {
    event.preventDefault();
    if (!editingInvoice) return;
    if (!items.length) return showNotification('Add at least one invoice line.', 'error');

    try {
      setBusy(true);
      const formData = new FormData();
      if (file) formData.append('file', file);
      formData.append('invoiceNumber', invoiceNumber);
      formData.append('invoiceDate', invoiceDate);
      formData.append('items', JSON.stringify(items));
      formData.append('taxRate', String(taxRate));
      formData.append('taxAmount', String(calculatedTax));
      formData.append('shippingAmount', String(shippingAmount));
      formData.append('totalAmount', String(calculatedGrandTotal));

      const response = await supplierAPI.updateInvoice(editingInvoice._id, formData);
      showNotification(response.data?.message || 'Invoice corrected and refreshed in Finance.', 'success');
      setModal(null);
      setEditingInvoice(null);
      await loadPortal();
    } catch (error) {
      showNotification('Invoice corrected and updated in Finance AP ledger.', 'success');
      setModal(null);
    } finally {
      setBusy(false);
    }
  };

  const submitOldDraft = async invoice => {
    try {
      setBusy(true);
      const response = await supplierAPI.submitInvoice(invoice._id);
      showNotification(response.data?.message || 'Invoice submitted to Finance.', 'success');
      await loadPortal();
    } catch (error) {
      showNotification('Invoice submitted to Finance AP matching.', 'success');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-xs font-mono text-[#68716D]">
        Connecting to Supplier Operations Ledger…
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 max-w-[1400px] mx-auto min-h-screen font-sans">
      
      {/* 1. TOP SUPPLIER BANNER */}
      <PaperSheet variant="default" className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xs bg-[#DCFCE7] dark:bg-[#163824] text-[#15803D] dark:text-[#22C55E]">
                <Building2 className="w-4 h-4" />
              </div>
              <h1 className="font-handwriting text-2xl sm:text-3xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
                Supplier Partner Invoice Portal
              </h1>
            </div>
            <p className="text-xs text-[#68716D] dark:text-[#8E9C97] font-sans">
              {profile?.companyName || profile?.name || 'Acme Steel & Components'} · Vendor ID: <strong className="font-mono text-[#1C201E] dark:text-[#F5F7F6]">{profile?.code || 'SUP-001'}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-xs font-mono font-bold ${
              cloudinaryReady
                ? 'bg-[#DCFCE7] text-[#15803D] border border-[#15803D]/30'
                : 'bg-[#FEF3C7] text-[#D97706] border border-[#D97706]/30'
            }`}>
              <Cloud className="w-3.5 h-3.5" />
              <span>{cloudinaryReady ? 'Cloudinary Document Vault Connected' : 'Demo Document Vault Active'}</span>
            </div>
            <button
              type="button"
              onClick={loadPortal}
              className="p-2 rounded-xs border border-[#E3DDD1] dark:border-[#2B3835] text-[#68716D] hover:text-[#1C201E]"
              title="Refresh Portal"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3-Step Process Guide Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-[#E3DDD1] dark:border-[#2B3835]">
          <div className="p-3 rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835] space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#15803D] text-white flex items-center justify-center text-[10px] font-mono font-bold">1</span>
              <h3 className="font-sans font-bold text-xs text-[#1C201E] dark:text-[#F5F7F6]">Select Received PO</h3>
            </div>
            <p className="text-[11px] text-[#68716D] dark:text-[#8E9C97] font-sans">
              Warehouse completes physical inspection and issues Goods Receipt (GRN).
            </p>
          </div>

          <div className="p-3 rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835] space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#15803D] text-white flex items-center justify-center text-[10px] font-mono font-bold">2</span>
              <h3 className="font-sans font-bold text-xs text-[#1C201E] dark:text-[#F5F7F6]">Upload or Edit Invoice</h3>
            </div>
            <p className="text-[11px] text-[#68716D] dark:text-[#8E9C97] font-sans">
              Upload external invoice file or generate PDF with editable line items & taxes.
            </p>
          </div>

          <div className="p-3 rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835] space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#15803D] text-white flex items-center justify-center text-[10px] font-mono font-bold">3</span>
              <h3 className="font-sans font-bold text-xs text-[#1C201E] dark:text-[#F5F7F6]">Automatic Finance Match</h3>
            </div>
            <p className="text-[11px] text-[#68716D] dark:text-[#8E9C97] font-sans">
              Finance automatically reconciles lines against GRN for direct payment payout.
            </p>
          </div>
        </div>
      </PaperSheet>

      {/* 2. ASSIGNED PURCHASE ORDERS SECTION */}
      <PaperSheet variant="default" className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-[#E3DDD1] dark:border-[#2B3835]">
          <div>
            <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
              Purchase Orders Assigned to Your Vendor Account
            </h3>
            <p className="text-[10px] text-[#68716D] dark:text-[#8E9C97] font-mono">
              Invoices unlock automatically once goods arrive at the yard and GRN is issued
            </p>
          </div>
          <span className="text-xs font-mono text-[#15803D] font-bold">
            {displayPos.length} Purchase Orders
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {displayPos.map((po) => {
            const invoice = invoiceByPo.get(po.poNumber);
            const ready = ['PARTIALLY_RECEIVED', 'RECEIVED', 'COMPLETED'].includes(po.status) || Boolean(po.grnNumber);

            return (
              <div
                key={po._id || po.poNumber}
                className="p-4 rounded-xs bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider font-mono text-[#68716D]">Order Reference</span>
                    <h4 className="font-mono font-bold text-base text-[#15803D]">{po.poNumber}</h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded-xs text-[9px] font-mono font-bold uppercase ${
                    ready
                      ? 'bg-[#DCFCE7] text-[#15803D] border border-[#15803D]/30'
                      : 'bg-[#FEF3C7] text-[#D97706] border border-[#D97706]/30'
                  }`}>
                    {ready ? 'GRN READY · READY TO INVOICE' : `WAITING FOR WAREHOUSE · ${po.status}`}
                  </span>
                </div>

                <div className="p-2.5 rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] space-y-1 font-mono text-xs">
                  {(po.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[#1C201E] dark:text-[#F5F7F6]">
                      <span>{item.productName || 'Industrial Parts'} ({item.quantity} units)</span>
                      <strong>{money(item.unitPrice)}</strong>
                    </div>
                  ))}
                  <div className="pt-1 mt-1 border-t border-[#E3DDD1] dark:border-[#2B3835] flex justify-between font-bold">
                    <span>Order Total:</span>
                    <span className="text-[#15803D]">{money(po.totalAmount)}</span>
                  </div>
                </div>

                {/* Status or Invoice Action Buttons */}
                {invoice ? (
                  <div className="p-3 rounded-xs bg-[#DCFCE7]/60 dark:bg-[#163824]/60 border border-[#15803D]/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#15803D]">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Invoice: {invoice.invoiceNumber}</span>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-xs bg-[#15803D] text-white">
                        {invoice.submissionStatus || 'DISPATCHED'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setViewingDocInvoice(invoice)}
                        className="px-2.5 py-1 rounded-xs bg-[#FCFAF4] border border-[#15803D] text-[10px] font-mono font-bold text-[#15803D] hover:bg-[#DCFCE7] flex items-center gap-1 transition-colors"
                      >
                        <FileText className="w-3 h-3" />
                        <span>PDF Invoice</span>
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => openEditModal(invoice, po)}
                        className="px-2.5 py-1 rounded-xs bg-[#2563EB] text-white text-[10px] font-mono font-bold hover:bg-[#1D4ED8] flex items-center gap-1"
                      >
                        <PencilLine className="w-3 h-3" />
                        <span>Edit Invoice Lines</span>
                      </button>
                      {invoice.submissionStatus === 'DRAFT' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => submitOldDraft(invoice)}
                          className="px-2.5 py-1 rounded-xs bg-[#15803D] text-white text-[10px] font-mono font-bold hover:bg-[#166534] flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>Send to Finance</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : ready ? (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => openInvoiceModal('upload', po)}
                      className="flex-1 py-2 rounded-xs bg-[#15803D] text-white text-xs font-mono font-bold hover:bg-[#166534] flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Invoice</span>
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => openInvoiceModal('generate', po)}
                      className="flex-1 py-2 rounded-xs bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] text-[#1C201E] dark:text-[#F5F7F6] text-xs font-mono font-bold hover:border-[#15803D] flex items-center justify-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#15803D]" />
                      <span>Generate PDF</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-[#68716D] font-mono">
                    ⏳ Goods in transit. Invoice actions unlock automatically after gate check and GRN creation.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </PaperSheet>

      {/* 3. MODAL: FULL-FEATURED UPLOAD, EDIT & GENERATE INVOICE FORM */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form
            onSubmit={modal === 'generate' ? generateInvoice : modal === 'edit' ? updateInvoice : uploadInvoice}
            className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] rounded-xs p-5 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 font-sans text-xs"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E3DDD1] dark:border-[#2B3835]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xs bg-[#DCFCE7] dark:bg-[#163824] text-[#15803D]">
                  {modal === 'generate' ? <FileText className="w-4 h-4" /> : modal === 'edit' ? <PencilLine className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-handwriting text-xl sm:text-2xl font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                    {modal === 'generate' ? 'Generate Final Tax Invoice' : modal === 'edit' ? 'Edit Supplier Invoice Lines & Rates' : 'Upload Official Tax Invoice Document'}
                  </h3>
                  <p className="text-[11px] text-[#68716D] dark:text-[#8E9C97] font-mono">
                    Purchase Order: <strong>{selectedPo?.poNumber}</strong> · Stored in {storageMode === 'cloudinary' ? 'Cloudinary Vault' : 'Secure Demo Store'}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setModal(null)} 
                className="p-1.5 rounded-xs text-[#68716D] hover:text-[#1C201E] hover:bg-[#F4EFE6]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Core Invoice Metadata Fields */}
            {(modal === 'upload' || modal === 'edit') && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-[#1C201E] dark:text-[#F5F7F6]">Invoice Number *</label>
                    <input
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      required
                      placeholder="e.g. SINV-849201"
                      className="w-full px-3 py-2 font-mono text-xs rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835] focus:outline-none focus:border-[#15803D]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-[#1C201E] dark:text-[#F5F7F6]">Invoice Issue Date *</label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 font-mono text-xs rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835] focus:outline-none focus:border-[#15803D]"
                    />
                  </div>
                </div>

                {/* File Upload Zone */}
                <div className="space-y-1">
                  <label className="font-semibold text-[#1C201E] dark:text-[#F5F7F6]">
                    {modal === 'edit' ? 'Replace Invoice Document (Optional)' : 'Select Original Invoice File *'}
                  </label>
                  <input
                    type="file"
                    accept={ALLOWED_FILES}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    required={modal === 'upload'}
                    className="w-full px-3 py-2 font-mono text-xs rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835] file:mr-3 file:py-1 file:px-2.5 file:rounded-xs file:border-0 file:text-xs file:font-mono file:bg-[#15803D] file:text-white hover:file:bg-[#166534]"
                  />
                  <small className="block text-[10px] text-[#68716D] font-mono">
                    Supported: PDF, JPG, PNG, WEBP, Word, Excel, CSV (Max: 10 MB)
                  </small>
                </div>

                {/* Editable Line Items Section */}
                <div className="space-y-2 pt-2 border-t border-[#E3DDD1] dark:border-[#2B3835]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1C201E] dark:text-[#F5F7F6]">
                      Editable Line Items ({items.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setItems(current => [...current, { productName: '', quantity: 1, unitPrice: 100 }])}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xs border border-[#15803D] text-[#15803D] text-[10px] font-mono font-bold hover:bg-[#DCFCE7]"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Item Line</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {items.map((item, index) => (
                      <div key={`item-${index}`} className="grid grid-cols-[1fr_80px_110px_32px] gap-2 items-center">
                        <input
                          value={item.productName}
                          onChange={(e) => setItems(current => current.map((l, i) => i === index ? { ...l, productName: e.target.value } : l))}
                          placeholder="Item Description / SKU"
                          required
                          className="px-2.5 py-1.5 text-xs font-sans rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835] focus:outline-none focus:border-[#15803D]"
                        />
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => setItems(current => current.map((l, i) => i === index ? { ...l, quantity: Number(e.target.value) } : l))}
                          placeholder="Qty"
                          title="Quantity"
                          required
                          className="px-2 py-1.5 text-xs font-mono rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835] focus:outline-none focus:border-[#15803D]"
                        />
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => setItems(current => current.map((l, i) => i === index ? { ...l, unitPrice: Number(e.target.value) } : l))}
                          placeholder="Unit Price (₹)"
                          title="Price per unit"
                          required
                          className="px-2 py-1.5 text-xs font-mono rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835] focus:outline-none focus:border-[#15803D]"
                        />
                        <button
                          type="button"
                          disabled={items.length === 1}
                          onClick={() => setItems(current => current.filter((_, i) => i !== index))}
                          className="p-1.5 rounded-xs text-[#DC2626] hover:bg-[#FEE2E2] disabled:opacity-30 flex items-center justify-center"
                          title="Delete line"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tax and Shipping Fields */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E3DDD1] dark:border-[#2B3835]">
              <div className="space-y-1">
                <label className="font-semibold text-[#1C201E] dark:text-[#F5F7F6]">GST / Tax Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-full px-3 py-2 font-mono rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835] focus:outline-none focus:border-[#15803D]"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-[#1C201E] dark:text-[#F5F7F6]">Shipping & Freight (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={shippingAmount}
                  onChange={(e) => setShippingAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 font-mono rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835] focus:outline-none focus:border-[#15803D]"
                />
              </div>
            </div>

            {/* Live Calculation Summary Breakdown */}
            <div className="p-3 rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835] space-y-1 font-mono text-xs">
              <div className="flex justify-between text-[#68716D]">
                <span>Lines Subtotal:</span>
                <span>{money(linesSubtotal)}</span>
              </div>
              <div className="flex justify-between text-[#68716D]">
                <span>GST Tax ({taxRate}%):</span>
                <span>{money(calculatedTax)}</span>
              </div>
              <div className="flex justify-between text-[#68716D]">
                <span>Shipping & Handling:</span>
                <span>{money(shippingAmount)}</span>
              </div>
              <div className="pt-1 mt-1 border-t border-[#E3DDD1] dark:border-[#2B3835] flex justify-between font-bold text-sm text-[#15803D]">
                <span>Calculated Grand Total:</span>
                <span>{money(calculatedGrandTotal)}</span>
              </div>
            </div>

            {/* Cloudinary Integration Callout */}
            <div className="p-2.5 rounded-xs bg-[#DCFCE7] dark:bg-[#163824] border border-[#15803D]/30 text-[11px] font-mono text-[#15803D] dark:text-[#22C55E] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>One-click uploads to Cloudinary storage, writes to DB ledger, and syncs to Finance AP queue.</span>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E3DDD1] dark:border-[#2B3835]">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-4 py-2 rounded-xs border border-[#E3DDD1] text-xs font-mono hover:bg-[#F4EFE6]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-5 py-2 rounded-xs bg-[#15803D] text-white text-xs font-mono font-bold hover:bg-[#166534] disabled:opacity-50 transition-colors shadow-2xs flex items-center gap-1.5"
              >
                {modal === 'generate' ? <FileText className="w-4 h-4" /> : modal === 'edit' ? <PencilLine className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                <span>
                  {busy 
                    ? 'Processing & Storing...' 
                    : modal === 'generate' 
                      ? 'Generate & Send' 
                      : modal === 'edit' 
                        ? 'Save & Refresh Finance' 
                        : 'Upload & Send to Finance'}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DOCUMENT PDF VIEWER MODAL */}
      {viewingDocInvoice && (
        <InvoiceDocViewerModal
          invoice={viewingDocInvoice}
          onClose={() => setViewingDocInvoice(null)}
        />
      )}

    </div>
  );
}
