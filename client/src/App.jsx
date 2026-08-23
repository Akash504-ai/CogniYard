import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, ROLES } from './context/AuthContext';
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

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '672280661412-7vt6i4tb7gulv95t2ueskl2p39f9je93.apps.googleusercontent.com';

function AuthenticatedLayout() {
  return (
    <div className="flex min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans antialiased transition-colors">
      {/* Persistent Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/control-tower" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><ExecutiveControlTower /></ProtectedRoute>} />
            <Route path="/exceptions" element={<ProtectedRoute><ExceptionCenter /></ProtectedRoute>} />
            <Route path="/inventory-planning" element={<ProtectedRoute><InventoryPlanning /></ProtectedRoute>} />
            <Route path="/procurement" element={<ProtectedRoute allowedRoles={[ROLES.PROCUREMENT, ROLES.ADMIN]}><ProcurementPage /></ProtectedRoute>} />
            <Route path="/logistics" element={<ProtectedRoute allowedRoles={[ROLES.WAREHOUSE, ROLES.ADMIN]}><LogisticsPage /></ProtectedRoute>} />
            <Route path="/finance" element={<ProtectedRoute allowedRoles={[ROLES.FINANCE, ROLES.ADMIN]}><FinancePage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><AdminPage /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>

      {/* Floating AI Assistant Drawer */}
      <AIAssistantModal />
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
