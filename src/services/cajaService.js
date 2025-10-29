import { supabase } from '../supabaseClient.js';

export const cajaService = {
  // ===== MOVIMIENTOS =====
  async getMovimientos(filtros = {}) {
    let query = supabase
      .from('movimientos_caja')
      .select('*, categoria:categorias_caja(nombre)')
      .order('fecha', { ascending: false });
    
    if (filtros.fechaInicio) {
      query = query.gte('fecha', filtros.fechaInicio);
    }
    if (filtros.fechaFin) {
      query = query.lte('fecha', filtros.fechaFin);
    }
    if (filtros.tipo) {
      query = query.eq('tipo', filtros.tipo);
    }
    if (filtros.categoria_id) {
      query = query.eq('categoria_id', filtros.categoria_id);
    }
    if (filtros.metodo_pago) {
      query = query.eq('metodo_pago', filtros.metodo_pago);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createMovimiento(movimiento) {
    const { data, error } = await supabase
      .from('movimientos_caja')
      .insert({
        ...movimiento,
        usuario_id: (await supabase.auth.getUser()).data.user?.id
      })
      .select('*, categoria:categorias_caja(nombre)');
    
    if (error) throw error;
    return data[0];
  },

  async updateMovimiento(id, movimiento) {
    const { data, error } = await supabase
      .from('movimientos_caja')
      .update(movimiento)
      .eq('id', id)
      .select('*, categoria:categorias_caja(nombre)');
    
    if (error) throw error;
    return data[0];
  },

  async deleteMovimiento(id) {
    const { error } = await supabase
      .from('movimientos_caja')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  // ===== RESUMEN Y ESTADÍSTICAS =====
  async getResumen(fechaInicio, fechaFin) {
    const { data, error } = await supabase
      .from('movimientos_caja')
      .select('tipo, monto')
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin);
    
    if (error) throw error;
    
    const ingresos = data?.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + Number(m.monto), 0) || 0;
    const gastos = data?.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + Number(m.monto), 0) || 0;
    
    return { 
      ingresos, 
      gastos, 
      balance: ingresos - gastos,
      totalMovimientos: data?.length || 0
    };
  },

  async getResumenPorCategoria(fechaInicio, fechaFin, tipo = null) {
    let query = supabase
      .from('movimientos_caja')
      .select('monto, categoria:categorias_caja(nombre)')
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin);
    
    if (tipo) {
      query = query.eq('tipo', tipo);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    const resumen = {};
    data?.forEach(mov => {
      const categoria = mov.categoria?.nombre || 'Sin categoría';
      resumen[categoria] = (resumen[categoria] || 0) + Number(mov.monto);
    });
    
    return resumen;
  },

  async getResumenPorMetodoPago(fechaInicio, fechaFin) {
    const { data, error } = await supabase
      .from('movimientos_caja')
      .select('metodo_pago, monto')
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin);
    
    if (error) throw error;
    
    const resumen = {};
    data?.forEach(mov => {
      const metodo = mov.metodo_pago || 'No especificado';
      resumen[metodo] = (resumen[metodo] || 0) + Number(mov.monto);
    });
    
    return resumen;
  },

  // ===== CORTES DE CAJA =====
  async getUltimoCorte() {
    const { data, error } = await supabase
      .from('cortes_caja')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data;
  },

  async realizarCorte(corteData) {
    // Obtener el último corte para el saldo inicial
    const ultimoCorte = await this.getUltimoCorte();
    const saldoInicial = ultimoCorte?.saldo_calculado || 0;
    
    // Calcular totales del periodo
    const resumen = await this.getResumen(corteData.fecha_inicio, corteData.fecha_fin);
    
    // Calcular valores del corte
    const saldoCalculado = saldoInicial + resumen.ingresos - resumen.gastos;
    const diferencia = corteData.efectivo_contado - saldoCalculado;
    
    const corteCompleto = {
      ...corteData,
      saldo_inicial: saldoInicial,
      total_ingresos: resumen.ingresos,
      total_gastos: resumen.gastos,
      diferencia: diferencia,
      usuario_id: (await supabase.auth.getUser()).data.user?.id
    };
    
    const { data, error } = await supabase
      .from('cortes_caja')
      .insert(corteCompleto)
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async getCortes(filtros = {}) {
    let query = supabase
      .from('cortes_caja')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (filtros.fechaInicio) {
      query = query.gte('fecha_inicio', filtros.fechaInicio);
    }
    if (filtros.fechaFin) {
      query = query.lte('fecha_fin', filtros.fechaFin);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getCorteDetalle(id) {
    const { data, error } = await supabase
      .from('cortes_caja')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // ===== CATEGORÍAS =====
  async getCategorias(tipo = null) {
    let query = supabase
      .from('categorias_caja')
      .select('*')
      .eq('activa', true)
      .order('nombre');
    
    if (tipo) {
      query = query.or(`tipo.eq.${tipo},tipo.eq.ambos`);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createCategoria(categoria) {
    const { data, error } = await supabase
      .from('categorias_caja')
      .insert({
        ...categoria,
        es_sistema: false
      })
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async updateCategoria(id, categoria) {
    const { data, error } = await supabase
      .from('categorias_caja')
      .update(categoria)
      .eq('id', id)
      .eq('es_sistema', false) // Solo permitir editar categorías no del sistema
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async toggleCategoriaActiva(id, activa) {
    const { data, error } = await supabase
      .from('categorias_caja')
      .update({ activa })
      .eq('id', id)
      .eq('es_sistema', false) // Solo permitir editar categorías no del sistema
      .select();
    
    if (error) throw error;
    return data[0];
  },

  // ===== UTILIDADES =====
  formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  },

  formatDate(date) {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  },

  formatDateOnly(date) {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(date));
  },

  // Función para obtener rango de fechas comunes
  getRangoFechas(tipo) {
    const ahora = new Date();
    let inicio, fin;
    
    switch (tipo) {
      case 'hoy':
        inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
        fin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59);
        break;
      case 'ayer':
        const ayer = new Date(ahora);
        ayer.setDate(ayer.getDate() - 1);
        inicio = new Date(ayer.getFullYear(), ayer.getMonth(), ayer.getDate());
        fin = new Date(ayer.getFullYear(), ayer.getMonth(), ayer.getDate(), 23, 59, 59);
        break;
      case 'semana':
        const inicioSemana = new Date(ahora);
        inicioSemana.setDate(ahora.getDate() - ahora.getDay());
        inicio = new Date(inicioSemana.getFullYear(), inicioSemana.getMonth(), inicioSemana.getDate());
        fin = ahora;
        break;
      case 'mes':
        inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        fin = ahora;
        break;
      case 'mesAnterior':
        const mesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
        inicio = mesAnterior;
        fin = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59);
        break;
      default:
        inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
        fin = ahora;
    }
    
    return {
      inicio: inicio.toISOString(),
      fin: fin.toISOString()
    };
  }
};