import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Search,
  Calendar,
  Bell,
  Menu,
  ChevronDown,
  Sun,
  Moon
} from 'lucide-react';

export default function Navbar({ onMenuClick, onOpenCommand }) {
  const { currentUser, currentRole } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  const currentDateFormatted = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  const getPageHeader = () => {
    const path = location.pathname;

    if (path === '/' || path === '/dashboard') {
      if (currentRole === ROLES.PROCUREMENT) {
        return {
          title: 'PROCUREMENT & SUPPLY INTELLIGENCE',
          subtitle: 'Requisitions, supplier performance scorecards, and spend analytics'
        };
      }
      if (currentRole === ROLES.FINANCE) {
        return {
          title: 'FINANCE & 3-WAY MATCH AP',
          subtitle: 'Invoice reconciliation, tolerance thresholds, and disbursement queue'
        };
      }
      return {
        title: 'YARD & WAREHOUSE CONTROL',
        subtitle: 'Real-time visibility of yard, docks, pallets and LPNs'
      };
    }

    if (path.startsWith('/procurement')) {
      return {
        title: 'PROCUREMENT & PURCHASE ORDERS',
        subtitle: 'Requisition pipeline, vendor scoring, and PO dispatch'
      };
    }

    if (path.startsWith('/logistics')) {
      return {
        title: 'GATE RECEIVING & GOODS RECEIPT (GRN)',
        subtitle: 'Inbound OCR plate verification, dock allocation, and inventory intake'
      };
    }

    if (path.startsWith('/yard-simulation')) {
      return {
        title: 'INTELLIGENT TRUCK & YARD SIMULATION',
        subtitle: 'Real-time fleet simulation, dock allocation, and live telemetry'
      };
    }

    if (path.startsWith('/finance')) {
      return {
        title: 'FINANCE & 3-WAY MATCH STUDIO',
        subtitle: 'PO ↔ GRN ↔ Invoice automated reconciliation and payment settlement'
      };
    }

    if (path.startsWith('/supplier')) {
      return {
        title: 'SUPPLIER PARTNER PORTAL',
        subtitle: 'Purchase orders, automated invoice generation, and Cloudinary documents'
      };
    }

    if (path.startsWith('/admin')) {
      return {
        title: 'SYSTEM GOVERNANCE & MASTER DATA',
        subtitle: 'Supplier certification, user management, and system audits'
      };
    }

    if (path.startsWith('/control-tower')) {
      return {
        title: 'EXECUTIVE CONTROL TOWER',
        subtitle: 'End-to-end 10-node supply chain telemetry and velocity'
      };
    }

    if (path.startsWith('/exceptions')) {
      return {
        title: 'OPERATIONAL EXCEPTION DESK',
        subtitle: 'Automated variance triage, resolution workflows, and audit logs'
      };
    }

    if (path.startsWith('/inventory')) {
      return {
        title: 'INVENTORY & WAREHOUSE STORAGE',
        subtitle: 'Storage bins, safety stock levels, and replenishment planning'
      };
    }

    if (path.startsWith('/cctv')) {
      return {
        title: 'SMART CCTV & COMPUTER VISION',
        subtitle: 'Multi-camera AI detection matrix and facility surveillance'
      };
    }

    return {
      title: 'YARD & WAREHOUSE CONTROL',
      subtitle: 'Real-time visibility of yard, docks, pallets and LPNs'
    };
  };

  const { title, subtitle } = getPageHeader();

  return (
    <header className="sticky top-0 z-20 bg-[#F5F1E9] dark:bg-[#161D1B] border-b border-[#E3DDD1] dark:border-[#2B3835] px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
      
      {/* LEFT: Mobile Menu Button + Page Context Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="p-1.5 rounded-sm border border-[#E3DDD1] bg-[#FCFAF4] text-[#1C201E] lg:hidden hover:bg-[#F4EFE6]"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="hidden sm:block">
          <h1 className="font-handwriting text-2xl sm:text-3xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6] leading-none">
            {title}
          </h1>
          <p className="text-[11px] text-[#68716D] dark:text-[#8E9C97] mt-0.5 font-sans">
            {subtitle}
          </p>
        </div>
      </div>

      {/* RIGHT: Search Pill + Date Picker + Notification Bell + User Avatar */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Global Omnibox Search Pill */}
        <button
          type="button"
          onClick={onOpenCommand}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] text-xs text-[#68716D] dark:text-[#8E9C97] hover:border-[#15803D] hover:text-[#1C201E] transition-colors shadow-2xs"
        >
          <Search className="w-3.5 h-3.5 text-[#8E9793]" />
          <span className="hidden md:inline font-sans text-xs">Search LPN / PO / Truck / Pallet ID</span>
          <span className="md:hidden font-sans text-xs">Search...</span>
          <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#F4EFE6] dark:bg-[#222D2B] text-[#68716D] border border-[#E3DDD1] dark:border-[#2B3835]">
            ⌘K
          </kbd>
        </button>

        {/* Date Selector Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] text-xs font-sans text-[#1C201E] dark:text-[#F5F7F6] shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-[#8E9793]" />
          <span>{currentDateFormatted}</span>
          <ChevronDown className="w-3 h-3 text-[#8E9793]" />
        </div>

        {/* Notification Bell with Badge */}
        {/* <div className="relative">
          <button
            type="button"
            className="p-1.5 rounded-full bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] text-[#68716D] hover:text-[#1C201E] transition-colors shadow-2xs"
          >
            <Bell className="w-4 h-4" />
          </button>
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#D97706] text-white text-[9px] font-mono font-bold">
            12
          </span>
        </div> */}

        {/* Dark / Light Mode Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-1.5 rounded-full bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] text-[#68716D] dark:text-[#8E9C97] hover:text-[#15803D] dark:hover:text-[#22C55E] hover:border-[#15803D] dark:hover:border-[#22C55E] transition-colors shadow-2xs flex items-center justify-center"
          title={isDark ? 'Switch to Light Operations Mode' : 'Switch to Dark Operations Mode'}
          aria-label="Toggle Theme"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-[#F59E0B]" />
          ) : (
            <Moon className="w-4 h-4 text-[#4A524E]" />
          )}
        </button>

        {/* User Initials Avatar */}
        {/* <div className="w-7 h-7 rounded-full bg-[#1C201E] text-white flex items-center justify-center text-xs font-mono font-bold border border-white/20 shadow-xs">
          {currentUser?.name?.slice(0, 2).toUpperCase() || 'PM'}
        </div> */}
      </div>
    </header>
  );
}
