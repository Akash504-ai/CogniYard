import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, ROLES, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import BinderSpine from './components/layout/BinderSpine';
import Navbar from './components/Navbar';
import CommandPalette from './components/layout/CommandPalette';
import AIAssistantModal from './components/AIAssistantModal';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import ProcurementPage from './pages/ProcurementPage';
import LogisticsPage from './pages/LogisticsPage';
import FinancePage from './pages/FinancePage';
import AdminPage from './pages/AdminPage';
import ExecutiveControlTower from './pages/ExecutiveControlTower';
import ExceptionCenter from './pages/ExceptionCenter';
import InventoryPlanning from './pages/InventoryPlanning';
import SmartCCTV from './pages/SmartCCTV';
import SupplierPortal from './pages/SupplierPortal';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'google-sign-in-disabled.apps.googleusercontent.com';

function RoleHome() {
  const { currentRole } = useAuth();
  if (currentRole === ROLES.SUPPLIER) return <Navigate to="/supplier" replace />;
  return <Dashboard />;
}

function AuthenticatedLayout() {
  const { currentRole } = useAuth();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const canUseAi = [ROLES.ADMIN, ROLES.PROCUREMENT, ROLES.WAREHOUSE, ROLES.FINANCE].includes(currentRole);

  return (
    <div className="cogniyard-app flex min-h-screen bg-[#F5F1E9] text-left text-[#1C201E] antialiased dark:bg-[#161D1B] dark:text-[#F5F7F6]">

      {/* 1. Sidebar with Controlled Collapse */}
      <Sidebar
        isOpen={mobileNavigationOpen}
        onClose={() => setMobileNavigationOpen(false)}
        collapsed={isSidebarCollapsed}
        setCollapsed={setIsSidebarCollapsed}
      />

      {/* 2. Physical Binder Spine attached directly next to Sidebar */}
      <BinderSpine collapsed={isSidebarCollapsed} />

      {/* 3. Main Workspace with dynamic padding */}
      <div className={`flex-1 flex flex-col min-w-0 relative z-10 transition-all duration-200 ${isSidebarCollapsed ? 'lg:pl-[88px]' : 'lg:pl-[280px]'
        }`}>
        <Navbar
          onMenuClick={() => setMobileNavigationOpen(true)}
          onOpenCommand={() => setCommandPaletteOpen(true)}
        />

        <main className="flex-1 overflow-y-auto bg-[#F5F1E9] dark:bg-[#161D1B]">
          <Routes>
            <Route path="/" element={<ProtectedRoute allowedRoles={[ROLES.PROCUREMENT, ROLES.WAREHOUSE, ROLES.FINANCE, ROLES.ADMIN]}><RoleHome /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={[ROLES.PROCUREMENT, ROLES.WAREHOUSE, ROLES.FINANCE, ROLES.ADMIN]}><RoleHome /></ProtectedRoute>} />
            <Route path="/procurement" element={<ProtectedRoute allowedRoles={[ROLES.PROCUREMENT, ROLES.ADMIN]}><ProcurementPage /></ProtectedRoute>} />
            <Route path="/logistics" element={<ProtectedRoute allowedRoles={[ROLES.WAREHOUSE, ROLES.ADMIN]}><LogisticsPage mode="verification" /></ProtectedRoute>} />
            <Route path="/yard-simulation" element={<ProtectedRoute allowedRoles={[ROLES.WAREHOUSE, ROLES.ADMIN]}><LogisticsPage mode="simulation" /></ProtectedRoute>} />
            <Route path="/finance" element={<ProtectedRoute allowedRoles={[ROLES.FINANCE, ROLES.ADMIN]}><FinancePage /></ProtectedRoute>} />
            <Route path="/supplier" element={<ProtectedRoute allowedRoles={[ROLES.SUPPLIER, ROLES.ADMIN]}><SupplierPortal /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><AdminPage /></ProtectedRoute>} />
            <Route path="/control-tower" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><ExecutiveControlTower /></ProtectedRoute>} />
            <Route path="/exceptions" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><ExceptionCenter /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.WAREHOUSE]}><InventoryPlanning /></ProtectedRoute>} />
            <Route path="/cctv" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.WAREHOUSE]}><SmartCCTV /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      {canUseAi && <AIAssistantModal />}
    </div>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected Application Routes */}
              <Route path="/*" element={<AuthenticatedLayout />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
