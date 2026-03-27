/**
 * Servicio para gestionar cotizaciones en Supabase
 * Momenti Dashboard - Módulo de Cotizaciones
 */

import { supabase } from '../supabaseClient';

/**
 * Calcula el score de una cotización según múltiples factores
 * @param {number} total - Total de la cotización
 * @param {string} tipoCliente - Tipo de cliente
 * @param {string} tiempoEntrega - Tiempo de entrega estimado
 * @param {number} itemsCount - Cantidad de items en la cotización
 * @returns {number} Score entre 0 y 100
 */
export const calcularScore = (total, tipoCliente, tiempoEntrega, itemsCount = 0) => {
  let score = 0;

  // Por ticket
  if (total >= 20000) score += 30;
  else if (total >= 10000) score += 25;
  else if (total >= 5000) score += 20;
  else score += 10;

  // Por tipo de cliente
  if (tipoCliente === 'EVENTO_CORPORATIVO') score += 15;
  else if (tipoCliente === 'NEGOCIO_NUEVO') score += 10;
  else if (tipoCliente === 'REVENDEDOR') score += 5;

  // Por urgencia
  if (tiempoEntrega && (tiempoEntrega.includes('24') || tiempoEntrega.includes('48') || tiempoEntrega.toLowerCase().includes('express'))) {
    score += 15;
  } else if (tiempoEntrega && tiempoEntrega.includes('3-5')) {
    score += 10;
  }

  // Por cantidad de items
  if (itemsCount >= 5) score += 10;
  else if (itemsCount >= 3) score += 5;

  return Math.min(score, 100);
};

/**
 * Obtener todas las cotizaciones con filtros opcionales
 * @param {Object} filters - Filtros opcionales (status, fechaInicio, fechaFin, search)
 * @returns {Promise<Array>} Array de cotizaciones
 */
export const obtenerCotizaciones = async (filters = {}) => {
  try {
    let query = supabase
      .from('cotizaciones')
      .select('*')
      .order('fecha_creacion', { ascending: false });

    // Filtrar por status
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    // Filtrar por rango de fechas
    if (filters.fechaInicio) {
      query = query.gte('fecha_creacion', filters.fechaInicio);
    }
    if (filters.fechaFin) {
      query = query.lte('fecha_creacion', filters.fechaFin);
    }

    // Búsqueda por nombre de cliente o folio
    if (filters.search) {
      query = query.or(`cliente_nombre.ilike.%${filters.search}%,folio.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error al obtener cotizaciones:', error);
    throw error;
  }
};

/**
 * Obtener una cotización por ID con sus items
 * @param {string} id - ID de la cotización
 * @returns {Promise<Object>} Cotización con items
 */
export const obtenerCotizacionPorId = async (id) => {
  try {
    // Obtener cotización
    const { data: cotizacion, error: errorCot } = await supabase
      .from('cotizaciones')
      .select('*')
      .eq('id', id)
      .single();

    if (errorCot) throw errorCot;

    // Obtener items
    const { data: items, error: errorItems } = await supabase
      .from('cotizacion_items')
      .select('*')
      .eq('cotizacion_id', id)
      .order('numero_item', { ascending: true });

    if (errorItems) throw errorItems;

    return {
      ...cotizacion,
      items: items || []
    };
  } catch (error) {
    console.error('Error al obtener cotización:', error);
    throw error;
  }
};

/**
 * Crear una nueva cotización con sus items
 * @param {Object} cotizacion - Datos de la cotización
 * @param {Array} items - Array de items de la cotización
 * @returns {Promise<Object>} Cotización creada
 */
export const crearCotizacion = async (cotizacion, items) => {
  try {
    // Calcular score
    const score = calcularScore(
      cotizacion.total,
      cotizacion.tipo_cliente,
      cotizacion.tiempo_entrega,
      items.length
    );

    // Obtener usuario actual (opcional, puede ser null)
    const { data: { user } } = await supabase.auth.getUser();

    console.log('📝 Creando cotización con datos:', { 
      ...cotizacion, 
      score, 
      user: user?.id || 'No autenticado' 
    });

    // Crear cotización
    const { data: nuevaCotizacion, error: errorCot } = await supabase
      .from('cotizaciones')
      .insert([{
        ...cotizacion,
        score,
        creado_por: user?.id || null
      }])
      .select()
      .single();

    if (errorCot) {
      console.error('❌ Error al insertar cotización:', errorCot);
      console.error('Detalles del error:', {
        message: errorCot.message,
        details: errorCot.details,
        hint: errorCot.hint,
        code: errorCot.code
      });
      throw new Error(`Error al crear cotización: ${errorCot.message || JSON.stringify(errorCot)}`);
    }

    console.log('✅ Cotización creada:', nuevaCotizacion);

    // Crear items
    const itemsConId = items.map((item, index) => ({
      ...item,
      cotizacion_id: nuevaCotizacion.id,
      numero_item: index + 1
    }));

    console.log('📝 Creando items:', itemsConId);

    const { data: nuevosItems, error: errorItems } = await supabase
      .from('cotizacion_items')
      .insert(itemsConId)
      .select();

    if (errorItems) {
      console.error('❌ Error al insertar items:', errorItems);
      console.error('Detalles del error:', {
        message: errorItems.message,
        details: errorItems.details,
        hint: errorItems.hint,
        code: errorItems.code
      });
      throw new Error(`Error al crear items: ${errorItems.message || JSON.stringify(errorItems)}`);
    }

    console.log('✅ Items creados:', nuevosItems);

    return {
      ...nuevaCotizacion,
      items: nuevosItems
    };
  } catch (error) {
    console.error('❌ Error general al crear cotización:', error);
    throw error;
  }
};

/**
 * Actualizar una cotización existente
 * @param {string} id - ID de la cotización
 * @param {Object} cotizacion - Datos actualizados de la cotización
 * @param {Array} items - Array actualizado de items
 * @returns {Promise<Object>} Cotización actualizada
 */
export const actualizarCotizacion = async (id, cotizacion, items) => {
  try {
    // Recalcular score
    const score = calcularScore(
      cotizacion.total,
      cotizacion.tipo_cliente,
      cotizacion.tiempo_entrega,
      items.length
    );

    // Actualizar cotización
    const { data: cotizacionActualizada, error: errorCot } = await supabase
      .from('cotizaciones')
      .update({
        ...cotizacion,
        score
      })
      .eq('id', id)
      .select()
      .single();

    if (errorCot) throw errorCot;

    // Eliminar items anteriores
    const { error: errorDelete } = await supabase
      .from('cotizacion_items')
      .delete()
      .eq('cotizacion_id', id);

    if (errorDelete) throw errorDelete;

    // Crear nuevos items
    const itemsConId = items.map((item, index) => ({
      ...item,
      cotizacion_id: id,
      numero_item: index + 1
    }));

    const { data: nuevosItems, error: errorItems } = await supabase
      .from('cotizacion_items')
      .insert(itemsConId)
      .select();

    if (errorItems) throw errorItems;

    return {
      ...cotizacionActualizada,
      items: nuevosItems
    };
  } catch (error) {
    console.error('Error al actualizar cotización:', error);
    throw error;
  }
};

/**
 * Actualizar solo el status de una cotización
 * @param {string} id - ID de la cotización
 * @param {string} status - Nuevo status
 * @returns {Promise<Object>} Cotización actualizada
 */
export const actualizarStatus = async (id, status) => {
  try {
    const { data, error } = await supabase
      .from('cotizaciones')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al actualizar status:', error);
    throw error;
  }
};

/**
 * Agregar nota de seguimiento a una cotización
 * @param {string} id - ID de la cotización
 * @param {string} nota - Texto de la nota
 * @param {Date} fechaSeguimiento - Fecha del próximo seguimiento (opcional)
 * @returns {Promise<Object>} Cotización actualizada
 */
export const agregarNotaSeguimiento = async (id, nota, fechaSeguimiento = null) => {
  try {
    const { data: cotizacion } = await supabase
      .from('cotizaciones')
      .select('notas')
      .eq('id', id)
      .single();

    const notasActuales = cotizacion?.notas || '';
    const timestamp = new Date().toLocaleString('es-MX');
    const nuevaNota = `[${timestamp}] ${nota}`;
    const notasActualizadas = notasActuales 
      ? `${notasActuales}\n${nuevaNota}` 
      : nuevaNota;

    const updateData = { notas: notasActualizadas };
    if (fechaSeguimiento) {
      updateData.fecha_seguimiento = fechaSeguimiento;
    }

    const { data, error } = await supabase
      .from('cotizaciones')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al agregar nota:', error);
    throw error;
  }
};

/**
 * Eliminar una cotización
 * @param {string} id - ID de la cotización
 * @returns {Promise<void>}
 */
export const eliminarCotizacion = async (id) => {
  try {
    const { error } = await supabase
      .from('cotizaciones')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error al eliminar cotización:', error);
    throw error;
  }
};

/**
 * Duplicar una cotización existente
 * @param {string} id - ID de la cotización a duplicar
 * @returns {Promise<Object>} Nueva cotización creada
 */
export const duplicarCotizacion = async (id) => {
  try {
    const cotizacionOriginal = await obtenerCotizacionPorId(id);
    
    const { items, id: _, folio: __, creado_por: ___, actualizado_en: ____, fecha_creacion: _____, ...datosCotizacion } = cotizacionOriginal;
    
    // Crear nueva cotización con status COTIZADO
    const nuevaCotizacion = {
      ...datosCotizacion,
      status: 'COTIZADO',
      notas: `Duplicada de ${cotizacionOriginal.folio}\n` + (datosCotizacion.notas || '')
    };

    return await crearCotizacion(nuevaCotizacion, items);
  } catch (error) {
    console.error('Error al duplicar cotización:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas generales de cotizaciones
 * @param {number} mes - Mes para filtrar (1-12, opcional)
 * @param {number} anio - Año para filtrar (opcional)
 * @returns {Promise<Object>} Estadísticas
 */
export const obtenerEstadisticas = async (mes = null, anio = null) => {
  try {
    let query = supabase.from('cotizaciones').select('*');

    // Filtrar por mes y año si se proporcionan
    if (mes && anio) {
      const fechaInicio = new Date(anio, mes - 1, 1).toISOString();
      const fechaFin = new Date(anio, mes, 0, 23, 59, 59).toISOString();
      query = query.gte('fecha_creacion', fechaInicio).lte('fecha_creacion', fechaFin);
    } else if (anio) {
      const fechaInicio = new Date(anio, 0, 1).toISOString();
      const fechaFin = new Date(anio, 11, 31, 23, 59, 59).toISOString();
      query = query.gte('fecha_creacion', fechaInicio).lte('fecha_creacion', fechaFin);
    }

    const { data, error } = await query;
    if (error) throw error;

    const cotizaciones = data || [];
    const total = cotizaciones.length;
    const cerradas = cotizaciones.filter(c => c.status === 'CERRADO').length;
    const enProceso = cotizaciones.filter(c => c.status === 'EN_PROCESO').length;
    const perdidas = cotizaciones.filter(c => c.status === 'PERDIDO').length;
    const cotizadas = cotizaciones.filter(c => c.status === 'COTIZADO').length;

    const valorTotal = cotizaciones.reduce((sum, c) => sum + parseFloat(c.total || 0), 0);
    const valorPromedio = total > 0 ? valorTotal / total : 0;
    const tasaConversion = total > 0 ? (cerradas / total) * 100 : 0;

    // Cotizaciones pendientes de seguimiento
    const ahora = new Date();
    const pendientesSeguimiento = cotizaciones.filter(c => 
      c.fecha_seguimiento && new Date(c.fecha_seguimiento) <= ahora && 
      (c.status === 'COTIZADO' || c.status === 'EN_PROCESO')
    ).length;

    return {
      total,
      cerradas,
      enProceso,
      perdidas,
      cotizadas,
      valorTotal,
      valorPromedio,
      tasaConversion,
      pendientesSeguimiento
    };
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    throw error;
  }
};

/**
 * Obtener servicios más cotizados
 * @returns {Promise<Array>} Array de servicios con estadísticas
 */
export const obtenerServiciosMasCotizados = async () => {
  try {
    const { data, error } = await supabase
      .from('cotizacion_items')
      .select('tipo_servicio, total');

    if (error) throw error;

    // Agrupar por tipo de servicio
    const servicios = {};
    (data || []).forEach(item => {
      const tipo = item.tipo_servicio || 'OTRO';
      if (!servicios[tipo]) {
        servicios[tipo] = {
          tipo: tipo,
          cantidad: 0,
          valorTotal: 0
        };
      }
      servicios[tipo].cantidad++;
      servicios[tipo].valorTotal += parseFloat(item.total || 0);
    });

    // Convertir a array y ordenar
    return Object.values(servicios).sort((a, b) => b.cantidad - a.cantidad);
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    throw error;
  }
};

/**
 * Obtener top clientes por valor de cotizaciones
 * @param {number} limit - Cantidad de clientes a retornar
 * @returns {Promise<Array>} Array de clientes
 */
export const obtenerTopClientes = async (limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('cotizaciones')
      .select('cliente_nombre, total, status');

    if (error) throw error;

    // Agrupar por cliente
    const clientes = {};
    (data || []).forEach(cot => {
      const nombre = cot.cliente_nombre;
      if (!clientes[nombre]) {
        clientes[nombre] = {
          nombre,
          totalCotizaciones: 0,
          valorTotal: 0,
          cerradas: 0
        };
      }
      clientes[nombre].totalCotizaciones++;
      clientes[nombre].valorTotal += parseFloat(cot.total || 0);
      if (cot.status === 'CERRADO') {
        clientes[nombre].cerradas++;
      }
    });

    // Convertir a array, ordenar y limitar
    return Object.values(clientes)
      .sort((a, b) => b.valorTotal - a.valorTotal)
      .slice(0, limit);
  } catch (error) {
    console.error('Error al obtener top clientes:', error);
    throw error;
  }
};

/**
 * Obtener mensaje personalizado según tipo de cliente
 * @param {string} tipoCliente - Tipo de cliente
 * @returns {string} Mensaje personalizado
 */
export const obtenerMensajePersonalizado = (tipoCliente) => {
  const mensajes = {
    'NEGOCIO_NUEVO': '¿Abriendo un negocio en Chihuahua? Te resolvemos TODA tu imagen publicitaria en un solo lugar - desde tarjetas hasta lonas, DTF y grabado láser. Sin vueltas, sin demoras.',
    'EVENTO_CORPORATIVO': 'Soluciones completas para tu evento o congreso. Gafetes, lonas, posters, señalética - todo en un solo proveedor. Entregas rápidas, calidad garantizada.',
    'REVENDEDOR': 'Proveedor confiable de DTF textil y UV DTF para tu negocio. Precios mayoreo, entregas puntuales, calidad consistente. Hacemos crecer tu negocio juntos.',
    'CLIENTE_FINAL': 'Soluciones profesionales de imprenta y publicidad en Chihuahua. Desde diseño hasta instalación, todo bajo un mismo techo. ¡Hagamos realidad tu proyecto!'
  };

  return mensajes[tipoCliente] || mensajes['CLIENTE_FINAL'];
};

/**
 * Obtener condiciones comerciales default
 * @returns {string} Condiciones en formato texto
 */
export const obtenerCondicionesDefault = () => {
  return `• Forma de pago: 50% anticipo, 50% contra entrega
• Métodos de pago: Efectivo, transferencia bancaria, tarjeta
• Diseño incluido en precio (hasta 2 revisiones)
• Entregas en sucursal sin costo
• Envíos foráneos con costo adicional
• Los precios no incluyen IVA
• Esta cotización tiene una vigencia de 5 días hábiles`;
};
