// Utility helpers for reading current user and role from localStorage
export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('currentUser');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAdmin() {
  const u = getCurrentUser();
  // Criterios para determinar si es admin
  return !!(u && (
    u.role === 'admin' || 
    u.role === 'superadmin' ||
    u.id === 'local-admin' ||
    u.username === 'admin' ||
    u.email === 'admin@momenti.com' ||
    u.email?.includes('admin')
  ));
}

export function hasRole(role) {
  const u = getCurrentUser();
  return !!(u && u.role === role);
}

export default { getCurrentUser, isAdmin, hasRole };
