// Utilidades para el manejo de cortes de caja

// Formatear moneda mexicana
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
};

// Calcular el total de un conjunto de denominaciones
export const calculateTotal = (denominations) => {
  return denominations.reduce((total, denom) => {
    const quantity = parseInt(denom.quantity) || 0;
    const value = parseFloat(denom.value) || 0;
    return total + (quantity * value);
  }, 0);
};

// Generar UUID simple para desarrollo
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Obtener usuario actual (desarrollo)
export const getCurrentUser = () => {
  return localStorage.getItem('currentUser') || 'Sistema';
};

// Formatear fecha para mostrar
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Formatear fecha corta
export const formatDateShort = (date) => {
  return new Date(date).toLocaleDateString('es-MX');
};