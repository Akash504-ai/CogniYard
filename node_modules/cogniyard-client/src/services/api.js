import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

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
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
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
  verifyGateIdentity: (truckId, data) => api.post(`/trucks/${truckId}/gate-verification`, data),
  proceedThroughGate: (truckId) => api.post(`/trucks/${truckId}/gate-proceed`),
  simulateMovement: () => api.post('/trucks/simulate'),
  simulateDelay: (truckId, data) => api.post(`/trucks/${truckId}/delay`, data),
  getSimulationState: () => api.get('/trucks/simulation/state'),
  startSimulation: (speed) => api.post('/trucks/simulation/start', { speed }),
  pauseSimulation: () => api.post('/trucks/simulation/pause'),
  resetSimulation: () => api.post('/trucks/simulation/reset'),
  setSimulationSpeed: (speed) => api.post('/trucks/simulation/speed', { speed }),
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
  getReadyPurchaseOrders: () => api.get('/invoices/ready-purchase-orders'),
  triggerMatch: (id) => api.post(`/invoices/${id}/match`),
  deleteInvoice: (id) => api.delete(`/invoices/${id}`),
  getPayments: () => api.get('/payments'),
  updatePaymentStatus: (id, status) => api.patch(`/payments/${id}/status`, { status }),
  deletePayment: (id) => api.delete(`/payments/${id}`),
};

export const supplierAPI = {
  getAll: () => api.get('/admin/suppliers'),
  create: (data) => api.post('/admin/suppliers', data),
  update: (id, data) => api.patch(`/admin/suppliers/${id}`, data),
  setStatus: (id, status) => api.patch(`/admin/suppliers/${id}/status`, { status }),
  remove: (id) => api.delete(`/admin/suppliers/${id}`),
  getProfile: () => api.get('/supplier/profile'),
  getPurchaseOrders: () => api.get('/supplier/purchase-orders'),
  getInvoices: () => api.get('/supplier/invoices'),
  generateInvoice: (poNumber, data = {}) => api.post(`/supplier/invoices/generate/${poNumber}`, data),
  uploadInvoice: (formData) => api.post('/supplier/invoices/upload', formData),
  updateInvoice: (id, formData) => api.patch(`/supplier/invoices/${id}`, formData),
  submitInvoice: (id) => api.post(`/supplier/invoices/${id}/submit`),
};

export const aiAPI = {
  chat: (message, confirmed = false, params = null, chatHistory = []) => api.post('/ai/chat', { message, confirmed, params, chatHistory }),
};

export const analyticsAPI = {
  getAnalytics: () => api.get('/analytics'),
  getControlTower: () => api.get('/analytics/control-tower'),
};

export const exceptionAPI = {
  getExceptions: () => api.get('/exceptions'),
  getExceptionById: (id) => api.get(`/exceptions/${id}`),
  acknowledgeException: (id) => api.patch(`/exceptions/${id}/acknowledge`),
  resolveException: (id, resolutionNote) => api.patch(`/exceptions/${id}/resolve`, { resolutionNote }),
};

export const inventoryPlanningAPI = {
  getSummary: () => api.get('/inventory-planning/summary'),
  getProducts: () => api.get('/inventory-planning/products'),
  getProductById: (id) => api.get(`/inventory-planning/products/${id}`),
};

export const visionAPI = {
  getCameras: () => api.get('/vision/cameras'),
  getStatus: () => api.get('/vision/status'),
  getDetections: (id) => api.get(`/vision/cameras/${id || 'CAM-01'}`),
  getEvents: () => api.get('/vision/events'),
  getAlerts: () => api.get('/vision/alerts'),
  getCongestion: () => api.get('/vision/congestion'),
  createEvent: (data) => api.post('/vision/events', data)
};

export default api;
