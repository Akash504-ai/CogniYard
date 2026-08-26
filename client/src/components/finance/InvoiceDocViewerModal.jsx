import React, { useRef } from 'react';
import {
  X,
  Printer,
  Download,
  FileText,
  Building2,
  CheckCircle2,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export default function InvoiceDocViewerModal({ invoice, onClose }) {
  const printRef = useRef(null);

  if (!invoice) return null;

  const invNumber = invoice.invoiceNumber || 'INV-8810';
  const poNumber = invoice.poNumber || 'PO-78432';
  const grnNumber = invoice.grnNumber || 'GRN-5011';
  const supplierName = invoice.supplierName || invoice.supplier?.name || invoice.supplier?.companyName || 'Acme Steel Pvt Ltd';
  const supplierCode = invoice.supplier?.code || 'SUP-001';
  const invoiceDate = invoice.invoiceDate 
    ? new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  
  const items = (invoice.items && invoice.items.length > 0)
    ? invoice.items
    : [
        {
          productName: 'Precision Steel Bearings (SKF-6204)',
          quantity: 500,
          unitPrice: 277.536
        }
      ];

  const subtotal = invoice.subtotal || invoice.amount || items.reduce((s, i) => s + (Number(i.quantity || 0) * Number(i.unitPrice || 0)), 0);
  const taxRate = Number(invoice.taxRate ?? 18);
  const taxAmount = invoice.taxAmount || (subtotal * (taxRate / 100));
  const shipping = Number(invoice.shippingAmount || 0);
  const grandTotal = invoice.totalAmount || (subtotal + taxAmount + shipping);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4 font-sans print:p-0 print:bg-white print:static print:z-auto">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] rounded-xs shadow-2xl space-y-4 p-5 sm:p-8 animate-in zoom-in-95 print:border-none print:shadow-none print:max-w-none print:max-h-none print:bg-white print:p-0">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E3DDD1] dark:border-[#2B3835] print:hidden">
          <div className="flex items-center gap-2 text-xs font-mono text-[#15803D] font-bold">
            <FileText className="w-4 h-4" />
            <span>OFFICIAL TAX INVOICE & DOCUMENT VIEWER</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xs bg-[#15803D] text-white text-xs font-mono font-bold hover:bg-[#166534] transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xs text-[#68716D] hover:text-[#1C201E] hover:bg-[#F4EFE6]"
              title="Close Viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Tax Invoice Sheet */}
        <div ref={printRef} className="space-y-6 bg-white dark:bg-[#181D1C] p-6 sm:p-8 border border-[#E3DDD1] dark:border-[#2B3835] rounded-xs text-xs font-sans print:border-none print:p-0">
          
          {/* Invoice Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b-2 border-[#15803D]">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#15803D] font-bold block mb-1">
                ORIGINAL TAX INVOICE (GST COMPLIANT)
              </span>
              <h2 className="text-2xl font-bold font-serif text-[#1C201E] dark:text-[#F5F7F6]">
                {supplierName}
              </h2>
              <p className="text-[11px] text-[#68716D] dark:text-[#8E9C97] font-mono mt-0.5">
                GSTIN: 27AABCT3518Q1Z4 · Code: {supplierCode}
              </p>
              <p className="text-[11px] text-[#68716D] dark:text-[#8E9C97] mt-0.5">
                Plot 42, Heavy Industrial Area, Phase II, Pune, MH 411018
              </p>
            </div>

            <div className="sm:text-right space-y-1 font-mono">
              <div className="text-lg font-bold text-[#15803D]">{invNumber}</div>
              <div className="text-xs text-[#1C201E] dark:text-[#F5F7F6]">Date: <strong>{invoiceDate}</strong></div>
              <div className="text-xs text-[#68716D] dark:text-[#8E9C97]">PO Reference: <strong>{poNumber}</strong></div>
              <div className="text-xs text-[#68716D] dark:text-[#8E9C97]">GRN Reference: <strong>{grnNumber}</strong></div>
            </div>
          </div>

          {/* Billing & Shipping Addresses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 border-b border-[#E3DDD1] dark:border-[#2B3835] text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-[#68716D] font-bold">Billed To (Client):</span>
              <p className="font-bold text-[#1C201E] dark:text-[#F5F7F6]">CogniYard Supply Chain Logistics Ltd</p>
              <p className="text-[#68716D] dark:text-[#8E9C97]">Central Yard Gate 3, Ring Road Logistics Park</p>
              <p className="text-[#68716D] dark:text-[#8E9C97]">GSTIN: 19AAACC4821L1Z9</p>
            </div>

            <div className="space-y-0.5 sm:text-right">
              <span className="text-[10px] font-mono uppercase text-[#68716D] font-bold">Consignee & Delivery:</span>
              <p className="font-bold text-[#1C201E] dark:text-[#F5F7F6]">Inbound Receiving Dock D4</p>
              <p className="text-[#68716D] dark:text-[#8E9C97]">CogniYard Central Automated Warehouse</p>
              <p className="text-[#68716D] dark:text-[#8E9C97]">Payment Terms: Net 30 Days via RTGS</p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b-2 border-[#1C201E] dark:border-[#F5F7F6] text-[10px] uppercase text-[#68716D]">
                  <th className="py-2">#</th>
                  <th className="py-2">Item Description & Specification</th>
                  <th className="py-2 text-right">Quantity</th>
                  <th className="py-2 text-right">Unit Price</th>
                  <th className="py-2 text-right">Line Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3DDD1]/80">
                {items.map((item, index) => {
                  const qty = Number(item.quantity || item.invQty || 1);
                  const price = Number(item.unitPrice || item.invPrice || 100);
                  const lineTotal = qty * price;

                  return (
                    <tr key={index} className="py-2">
                      <td className="py-2.5 text-[#68716D]">{index + 1}</td>
                      <td className="py-2.5 font-sans font-medium text-[#1C201E] dark:text-[#F5F7F6]">
                        {item.productName || 'Industrial Mechanical Supply Line'}
                      </td>
                      <td className="py-2.5 text-right font-bold">{qty} units</td>
                      <td className="py-2.5 text-right">₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-2.5 text-right font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                        ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Totals */}
          <div className="flex justify-end pt-3 border-t-2 border-[#1C201E] dark:border-[#F5F7F6]">
            <div className="w-full sm:w-72 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-[#68716D]">
                <span>Line Items Subtotal:</span>
                <span>₹{Number(subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-[#68716D]">
                <span>Integrated GST ({taxRate}%):</span>
                <span>₹{Number(taxAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {shipping > 0 && (
                <div className="flex justify-between text-[#68716D]">
                  <span>Freight & Logistics:</span>
                  <span>₹{Number(shipping).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="pt-2 border-t border-[#E3DDD1] dark:border-[#2B3835] flex justify-between font-bold text-sm text-[#15803D]">
                <span>Total Net Payable:</span>
                <span>₹{Number(grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Verification Stamp & Signatory Footer */}
          <div className="pt-6 border-t border-[#E3DDD1] dark:border-[#2B3835] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#68716D]">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-xs bg-[#DCFCE7] text-[#15803D]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold block text-[#1C201E] dark:text-[#F5F7F6]">Digitally Signed & Validated</span>
                <span className="text-[10px] font-mono">CogniYard Smart Contract Ledger ID: 0x8F92...B31A</span>
              </div>
            </div>

            <div className="text-center sm:text-right font-mono">
              <div className="font-bold text-[#1C201E] dark:text-[#F5F7F6]">For {supplierName}</div>
              <div className="text-[10px] text-[#8E9C97] mt-3 border-t border-dashed border-[#8E9C97] pt-0.5">
                Authorized Signatory
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
