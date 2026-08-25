import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, ROLES, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
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
  const canUseAi = [ROLES.ADMIN, ROLES.PROCUREMENT].includes(currentRole);

  return (
    <div className="cogniyard-app flex min-h-screen bg-zinc-50 text-left text-zinc-900 antialiased dark:bg-black dark:text-zinc-100">
      <Sidebar mobileOpen={mobileNavigationOpen} onClose={() => setMobileNavigationOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <Navbar onOpenNavigation={() => setMobileNavigationOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-zinc-50/70 dark:bg-zinc-950">
          <Routes>
            <Route path="/" element={<ProtectedRoute><RoleHome /></ProtectedRoute>} />
            <Route path="/supplier" element={<ProtectedRoute allowedRoles={[ROLES.SUPPLIER]}><SupplierPortal /></ProtectedRoute>} />
            <Route path="/control-tower" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><ExecutiveControlTower /></ProtectedRoute>} />
            <Route path="/exceptions" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><ExceptionCenter /></ProtectedRoute>} />
            <Route path="/inventory-planning" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><InventoryPlanning /></ProtectedRoute>} />
            <Route path="/vision" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><SmartCCTV /></ProtectedRoute>} />
            <Route path="/procurement" element={<ProtectedRoute allowedRoles={[ROLES.PROCUREMENT, ROLES.ADMIN]}><ProcurementPage /></ProtectedRoute>} />
            <Route path="/logistics" element={<ProtectedRoute allowedRoles={[ROLES.WAREHOUSE, ROLES.ADMIN]}><LogisticsPage mode="verification" /></ProtectedRoute>} />
            <Route path="/yard-simulation" element={<ProtectedRoute allowedRoles={[ROLES.WAREHOUSE, ROLES.ADMIN]}><LogisticsPage mode="simulation" /></ProtectedRoute>} />
            <Route path="/finance" element={<ProtectedRoute allowedRoles={[ROLES.FINANCE, ROLES.ADMIN]}><FinancePage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><AdminPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Floating AI Assistant Drawer */}
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
