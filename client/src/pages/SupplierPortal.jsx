import React, { useEffect, useMemo, useState } from 'react';
import { supplierAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
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
  X
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
  const [taxRate, setTaxRate] = useState(0);
  const [shippingAmount, setShippingAmount] = useState(0);
  const [file, setFile] = useState(null);
  const [items, setItems] = useState([]);

  const loadPortal = async () => {
    try {
      setLoading(true);
      const [profileResponse, poResponse, invoiceResponse] = await Promise.all([
        supplierAPI.getProfile(), supplierAPI.getPurchaseOrders(), supplierAPI.getInvoices()
      ]);
      setProfile(profileResponse.data.supplier);
      setCloudinaryReady(Boolean(profileResponse.data.cloudinaryReady));
      setStorageMode(profileResponse.data.storageMode || (profileResponse.data.cloudinaryReady ? 'cloudinary' : 'local_demo'));
      setPurchaseOrders(poResponse.data.purchaseOrders || []);
      setInvoices(invoiceResponse.data.invoices || []);
    } catch (error) {
      showNotification(error.response?.data?.message || 'Supplier portal data could not be loaded.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPortal(); }, []);

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
    setTaxRate(0);
    setShippingAmount(0);
    setFile(null);
    setItems((po.items || []).map(item => ({ productName: item.productName, quantity: item.quantity, unitPrice: item.unitPrice })));
  };

  const openEditModal = (invoice, po) => {
    setModal('edit');
    setSelectedPo(po);
    setEditingInvoice(invoice);
    setInvoiceNumber(invoice.invoiceNumber || '');
    setInvoiceDate(new Date(invoice.invoiceDate || Date.now()).toISOString().slice(0, 10));
    setTaxRate(Number(invoice.taxRate || 0));
    setShippingAmount(Number(invoice.shippingAmount || 0));
    setFile(null);
    setItems((invoice.items || []).map(item => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice
    })));
  };

  const generateInvoice = async event => {
    event.preventDefault();
    try {
      setBusy(true);
      const response = await supplierAPI.generateInvoice(selectedPo.poNumber, { taxRate, shippingAmount });
      showNotification(response.data.message || 'Invoice generated, securely stored and sent to Finance.', 'success');
      setModal(null);
      await loadPortal();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Invoice could not be generated.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const uploadInvoice = async event => {
    event.preventDefault();
    if (!file) return showNotification('Choose an invoice document first.', 'error');
    try {
      setBusy(true);
      const subtotal = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('invoiceNumber', invoiceNumber);
      formData.append('invoiceDate', invoiceDate);
      formData.append('poNumber', selectedPo.poNumber);
      formData.append('items', JSON.stringify(items));
      formData.append('taxRate', String(taxRate));
      formData.append('shippingAmount', String(shippingAmount));
      formData.append('totalAmount', String(subtotal + subtotal * Number(taxRate || 0) / 100 + Number(shippingAmount || 0)));
      const response = await supplierAPI.uploadInvoice(formData);
      showNotification(response.data.message || 'Invoice securely uploaded and sent to Finance.', 'success');
      setModal(null);
      await loadPortal();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Invoice upload failed.', 'error');
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
      formData.append('shippingAmount', String(shippingAmount));
      const response = await supplierAPI.updateInvoice(editingInvoice._id, formData);
      showNotification(response.data.message || 'Invoice corrected and refreshed in Finance.', 'success');
      setModal(null);
      setEditingInvoice(null);
      await loadPortal();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Invoice could not be updated.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const submitOldDraft = async invoice => {
    try {
      setBusy(true);
      const response = await supplierAPI.submitInvoice(invoice._id);
      showNotification(response.data.message || 'Invoice sent to Finance.', 'success');
      await loadPortal();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Invoice could not be sent.', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="min-h-[70vh] flex items-center justify-center text-xs text-zinc-400">Loading your simple supplier workspace…</div>;

  return (
    <div className="p-5 md:p-8 space-y-6 max-w-6xl mx-auto min-h-screen">
      <section className="rounded-2xl bg-white/90 dark:bg-zinc-900/85 border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
        <span className="mx-auto w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-600 flex items-center justify-center"><Building2 className="w-6 h-6" /></span>
        <h1 className="text-2xl font-extrabold mt-3">Supplier Invoice Portal</h1>
        <p className="text-sm text-zinc-500 mt-1">{profile?.companyName || profile?.name} · {profile?.code}</p>
        <div className={`mt-4 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold ${cloudinaryReady ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'}`}>
          <Cloud className="w-4 h-4" />
          {cloudinaryReady
            ? 'Cloudinary connected — invoices are saved in the cloud'
            : 'Invoice upload is ready — built-in demo storage is active'}
        </div>
        {!cloudinaryReady && <p className="mt-2 text-[11px] text-zinc-500">Nothing is blocked. Add <strong>CLOUDINARY_URL</strong> later and restart to switch automatically from local demo storage to Cloudinary.</p>}
        <div className="mt-4"><button onClick={loadPortal} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button></div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          ['1', 'Choose a received PO', 'The warehouse must finish the GRN first.', PackageCheck],
          ['2', 'Upload or generate invoice', cloudinaryReady ? 'Your document is stored directly in Cloudinary.' : 'Your document is stored in the built-in demo store.', Upload],
          ['3', 'Automatically sent to Finance', 'No copy-paste and no extra submit step.', Send]
        ].map(([number, title, description, Icon]) => (
          <div key={number} className="rounded-2xl bg-white/90 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 p-5">
            <span className="mx-auto w-8 h-8 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">{number}</span>
            <Icon className="w-5 h-5 mx-auto mt-3 text-purple-500" />
            <h2 className="font-bold text-sm mt-2">{title}</h2>
            <p className="text-[11px] text-zinc-500 mt-1">{description}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-center gap-2"><PackageCheck className="w-4 h-4 text-purple-500" /><h2 className="text-sm font-bold">Purchase Orders Assigned to You</h2></div>
        {purchaseOrders.length === 0 && <div className="p-10 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-400">No Purchase Orders are assigned yet.</div>}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {purchaseOrders.map(po => {
            const invoice = invoiceByPo.get(po.poNumber);
            const ready = ['PARTIALLY_RECEIVED', 'RECEIVED', 'COMPLETED'].includes(po.status);
            return (
              <article key={po._id} className="rounded-2xl bg-white/95 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400">Purchase Order</span>
                <h3 className="font-mono font-extrabold text-lg mt-1">{po.poNumber}</h3>
                <div className="mt-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs">
                  {(po.items || []).map(item => <p key={item.productName}>{item.productName} · {item.quantity} × {money(item.unitPrice)}</p>)}
                  <p className="font-bold mt-2">Total: {money(po.totalAmount)}</p>
                </div>
                <span className={`inline-block mt-3 px-3 py-1 rounded-full text-[10px] font-bold ${ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{ready ? 'GRN READY' : `WAITING FOR WAREHOUSE · ${po.status}`}</span>

                {invoice ? (
                  <div className="mt-4 p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-600" />
                    <p className="text-xs font-bold mt-2">{invoice.invoiceNumber}</p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1">Saved in {invoice.document?.storageProvider === 'cloudinary' ? 'Cloudinary' : 'demo document storage'} · {invoice.submissionStatus === 'DRAFT' ? 'Needs one-time send' : 'Fetched automatically by Finance'}</p>
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <a href={invoice.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold"><Download className="w-3.5 h-3.5" /> REAL INVOICE</a>
                      <button disabled={busy} onClick={() => openEditModal(invoice, po)} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold disabled:opacity-50"><PencilLine className="w-3.5 h-3.5" /> Edit Invoice</button>
                      {invoice.submissionStatus === 'DRAFT' && <button disabled={busy} onClick={() => submitOldDraft(invoice)} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50"><Send className="w-3.5 h-3.5" /> Send to Finance</button>}
                    </div>
                  </div>
                ) : ready ? (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button disabled={busy} onClick={() => openInvoiceModal('upload', po)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold disabled:opacity-40"><Upload className="w-4 h-4" /> Upload Invoice</button>
                    <button disabled={busy} onClick={() => openInvoiceModal('generate', po)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold disabled:opacity-40"><FileText className="w-4 h-4" /> Generate PDF</button>
                  </div>
                ) : <p className="text-[11px] text-zinc-400 mt-4">The invoice buttons unlock automatically after goods are received.</p>}
              </article>
            );
          })}
        </div>
      </section>

      {modal && (
        <div className="fixed inset-0 z-50 bg-zinc-950/65 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={modal === 'generate' ? generateInvoice : modal === 'edit' ? updateInvoice : uploadInvoice} className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4">
            <button type="button" onClick={() => setModal(null)} className="ml-auto block"><X className="w-5 h-5 text-zinc-400" /></button>
            <Cloud className="w-8 h-8 mx-auto text-purple-500" />
            <h2 className="text-lg font-extrabold">{modal === 'generate' ? 'Generate Final Supplier Invoice' : modal === 'edit' ? 'Edit Supplier Invoice' : 'Upload Supplier Invoice'}</h2>
            <p className="text-xs text-zinc-500">PO {selectedPo?.poNumber} · This will be saved in {storageMode === 'cloudinary' ? 'Cloudinary' : 'the built-in demo store'} and sent to Finance automatically.</p>

            {(modal === 'upload' || modal === 'edit') && <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1.5"><span className="text-xs font-semibold">Invoice number</span><input value={invoiceNumber} onChange={event => setInvoiceNumber(event.target.value)} required className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs" /></label>
                <label className="block space-y-1.5"><span className="text-xs font-semibold">Invoice date</span><input type="date" value={invoiceDate} onChange={event => setInvoiceDate(event.target.value)} required className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs" /></label>
              </div>
              <label className="block space-y-1.5"><span className="text-xs font-semibold">{modal === 'edit' ? 'Replace invoice file (optional)' : 'Choose the real invoice file'}</span><input type="file" accept={ALLOWED_FILES} onChange={event => setFile(event.target.files?.[0] || null)} required={modal === 'upload'} className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs" /><small className="block text-zinc-400">PDF, JPG, PNG, WEBP, HTML, Word, Excel or CSV · max 10 MB{modal === 'edit' ? ' · leave empty to generate a corrected PDF' : ''}</small></label>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><span className="text-xs font-semibold">Editable invoice lines</span><button type="button" onClick={() => setItems(current => [...current, { productName: '', quantity: 1, unitPrice: 1 }])} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-purple-200 text-purple-600 text-[10px] font-bold"><Plus className="w-3 h-3" /> Add line</button></div>
                {items.map((item, index) => <div key={`invoice-line-${index}`} className="grid grid-cols-[1fr_90px_110px_34px] gap-2"><input value={item.productName} onChange={event => setItems(current => current.map((line, lineIndex) => lineIndex === index ? { ...line, productName: event.target.value } : line))} placeholder="Item name" required className="min-w-0 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs" /><input type="number" min="0.01" step="0.01" value={item.quantity} onChange={event => setItems(current => current.map((line, lineIndex) => lineIndex === index ? { ...line, quantity: event.target.value } : line))} required className="min-w-0 px-2 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs" title="Quantity" /><input type="number" min="0.01" step="0.01" value={item.unitPrice} onChange={event => setItems(current => current.map((line, lineIndex) => lineIndex === index ? { ...line, unitPrice: event.target.value } : line))} required className="min-w-0 px-2 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs" title="Price per unit" /><button type="button" disabled={items.length === 1} onClick={() => setItems(current => current.filter((_, lineIndex) => lineIndex !== index))} className="rounded-lg border border-rose-200 text-rose-600 flex items-center justify-center disabled:opacity-30" title="Remove line"><Trash2 className="w-3.5 h-3.5" /></button></div>)}
              </div>
            </>}

            <div className="grid grid-cols-2 gap-3"><label className="space-y-1.5"><span className="text-xs font-semibold">Tax rate (%)</span><input type="number" min="0" step="0.01" value={taxRate} onChange={event => setTaxRate(event.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs" /></label><label className="space-y-1.5"><span className="text-xs font-semibold">Shipping amount</span><input type="number" min="0" step="0.01" value={shippingAmount} onChange={event => setShippingAmount(event.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs" /></label></div>
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 text-xs text-purple-700 dark:text-purple-300"><CheckCircle2 className="w-4 h-4 mx-auto mb-1" />One click completes document storage, database save, and Finance handoff.</div>
            <div className="flex items-center justify-center gap-2"><button type="button" onClick={() => setModal(null)} className="px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold">Cancel</button><button disabled={busy} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-semibold disabled:opacity-50">{modal === 'generate' ? <FileText className="w-4 h-4" /> : modal === 'edit' ? <PencilLine className="w-4 h-4" /> : <Upload className="w-4 h-4" />}{busy ? 'Saving invoice securely…' : modal === 'generate' ? 'Generate & Send' : modal === 'edit' ? 'Save & Refresh Finance' : 'Upload & Send'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
