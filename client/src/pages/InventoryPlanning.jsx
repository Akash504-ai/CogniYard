import React, { useState, useEffect } from 'react';
import { inventoryPlanningAPI } from '../services/api';
import { PaperSheet, SectionHeader } from '../components/layout/PaperSheet';
import LPNDetailSheet from '../components/inventory/LPNDetailSheet';
import {
  Boxes,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Info,
  ChevronRight,
  X,
  Zap,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Calculator,
  Sliders,
  MapPin
} from 'lucide-react';

export default function InventoryPlanning() {
  const [summary, setSummary] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLpn, setSelectedLpn] = useState(null);

  // Mock LPN inventory data
  const mockLpns = [
    { id: 'LPN-0004521', po: 'PO-78342', pallets: 24, location: 'YARD-A-05', status: 'STORED', item: 'Precision Ball Bearings', supplier: 'Acme Steel Pvt Ltd' },
    { id: 'LPN-0004522', po: 'PO-78342', pallets: 24, location: 'YARD-A-06', status: 'STORED', item: 'Precision Ball Bearings', supplier: 'Acme Steel Pvt Ltd' },
    { id: 'LPN-458762', po: 'PO-4001', pallets: 16, location: 'DOCK-02', status: 'RECEIVING', item: 'High-Speed Motors', supplier: 'TechCorp Solutions' },
    { id: 'LPN-458763', po: 'PO-4001', pallets: 16, location: 'QC-HOLD-01', status: 'QC_HOLD', item: 'High-Speed Motors', supplier: 'TechCorp Solutions' },
    { id: 'LPN-992101', po: 'PO-4003', pallets: 32, location: 'YARD-B-12', status: 'STORED', item: 'Hydraulic Cylinders', supplier: 'Apex Fasteners' }
  ];

  const fetchPlanningData = async () => {
    setLoading(true);
    try {
      const [summaryRes, productsRes] = await Promise.all([
        inventoryPlanningAPI.getSummary(),
        inventoryPlanningAPI.getProducts()
      ]);
      if (summaryRes.data.success) setSummary(summaryRes.data.summary);
      if (productsRes.data.success) setProducts(productsRes.data.products);
    } catch (err) {
      console.error('Error fetching inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanningData();
  }, []);

  const filteredLpns = mockLpns.filter(l => 
    l.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.po.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.item.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      
      {/* HEADER SHEET */}
      <PaperSheet variant="default" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#166534] text-white font-mono font-bold text-xs">
                INV
              </span>
              <h1 className="text-lg font-bold font-sans tracking-tight text-[#1A1F1D] dark:text-[#F2F4F3] uppercase">
                Inventory & Storage Location Management
              </h1>
            </div>
            <p className="text-xs text-[#5D6560] dark:text-[#A3ACA8] mt-1">
              LPN tracking, warehouse rack coordinates, pallet storage density, and stock reorder forecasts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search LPN / Rack Slot / PO..."
                className="px-3 py-1.5 rounded-sm bg-[#FBFAF5] dark:bg-[#181D1C] border border-[#DDD9CF] dark:border-[#2B3533] text-xs font-mono text-[#1A1F1D] dark:text-[#F2F4F3] placeholder-[#8A908B] focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-[#8A908B]" />
            </div>
            <button
              type="button"
              onClick={fetchPlanningData}
              className="p-2 rounded-sm border border-[#DDD9CF] dark:border-[#2B3533] bg-[#FBFAF5] dark:bg-[#181D1C] text-[#5D6560] hover:bg-[#F3F1E8]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </PaperSheet>

      {/* STORAGE LOCATION RACK VISUALIZER */}
      <PaperSheet variant="grid" className="p-4 sm:p-6 space-y-4">
        <SectionHeader
          title="Warehouse Storage Rack Coordinates"
          subtitle="Physical bay capacity and pallet occupancy map"
          icon={MapPin}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
          {/* RACK A */}
          <div className="p-3.5 rounded-sm bg-[#FBFAF5] dark:bg-[#181D1C] border border-[#DDD9CF] dark:border-[#2B3533] space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-[#DDD9CF] dark:border-[#2B3533]">
              <strong className="text-[#1A1F1D] dark:text-[#F2F4F3]">RACK BAY A (FAST-MOVER)</strong>
              <span className="text-[10px] text-[#166534] dark:text-[#15803D] font-bold">85% OCCUPIED</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
              <div className="p-2 rounded-xs bg-[#15803D]/15 text-[#15803D] border border-[#15803D]/30 font-bold">A-01 [24P]</div>
              <div className="p-2 rounded-xs bg-[#15803D]/15 text-[#15803D] border border-[#15803D]/30 font-bold">A-02 [24P]</div>
              <div className="p-2 rounded-xs bg-[#15803D]/15 text-[#15803D] border border-[#15803D]/30 font-bold">A-03 [18P]</div>
              <div className="p-2 rounded-xs bg-[#15803D]/15 text-[#15803D] border border-[#15803D]/30 font-bold">A-04 [24P]</div>
              <div className="p-2 rounded-xs bg-[#EAE7DC] dark:bg-[#252D2B] text-[#5D6560] border border-[#DDD9CF] dark:border-[#2B3533]">A-05 [VAC]</div>
              <div className="p-2 rounded-xs bg-[#15803D]/15 text-[#15803D] border border-[#15803D]/30 font-bold">A-06 [24P]</div>
            </div>
          </div>

          {/* RACK B */}
          <div className="p-3.5 rounded-sm bg-[#FBFAF5] dark:bg-[#181D1C] border border-[#DDD9CF] dark:border-[#2B3533] space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-[#DDD9CF] dark:border-[#2B3533]">
              <strong className="text-[#1A1F1D] dark:text-[#F2F4F3]">RACK BAY B (BULK PALLET)</strong>
              <span className="text-[10px] text-[#166534] dark:text-[#15803D] font-bold">60% OCCUPIED</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
              <div className="p-2 rounded-xs bg-[#15803D]/15 text-[#15803D] border border-[#15803D]/30 font-bold">B-01 [32P]</div>
              <div className="p-2 rounded-xs bg-[#EAE7DC] dark:bg-[#252D2B] text-[#5D6560] border border-[#DDD9CF] dark:border-[#2B3533]">B-02 [VAC]</div>
              <div className="p-2 rounded-xs bg-[#15803D]/15 text-[#15803D] border border-[#15803D]/30 font-bold">B-03 [32P]</div>
              <div className="p-2 rounded-xs bg-[#15803D]/15 text-[#15803D] border border-[#15803D]/30 font-bold">B-04 [32P]</div>
              <div className="p-2 rounded-xs bg-[#EAE7DC] dark:bg-[#252D2B] text-[#5D6560] border border-[#DDD9CF] dark:border-[#2B3533]">B-05 [VAC]</div>
              <div className="p-2 rounded-xs bg-[#EAE7DC] dark:bg-[#252D2B] text-[#5D6560] border border-[#DDD9CF] dark:border-[#2B3533]">B-06 [VAC]</div>
            </div>
          </div>

          {/* RACK C / QC HOLD */}
          <div className="p-3.5 rounded-sm bg-[#FBFAF5] dark:bg-[#181D1C] border border-[#DDD9CF] dark:border-[#2B3533] space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-[#DDD9CF] dark:border-[#2B3533]">
              <strong className="text-[#DC2626]">QUARANTINE / QC HOLD</strong>
              <span className="text-[10px] text-[#DC2626] font-bold">8 LPNS HELD</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
              <div className="p-2 rounded-xs bg-[#DC2626]/15 text-[#DC2626] border border-[#DC2626]/30 font-bold">QC-01 [8P]</div>
              <div className="p-2 rounded-xs bg-[#DC2626]/15 text-[#DC2626] border border-[#DC2626]/30 font-bold">QC-02 [7P]</div>
              <div className="p-2 rounded-xs bg-[#EAE7DC] dark:bg-[#252D2B] text-[#5D6560] border border-[#DDD9CF] dark:border-[#2B3533]">QC-03 [VAC]</div>
              <div className="p-2 rounded-xs bg-[#EAE7DC] dark:bg-[#252D2B] text-[#5D6560] border border-[#DDD9CF] dark:border-[#2B3533]">QC-04 [VAC]</div>
              <div className="p-2 rounded-xs bg-[#EAE7DC] dark:bg-[#252D2B] text-[#5D6560] border border-[#DDD9CF] dark:border-[#2B3533]">QC-05 [VAC]</div>
              <div className="p-2 rounded-xs bg-[#EAE7DC] dark:bg-[#252D2B] text-[#5D6560] border border-[#DDD9CF] dark:border-[#2B3533]">QC-06 [VAC]</div>
            </div>
          </div>
        </div>
      </PaperSheet>

      {/* LPN TRACKER TABLE */}
      <PaperSheet variant="default" className="p-4 sm:p-6 space-y-4">
        <SectionHeader
          title="License Plate Number (LPN) Inventory Registry"
          subtitle="Click any LPN record to view chain-of-custody movement logs and pallet details"
          icon={Boxes}
        />

        <div className="overflow-x-auto rounded-sm border border-[#DDD9CF] dark:border-[#2B3533]">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#DDD9CF] dark:border-[#2B3533] bg-[#F3F1E8] dark:bg-[#1E2423] text-[10px] uppercase text-[#8A908B] dark:text-[#707A76]">
                <th className="p-2.5 font-semibold">LPN ID</th>
                <th className="p-2.5 font-semibold">PO Number</th>
                <th className="p-2.5 font-semibold">Item SKU Description</th>
                <th className="p-2.5 font-semibold text-right">Pallet Qty</th>
                <th className="p-2.5 font-semibold">Storage Location</th>
                <th className="p-2.5 font-semibold">Status</th>
                <th className="p-2.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD9CF]/60 dark:divide-[#2B3533]/60 bg-[#FBFAF5] dark:bg-[#181D1C]">
              {filteredLpns.map((lpn) => {
                const isStored = lpn.status === 'STORED';
                const isQc = lpn.status === 'QC_HOLD';

                return (
                  <tr
                    key={lpn.id}
                    onClick={() => setSelectedLpn(lpn)}
                    className="hover:bg-[#F3F1E8]/60 dark:hover:bg-[#1E2423]/60 cursor-pointer transition-colors"
                  >
                    <td className="p-2.5 font-bold text-[#166534] dark:text-[#15803D]">
                      {lpn.id}
                    </td>
                    <td className="p-2.5 font-bold text-[#1A1F1D] dark:text-[#F2F4F3]">
                      {lpn.po}
                    </td>
                    <td className="p-2.5 font-sans font-medium text-[#1A1F1D] dark:text-[#F2F4F3]">
                      {lpn.item}
                    </td>
                    <td className="p-2.5 text-right font-bold text-[#5D6560] dark:text-[#A3ACA8]">
                      {lpn.pallets} Pallets
                    </td>
                    <td className="p-2.5 font-bold text-[#1A1F1D] dark:text-[#F2F4F3]">
                      {lpn.location}
                    </td>
                    <td className="p-2.5">
                      <span className={`px-1.5 py-0.2 rounded-xs text-[9px] font-bold ${
                        isStored
                          ? 'bg-[#15803D]/15 text-[#15803D]'
                          : isQc
                          ? 'bg-[#DC2626]/15 text-[#DC2626]'
                          : 'bg-[#2563EB]/15 text-[#2563EB]'
                      }`}>
                        {lpn.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLpn(lpn);
                        }}
                        className="text-[#166534] dark:text-[#15803D] hover:underline font-semibold"
                      >
                        Inspect →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </PaperSheet>

      {/* LPN DETAIL DRAWER */}
      <LPNDetailSheet
        lpn={selectedLpn}
        isOpen={Boolean(selectedLpn)}
        onClose={() => setSelectedLpn(null)}
      />
    </div>
  );
}
