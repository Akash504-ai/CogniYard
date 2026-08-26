import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Truck, 
  FileText, 
  Boxes, 
  Receipt, 
  Building2, 
  Route, 
  ShieldCheck, 
  Sparkles, 
  X,
  ArrowRight,
  CornerDownLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { currentRole, setIsAiOpen } = useAuth();
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Global keyboard listener for Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? onClose() : null; // Handled in parent
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Mock domain records for instant lookup
  const mockRecords = [
    { type: 'TRUCK', id: 'TRK-WB25AB1234', title: 'Tata Prima 40T • In Yard (Stall 02)', path: '/yard-simulation', category: 'Logistics' },
    { type: 'TRUCK', id: 'TRK-WB11CD5678', title: 'Ashok Leyland • Docked D-01', path: '/yard-simulation', category: 'Logistics' },
    { type: 'PO', id: 'PO-78342', title: 'Acme Steel Pvt Ltd • 500 Industrial Bearings', path: '/procurement', category: 'Procurement' },
    { type: 'PO', id: 'PO-4001', title: 'TechCorp Solutions • 100 High-Speed Motors', path: '/procurement', category: 'Procurement' },
    { type: 'LPN', id: 'LPN-0004521', title: 'Location: YARD-A-05 • 24 Pallets', path: '/inventory-planning', category: 'Inventory' },
    { type: 'LPN', id: 'LPN-458762', title: 'Location: DOCK-02 • 16 Pallets (QC Hold)', path: '/inventory-planning', category: 'Inventory' },
    { type: 'INVOICE', id: 'INV-8810', title: '₹1,41,600 • 3-Way Match Pending', path: '/finance', category: 'Finance' },
    { type: 'INVOICE', id: 'INV-9901', title: '₹85,000 • Matched & Ready for Payment', path: '/finance', category: 'Finance' },
    { type: 'DOCK', id: 'DOCK-02', title: 'Unloading Bay • Receiving PO-4001', path: '/logistics', category: 'Logistics' },
    { type: 'SUPPLIER', id: 'SUP-ACME', title: 'Acme Steel Pvt Ltd • OTD: 94%', path: '/admin', category: 'Administration' }
  ];

  const quickPages = [
    { name: 'Command Center', path: '/', icon: Boxes },
    { name: 'Yard & Logistics Operations', path: '/logistics', icon: Truck },
    { name: 'Yard Simulation Twin', path: '/yard-simulation', icon: Route },
    { name: 'Purchase Orders & Requisitions', path: '/procurement', icon: FileText },
    { name: '3-Way Match & Invoices', path: '/finance', icon: Receipt },
    { name: 'Exception Center', path: '/exceptions', icon: ShieldCheck },
    { name: 'Inventory & LPN Planning', path: '/inventory-planning', icon: Boxes },
  ];

  const filteredRecords = query.trim()
    ? mockRecords.filter(r => 
        r.id.toLowerCase().includes(query.toLowerCase()) || 
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.category.toLowerCase().includes(query.toLowerCase())
      )
    : mockRecords.slice(0, 6);

  const handleSelect = (path) => {
    onClose();
    navigate(path);
  };

  const getRecordIcon = (type) => {
    switch (type) {
      case 'TRUCK': return Truck;
      case 'PO': return FileText;
      case 'LPN': return Boxes;
      case 'INVOICE': return Receipt;
      case 'SUPPLIER': return Building2;
      default: return Search;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/50 backdrop-blur-xs">
      <div 
        className="w-full max-w-2xl rounded-sm border border-[#DDD9CF] dark:border-[#2B3533] bg-[#FBFAF5] dark:bg-[#181D1C] text-[#1A1F1D] dark:text-[#F2F4F3] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#DDD9CF] dark:border-[#2B3533] bg-[#F3F1E8] dark:bg-[#1E2423]">
          <Search className="w-5 h-5 text-[#8A908B] dark:text-[#707A76] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search LPN / PO / Truck / Pallet ID / Invoice..."
            className="w-full bg-transparent border-none text-sm font-medium text-[#1A1F1D] dark:text-[#F2F4F3] placeholder-[#8A908B] dark:placeholder-[#707A76] focus:outline-none focus:ring-0 font-sans"
          />
          <span className="hidden sm:inline-flex text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-[#DDD9CF] dark:bg-[#2B3533] text-[#5D6560] dark:text-[#A3ACA8]">
            ESC
          </span>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 text-[#8A908B] hover:text-[#1A1F1D] dark:hover:text-[#F2F4F3]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {/* Operational Objects Group */}
          <div>
            <p className="px-2 pb-1.5 text-[10px] font-bold font-mono uppercase tracking-wider text-[#8A908B] dark:text-[#707A76]">
              Operational Entities ({filteredRecords.length})
            </p>
            <div className="space-y-1">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((item) => {
                  const ItemIcon = getRecordIcon(item.type);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.path)}
                      className="w-full flex items-center justify-between p-2.5 rounded-sm text-left hover:bg-[#F3F1E8] dark:hover:bg-[#1E2423] border border-transparent hover:border-[#DDD9CF] dark:hover:border-[#2B3533] transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="p-1.5 rounded-sm bg-[#166534]/10 text-[#166534] dark:bg-[#15803D]/20 dark:text-[#15803D] shrink-0">
                          <ItemIcon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#1A1F1D] dark:text-[#F2F4F3]">
                              {item.id}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-sm bg-[#EAE7DC] dark:bg-[#252D2B] text-[#5D6560] dark:text-[#A3ACA8]">
                              {item.type}
                            </span>
                          </div>
                          <p className="text-xs text-[#5D6560] dark:text-[#A3ACA8] truncate mt-0.5">
                            {item.title}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[11px] font-medium text-[#166534] dark:text-[#15803D]">Open</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#166534] dark:text-[#15803D]" />
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-[#8A908B]">
                  No operational records found matching "{query}"
                </div>
              )}
            </div>
          </div>

          {/* Quick Navigation Pages */}
          {!query && (
            <div className="pt-2 border-t border-[#DDD9CF] dark:border-[#2B3533]">
              <p className="px-2 pb-1.5 text-[10px] font-bold font-mono uppercase tracking-wider text-[#8A908B] dark:text-[#707A76]">
                Operational Workspaces
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {quickPages.map((page) => {
                  const PageIcon = page.icon;
                  return (
                    <button
                      key={page.path}
                      type="button"
                      onClick={() => handleSelect(page.path)}
                      className="flex items-center gap-2.5 p-2 rounded-sm text-left text-xs font-medium text-[#5D6560] dark:text-[#A3ACA8] hover:text-[#1A1F1D] dark:hover:text-[#F2F4F3] hover:bg-[#F3F1E8] dark:hover:bg-[#1E2423] transition-colors"
                    >
                      <PageIcon className="w-3.5 h-3.5 text-[#166534] dark:text-[#15803D] shrink-0" />
                      <span className="truncate">{page.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#F3F1E8] dark:bg-[#1E2423] border-t border-[#DDD9CF] dark:border-[#2B3533] text-[11px] text-[#8A908B]">
          <span>Navigate with <strong>↑</strong> <strong>↓</strong> and press <strong>Enter</strong></span>
          <span className="font-mono">CogniYard OS v2.4</span>
        </div>
      </div>
    </div>
  );
}
