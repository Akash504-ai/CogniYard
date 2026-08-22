import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cogniyard_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response Interceptor: Auto-logout on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('cogniyard_token');
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  googleAuth: (payload) => api.post('/auth/google', payload),
  getMe: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
  updateUserRole: (id, role) => api.patch(`/auth/users/${id}/role`, { role }),
  toggleUserStatus: (id, isActive) => api.patch(`/auth/users/${id}/status`, { isActive }),
};

export const procurementAPI = {
  getProducts: () => api.get('/products'),
  createProduct: (data) => api.post('/products', data),
  getSuppliers: () => api.get('/suppliers'),
  evaluateSuppliers: (params) => api.get('/suppliers/evaluate', { params }),
  getRequisitions: () => api.get('/requisitions'),
  createRequisition: (data) => api.post('/requisitions', data),
  approveRequisition: (id) => api.patch(`/requisitions/${id}/approve`),
  getPurchaseOrders: () => api.get('/purchase-orders'),
  createPurchaseOrder: (data) => api.post('/purchase-orders', data),
  getPOByNumber: (poNumber) => api.get(`/purchase-orders/${poNumber}`),
};

export const logisticsAPI = {
  getTrucks: () => api.get('/trucks'),
  updateTruckStatus: (truckId, data) => api.patch(`/trucks/${truckId}`, data),
  simulateMovement: () => api.post('/trucks/simulate'),
  simulateDelay: (truckId) => api.post(`/trucks/${truckId}/delay`),
  getDocks: () => api.get('/docks'),
  recommendDock: (truckId) => api.get(`/docks/recommend/${truckId}`),
  assignDock: (data) => api.post('/docks/assign', data),
  releaseDock: (data) => api.post('/docks/release', data),
  getASNs: () => api.get('/asn'),
  createASN: (data) => api.post('/asn', data),
  getGoodsReceipts: () => api.get('/receiving'),
  processReceiving: (data) => api.post('/receiving', data),
  getInventory: () => api.get('/inventory'),
};

export const financeAPI = {
  getInvoices: () => api.get('/invoices'),
  createInvoice: (data) => api.post('/invoices', data),
  triggerMatch: (id) => api.post(`/invoices/${id}/match`),
  deleteInvoice: (id) => api.delete(`/invoices/${id}`),
  getPayments: () => api.get('/payments'),
  updatePaymentStatus: (id, status) => api.patch(`/payments/${id}/status`, { status }),
  deletePayment: (id) => api.delete(`/payments/${id}`),
};

export const aiAPI = {
  chat: (message) => api.post('/ai/chat', { message }),
};

export const analyticsAPI = {
  getAnalytics: () => api.get('/analytics'),
};

export default api;
