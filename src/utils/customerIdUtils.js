// Utilities para generar IDs de clientes de exactamente 3 dígitos (100-999)
import { supabase } from '../supabaseClient';

// Generar ID aleatorio de 3 dígitos
export const generate3DigitId = async () => {
  const maxAttempts = 100;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generar número entre 100 y 999
    const newId = Math.floor(Math.random() * 900 + 100).toString();
    
    try {
      // Verificar si el ID ya existe
      const { data, error } = await supabase
        .from('customers_')
        .select('id')
        .eq('id', newId)
        .single();
      
      // Si no existe (error), el ID está disponible
      if (error && error.code === 'PGRST116') {
        return newId;
      }
      
      // Si existe, continuar el loop para generar otro
      if (data) {
        continue;
      }
      
    } catch (err) {
      console.warn('Error verificando ID:', err);
      continue;
    }
  }
  
  throw new Error('No se pudo generar un ID único después de ' + maxAttempts + ' intentos');
};

// Función original actualizada para 3 dígitos exactos
export async function getNextCustomerId(supabase, fallbackBase = 100) {
  try {
    // Obtener todos los IDs existentes
    const { data, error } = await supabase
      .from('customers_')
      .select('id')
      .limit(1000);

    if (error) {
      console.error('getNextCustomerId supabase error:', error);
      return { next: fallbackBase, nextStr: String(fallbackBase) };
    }

    const ids = (data || []).map(d => String(d.id || '').trim()).filter(Boolean);
    
    // Extraer solo IDs que sean exactamente 3 dígitos (100-999)
    const validIds = ids
      .map(Number)
      .filter(n => Number.isFinite(n) && n >= 100 && n <= 999);

    if (validIds.length === 0) {
      return { next: fallbackBase, nextStr: String(fallbackBase) };
    }

    // Encontrar el siguiente ID disponible
    for (let id = 100; id <= 999; id++) {
      if (!validIds.includes(id)) {
        return { next: id, nextStr: String(id) };
      }
    }

    // Si todos están ocupados, usar generador aleatorio
    return { next: await generate3DigitId(), nextStr: await generate3DigitId() };
    
  } catch (err) {
    console.error('getNextCustomerId unexpected error:', err);
    return { next: fallbackBase, nextStr: String(fallbackBase) };
  }
}

// Función para validar que un ID sea de 3 dígitos
export const isValid3DigitId = (id) => {
  const idStr = String(id);
  return /^\d{3}$/.test(idStr) && parseInt(idStr) >= 100 && parseInt(idStr) <= 999;
};

// Función para formatear ID (asegurar que sea string de 3 dígitos)
export const format3DigitId = (id) => {
  const idNum = parseInt(id);
  if (idNum >= 100 && idNum <= 999) {
    return idNum.toString();
  }
  throw new Error('ID debe estar entre 100 y 999');
};
