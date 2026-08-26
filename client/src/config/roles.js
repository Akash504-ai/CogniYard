export const ROLES = {
  PROCUREMENT: 'procurement_manager',
  WAREHOUSE: 'warehouse_manager',
  FINANCE: 'finance_user',
  ADMIN: 'admin',
  SUPPLIER: 'supplier'
};

export const ROLE_LABELS = {
  [ROLES.PROCUREMENT]: 'Procurement Manager',
  [ROLES.WAREHOUSE]: 'Warehouse & Dock Manager',
  [ROLES.FINANCE]: 'Finance & AP User',
  [ROLES.ADMIN]: 'System Administrator',
  [ROLES.SUPPLIER]: 'Supplier Partner'
};

/**
 * Route Permission Matrix
 * Maps every application path to the roles authorized to access it.
 */
export const ROUTE_PERMISSIONS = {
  '/': [ROLES.PROCUREMENT, ROLES.WAREHOUSE, ROLES.FINANCE, ROLES.ADMIN],
  '/dashboard': [ROLES.PROCUREMENT, ROLES.WAREHOUSE, ROLES.FINANCE, ROLES.ADMIN],
  '/procurement': [ROLES.PROCUREMENT, ROLES.ADMIN],
  '/logistics': [ROLES.WAREHOUSE, ROLES.ADMIN],
  '/yard-simulation': [ROLES.WAREHOUSE, ROLES.ADMIN],
  '/finance': [ROLES.FINANCE, ROLES.ADMIN],
  '/supplier': [ROLES.SUPPLIER, ROLES.ADMIN],
  '/admin': [ROLES.ADMIN],
  '/control-tower': [ROLES.ADMIN],
  '/exceptions': [ROLES.ADMIN],
  '/inventory': [ROLES.ADMIN, ROLES.WAREHOUSE],
  '/cctv': [ROLES.ADMIN, ROLES.WAREHOUSE]
};

/**
 * Default landing route for each role after authentication.
 */
export const ROLE_DEFAULT_ROUTE = {
  [ROLES.PROCUREMENT]: '/',
  [ROLES.WAREHOUSE]: '/',
  [ROLES.FINANCE]: '/',
  [ROLES.ADMIN]: '/',
  [ROLES.SUPPLIER]: '/supplier'
};

/**
 * Helper to check if a user role can access a given path.
 */
export function canAccessPath(role, path) {
  if (!role) return false;
  const cleanPath = path.split('?')[0].split('#')[0];
  const allowed = ROUTE_PERMISSIONS[cleanPath];
  if (!allowed) return true; // Unspecified routes fall back to protected handler
  return allowed.includes(role);
}
