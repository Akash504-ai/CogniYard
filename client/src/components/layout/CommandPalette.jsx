import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  CornerDownLeft,
  Command,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { currentRole, setIsAiOpen } = useAuth();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // ============================================================
  // MOCK DOMAIN RECORDS
  // ============================================================

  const mockRecords = [
    {
      type: 'TRUCK',
      id: 'TRK-WB25AB1234',
      title: 'Tata Prima 40T',
      meta: 'In Yard • Stall 02',
      path: '/yard-simulation',
      category: 'Logistics',
    },
    {
      type: 'TRUCK',
      id: 'TRK-WB11CD5678',
      title: 'Ashok Leyland',
      meta: 'Docked • D-01',
      path: '/yard-simulation',
      category: 'Logistics',
    },
    {
      type: 'PO',
      id: 'PO-78342',
      title: 'Acme Steel Pvt Ltd',
      meta: '500 Industrial Bearings',
      path: '/procurement',
      category: 'Procurement',
    },
    {
      type: 'PO',
      id: 'PO-4001',
      title: 'TechCorp Solutions',
      meta: '100 High-Speed Motors',
      path: '/procurement',
      category: 'Procurement',
    },
    {
      type: 'LPN',
      id: 'LPN-0004521',
      title: 'YARD-A-05',
      meta: '24 Pallets',
      path: '/inventory-planning',
      category: 'Inventory',
    },
    {
      type: 'LPN',
      id: 'LPN-458762',
      title: 'DOCK-02',
      meta: '16 Pallets • QC Hold',
      path: '/inventory-planning',
      category: 'Inventory',
    },
    {
      type: 'INVOICE',
      id: 'INV-8810',
      title: '₹1,41,600',
      meta: '3-Way Match Pending',
      path: '/finance',
      category: 'Finance',
    },
    {
      type: 'INVOICE',
      id: 'INV-9901',
      title: '₹85,000',
      meta: 'Matched • Ready for Payment',
      path: '/finance',
      category: 'Finance',
    },
    {
      type: 'DOCK',
      id: 'DOCK-02',
      title: 'Unloading Bay',
      meta: 'Receiving PO-4001',
      path: '/logistics',
      category: 'Logistics',
    },
    {
      type: 'SUPPLIER',
      id: 'SUP-ACME',
      title: 'Acme Steel Pvt Ltd',
      meta: 'OTD: 94%',
      path: '/admin',
      category: 'Administration',
    },
  ];

  // ============================================================
  // QUICK NAVIGATION
  // ============================================================

  const quickPages = [
    {
      name: 'Command Center',
      description: 'Operational overview',
      path: '/',
      icon: Boxes,
    },
    {
      name: 'Yard & Logistics',
      description: 'Vehicles, docks & movement',
      path: '/logistics',
      icon: Truck,
    },
    {
      name: 'Yard Simulation Twin',
      description: 'Live yard visualization',
      path: '/yard-simulation',
      icon: Route,
    },
    {
      name: 'Purchase Orders',
      description: 'PRs & procurement',
      path: '/procurement',
      icon: FileText,
    },
    {
      name: '3-Way Match & Invoices',
      description: 'Finance & payments',
      path: '/finance',
      icon: Receipt,
    },
    {
      name: 'Exception Center',
      description: 'Operational exceptions',
      path: '/exceptions',
      icon: ShieldCheck,
    },
    {
      name: 'Inventory & LPN',
      description: 'Stock & locations',
      path: '/inventory-planning',
      icon: Boxes,
    },
  ];

  // ============================================================
  // FILTERING
  // ============================================================

  const filteredRecords = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return mockRecords.slice(0, 6);
    }

    return mockRecords.filter((record) =>
      [
        record.id,
        record.title,
        record.meta,
        record.category,
        record.type,
      ].some((value) => value.toLowerCase().includes(normalized))
    );
  }, [query]);

  // ============================================================
  // FOCUS INPUT
  // ============================================================

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
      return;
    }

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 40);

    return () => clearTimeout(timer);
  }, [isOpen]);

  // ============================================================
  // RESET SELECTION WHEN SEARCH CHANGES
  // ============================================================

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // ============================================================
  // KEYBOARD NAVIGATION
  // ============================================================

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();

        const maxIndex = filteredRecords.length - 1;

        setSelectedIndex((current) =>
          current >= maxIndex ? 0 : current + 1
        );

        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();

        const maxIndex = filteredRecords.length - 1;

        setSelectedIndex((current) =>
          current <= 0 ? maxIndex : current - 1
        );

        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();

        const selected = filteredRecords[selectedIndex];

        if (selected) {
          handleSelect(selected.path);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isOpen,
    filteredRecords,
    selectedIndex,
    onClose,
  ]);

  // ============================================================
  // GLOBAL CMD / CTRL + K
  // ============================================================

  useEffect(() => {
    const handleShortcut = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();

        if (isOpen) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleShortcut);

    return () => {
      window.removeEventListener('keydown', handleShortcut);
    };
  }, [isOpen, onClose]);

  // ============================================================
  // NAVIGATION
  // ============================================================

  const handleSelect = (path) => {
    onClose();
    navigate(path);
  };

  // ============================================================
  // ICONS
  // ============================================================

  const getRecordIcon = (type) => {
    switch (type) {
      case 'TRUCK':
        return Truck;
      case 'PO':
        return FileText;
      case 'LPN':
        return Boxes;
      case 'INVOICE':
        return Receipt;
      case 'SUPPLIER':
        return Building2;
      case 'DOCK':
        return Route;
      default:
        return Search;
    }
  };

  const getRecordAccent = (type) => {
    switch (type) {
      case 'TRUCK':
        return {
          icon: 'text-sky-600 dark:text-sky-400',
          bg: 'bg-sky-500/10 dark:bg-sky-400/10',
        };

      case 'PO':
        return {
          icon: 'text-amber-600 dark:text-amber-400',
          bg: 'bg-amber-500/10 dark:bg-amber-400/10',
        };

      case 'LPN':
        return {
          icon: 'text-violet-600 dark:text-violet-400',
          bg: 'bg-violet-500/10 dark:bg-violet-400/10',
        };

      case 'INVOICE':
        return {
          icon: 'text-emerald-600 dark:text-emerald-400',
          bg: 'bg-emerald-500/10 dark:bg-emerald-400/10',
        };

      case 'SUPPLIER':
        return {
          icon: 'text-orange-600 dark:text-orange-400',
          bg: 'bg-orange-500/10 dark:bg-orange-400/10',
        };

      case 'DOCK':
        return {
          icon: 'text-cyan-600 dark:text-cyan-400',
          bg: 'bg-cyan-500/10 dark:bg-cyan-400/10',
        };

      default:
        return {
          icon: 'text-[#166534] dark:text-[#4ade80]',
          bg: 'bg-[#166534]/10 dark:bg-[#4ade80]/10',
        };
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="
        fixed inset-0 z-[100]
        flex items-start justify-center
        pt-[10vh] sm:pt-[13vh]
        px-4
        bg-[#07100d]/45
        dark:bg-black/65
        backdrop-blur-[3px]
        animate-in fade-in duration-150
      "
      onMouseDown={onClose}
    >
      {/* ========================================================
          COMMAND WINDOW
      ========================================================= */}

      <div
        className="
          w-full max-w-[720px]
          overflow-hidden
          rounded-xl
          border
          border-[#D8D5CB]
          dark:border-[#303936]
          bg-[#FCFBF7]
          dark:bg-[#151A18]
          text-[#1A1F1D]
          dark:text-[#F2F4F3]
          shadow-[0_24px_80px_rgba(0,0,0,.28)]
          dark:shadow-[0_28px_90px_rgba(0,0,0,.65)]
          animate-in
          fade-in
          zoom-in-[0.98]
          slide-in-from-top-2
          duration-150
        "
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* ======================================================
            TOP SEARCH AREA
        ======================================================= */}

        <div
          className="
            relative
            flex items-center
            gap-3
            px-4
            h-[62px]
            border-b
            border-[#DDD9CF]
            dark:border-[#2B3533]
            bg-[#F7F5EE]
            dark:bg-[#1B211F]
          "
        >
          {/* Left glow */}
          <div
            className="
              absolute
              left-0 top-0 bottom-0
              w-[3px]
              bg-[#166534]
              dark:bg-[#4ade80]
              opacity-80
            "
          />

          <Search
            className="
              w-[19px] h-[19px]
              text-[#68716C]
              dark:text-[#87918C]
              shrink-0
            "
          />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search operational data..."
            className="
              flex-1
              min-w-0
              bg-transparent
              border-none
              outline-none
              ring-0
              text-[14px]
              font-medium
              text-[#1A1F1D]
              dark:text-[#F2F4F3]
              placeholder-[#969B97]
              dark:placeholder-[#6F7874]
            "
          />

          {/* Keyboard hint */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span
              className="
                inline-flex items-center gap-1
                px-2 py-1
                rounded-md
                border
                border-[#D4D1C8]
                dark:border-[#343C39]
                bg-white/60
                dark:bg-[#202624]
                text-[10px]
                font-mono
                font-medium
                text-[#6D746F]
                dark:text-[#929B96]
              "
            >
              <Command className="w-3 h-3" />
              K
            </span>

            <button
              type="button"
              onClick={onClose}
              className="
                p-1.5
                rounded-md
                text-[#8A908B]
                hover:text-[#1A1F1D]
                dark:hover:text-white
                hover:bg-black/5
                dark:hover:bg-white/5
                transition-colors
              "
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ======================================================
            SEARCH CONTEXT
        ======================================================= */}

        {query && (
          <div
            className="
              flex items-center
              justify-between
              px-4 py-2
              border-b
              border-[#E4E1D8]
              dark:border-[#272E2C]
              bg-[#FBFAF5]
              dark:bg-[#181D1C]
            "
          >
            <div className="flex items-center gap-2">
              <span
                className="
                  w-1.5 h-1.5
                  rounded-full
                  bg-[#166534]
                  dark:bg-[#4ade80]
                "
              />

              <span
                className="
                  text-[10px]
                  font-mono
                  font-bold
                  uppercase
                  tracking-wider
                  text-[#747B77]
                  dark:text-[#7F8984]
                "
              >
                Search results
              </span>
            </div>

            <span
              className="
                text-[10px]
                font-mono
                text-[#969B97]
                dark:text-[#68716D]
              "
            >
              {filteredRecords.length} found
            </span>
          </div>
        )}

        {/* ======================================================
            RESULTS
        ======================================================= */}

        <div
          ref={resultsRef}
          className="
            max-h-[430px]
            overflow-y-auto
            overscroll-contain
            p-3
          "
        >
          {/* ====================================================
              OPERATIONAL ENTITIES
          ===================================================== */}

          <div>
            {!query && (
              <div className="flex items-center justify-between px-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="
                      text-[10px]
                      font-bold
                      font-mono
                      uppercase
                      tracking-[0.12em]
                      text-[#707873]
                      dark:text-[#7D8782]
                    "
                  >
                    Recent operational entities
                  </span>

                  <span
                    className="
                      text-[9px]
                      font-mono
                      px-1.5 py-0.5
                      rounded
                      bg-[#EAE7DC]
                      dark:bg-[#252D2B]
                      text-[#737A75]
                      dark:text-[#89928E]
                    "
                  >
                    {filteredRecords.length}
                  </span>
                </div>

                <ChevronDown
                  className="
                    w-3.5 h-3.5
                    text-[#9CA19D]
                    dark:text-[#66706B]
                  "
                />
              </div>
            )}

            {filteredRecords.length > 0 ? (
              <div className="space-y-1">
                {filteredRecords.map((item, index) => {
                  const ItemIcon = getRecordIcon(item.type);
                  const accent = getRecordAccent(item.type);
                  const isSelected = index === selectedIndex;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => handleSelect(item.path)}
                      className={`
                        relative
                        w-full
                        flex items-center
                        gap-3
                        p-2.5
                        rounded-lg
                        text-left
                        border
                        transition-all
                        duration-100
                        ${
                          isSelected
                            ? `
                              bg-[#F1EFE7]
                              dark:bg-[#202724]
                              border-[#D6D2C7]
                              dark:border-[#39413E]
                            `
                            : `
                              bg-transparent
                              border-transparent
                              hover:bg-[#F5F3EC]
                              dark:hover:bg-[#1C2220]
                            `
                        }
                      `}
                    >
                      {/* Active indicator */}
                      <span
                        className={`
                          absolute
                          left-0
                          top-2.5
                          bottom-2.5
                          w-[2px]
                          rounded-r
                          transition-opacity
                          ${
                            isSelected
                              ? 'opacity-100 bg-[#166534] dark:bg-[#4ade80]'
                              : 'opacity-0'
                          }
                        `}
                      />

                      {/* Entity icon */}
                      <span
                        className={`
                          flex items-center justify-center
                          w-9 h-9
                          rounded-lg
                          shrink-0
                          ${accent.bg}
                        `}
                      >
                        <ItemIcon
                          className={`
                            w-[17px] h-[17px]
                            ${accent.icon}
                          `}
                        />
                      </span>

                      {/* Entity information */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="
                              font-mono
                              text-[12px]
                              font-bold
                              tracking-tight
                              text-[#202623]
                              dark:text-[#F0F3F1]
                            "
                          >
                            {item.id}
                          </span>

                          <span
                            className="
                              hidden xs:inline-flex
                              text-[9px]
                              font-mono
                              font-semibold
                              tracking-wide
                              px-1.5 py-0.5
                              rounded
                              bg-[#E9E6DC]
                              dark:bg-[#292F2D]
                              text-[#737A75]
                              dark:text-[#929A96]
                            "
                          >
                            {item.type}
                          </span>
                        </div>

                        <div
                          className="
                            flex items-center
                            gap-1.5
                            mt-1
                            min-w-0
                          "
                        >
                          <span
                            className="
                              text-[11px]
                              font-medium
                              text-[#555E59]
                              dark:text-[#A3ACA8]
                              truncate
                            "
                          >
                            {item.title}
                          </span>

                          <span
                            className="
                              text-[#B1B4B0]
                              dark:text-[#505956]
                            "
                          >
                            •
                          </span>

                          <span
                            className="
                              text-[10px]
                              text-[#858C88]
                              dark:text-[#747E79]
                              truncate
                            "
                          >
                            {item.meta}
                          </span>
                        </div>
                      </div>

                      {/* Category + arrow */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="
                            hidden md:block
                            text-[9px]
                            font-mono
                            text-[#969C98]
                            dark:text-[#66706C]
                          "
                        >
                          {item.category}
                        </span>

                        <ArrowRight
                          className={`
                            w-4 h-4
                            transition-all
                            ${
                              isSelected
                                ? 'opacity-100 translate-x-0 text-[#166534] dark:text-[#4ade80]'
                                : 'opacity-0 -translate-x-1'
                            }
                          `}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* ==================================================
                 EMPTY STATE
              ================================================== */

              <div
                className="
                  flex flex-col
                  items-center
                  justify-center
                  py-12
                  px-6
                "
              >
                <div
                  className="
                    flex items-center justify-center
                    w-11 h-11
                    rounded-xl
                    bg-[#F0EEE6]
                    dark:bg-[#202624]
                    mb-3
                  "
                >
                  <Search
                    className="
                      w-5 h-5
                      text-[#8B918D]
                      dark:text-[#707A76]
                    "
                  />
                </div>

                <p
                  className="
                    text-sm
                    font-semibold
                    text-[#424A46]
                    dark:text-[#D2D7D4]
                  "
                >
                  No operational records found
                </p>

                <p
                  className="
                    mt-1
                    text-[11px]
                    text-center
                    text-[#8A908B]
                    dark:text-[#737D78]
                  "
                >
                  Try searching by PO, LPN, truck, invoice or supplier ID.
                </p>

                <div
                  className="
                    mt-4
                    px-2.5 py-1
                    rounded-md
                    bg-[#F2F0E8]
                    dark:bg-[#222926]
                    font-mono
                    text-[10px]
                    text-[#7B827E]
                    dark:text-[#7C8681]
                  "
                >
                  "{query}"
                </div>
              </div>
            )}
          </div>

          {/* ====================================================
              QUICK WORKSPACES
          ===================================================== */}

          {!query && (
            <div
              className="
                mt-4
                pt-3
                border-t
                border-[#E0DDD4]
                dark:border-[#2A312E]
              "
            >
              <div className="flex items-center justify-between px-2 mb-2">
                <span
                  className="
                    text-[10px]
                    font-bold
                    font-mono
                    uppercase
                    tracking-[0.12em]
                    text-[#707873]
                    dark:text-[#7D8782]
                  "
                >
                  Operational workspaces
                </span>

                <Sparkles
                  className="
                    w-3.5 h-3.5
                    text-[#A18D52]
                    dark:text-[#B9A66A]
                  "
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {quickPages.map((page) => {
                  const PageIcon = page.icon;

                  return (
                    <button
                      key={page.path}
                      type="button"
                      onClick={() => handleSelect(page.path)}
                      className="
                        group
                        flex items-center
                        gap-2.5
                        p-2.5
                        rounded-lg
                        text-left
                        border
                        border-transparent
                        hover:border-[#DDD9CF]
                        dark:hover:border-[#303936]
                        hover:bg-[#F5F3EC]
                        dark:hover:bg-[#1D2421]
                        transition-all
                      "
                    >
                      <span
                        className="
                          flex items-center justify-center
                          w-8 h-8
                          rounded-md
                          bg-[#ECEAE1]
                          dark:bg-[#242B28]
                          group-hover:bg-[#E4E2D8]
                          dark:group-hover:bg-[#2B332F]
                          transition-colors
                        "
                      >
                        <PageIcon
                          className="
                            w-4 h-4
                            text-[#52605A]
                            dark:text-[#A2ACA7]
                          "
                        />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p
                          className="
                            text-[11px]
                            font-semibold
                            text-[#444C48]
                            dark:text-[#D0D5D2]
                            truncate
                          "
                        >
                          {page.name}
                        </p>

                        <p
                          className="
                            text-[9px]
                            text-[#929893]
                            dark:text-[#727C77]
                            truncate
                            mt-0.5
                          "
                        >
                          {page.description}
                        </p>
                      </div>

                      <ArrowRight
                        className="
                          w-3.5 h-3.5
                          opacity-0
                          -translate-x-1
                          group-hover:opacity-100
                          group-hover:translate-x-0
                          text-[#166534]
                          dark:text-[#4ade80]
                          transition-all
                        "
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ======================================================
            FOOTER
        ======================================================= */}

        <div
          className="
            flex items-center justify-between
            px-4
            h-[38px]
            border-t
            border-[#DDD9CF]
            dark:border-[#2B3533]
            bg-[#F5F3EC]
            dark:bg-[#1B211F]
          "
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span
                className="
                  inline-flex items-center justify-center
                  min-w-[20px] h-[18px]
                  px-1
                  rounded
                  border
                  border-[#D4D1C8]
                  dark:border-[#343C39]
                  bg-white/50
                  dark:bg-[#222826]
                  text-[9px]
                  font-mono
                  text-[#737A75]
                  dark:text-[#929A96]
                "
              >
                ↑
              </span>

              <span
                className="
                  inline-flex items-center justify-center
                  min-w-[20px] h-[18px]
                  px-1
                  rounded
                  border
                  border-[#D4D1C8]
                  dark:border-[#343C39]
                  bg-white/50
                  dark:bg-[#222826]
                  text-[9px]
                  font-mono
                  text-[#737A75]
                  dark:text-[#929A96]
                "
              >
                ↓
              </span>

              <span
                className="
                  text-[9px]
                  text-[#858C88]
                  dark:text-[#727C77]
                  ml-1
                "
              >
                Navigate
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-1">
              <span
                className="
                  inline-flex items-center justify-center
                  min-w-[24px] h-[18px]
                  px-1
                  rounded
                  border
                  border-[#D4D1C8]
                  dark:border-[#343C39]
                  bg-white/50
                  dark:bg-[#222826]
                  text-[9px]
                  font-mono
                  text-[#737A75]
                  dark:text-[#929A96]
                "
              >
                <CornerDownLeft className="w-3 h-3" />
              </span>

              <span
                className="
                  text-[9px]
                  text-[#858C88]
                  dark:text-[#727C77]
                "
              >
                Open
              </span>
            </div>
          </div>

          <span
            className="
              hidden sm:block
              text-[9px]
              font-mono
              tracking-wide
              text-[#929893]
              dark:text-[#68716D]
            "
          >
            COGNIYARD OS · v2.4
          </span>
        </div>
      </div>
    </div>
  );
}