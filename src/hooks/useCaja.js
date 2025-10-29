import { useState, useEffect, useCallback } from 'react';
import { cajaService } from '../services/cajaService.js';

export const useCaja = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cortes, setCortes] = useState([]);
  const [resumen, setResumen] = useState({
    ingresos: 0,
    gastos: 0,
    balance: 0,
    totalMovimientos: 0
  });
  const [filtros, setFiltros] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ===== MOVIMIENTOS =====
  const cargarMovimientos = useCallback(async (filtrosCustom = {}) => {
    try {
      setLoading(true);
      setError(null);
      const filtrosFinales = { ...filtros, ...filtrosCustom };
      const data = await cajaService.getMovimientos(filtrosFinales);
      setMovimientos(data);
    } catch (err) {
      setError('Error al cargar movimientos: ' + err.message);
      console.error('Error cargando movimientos:', err);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  const agregarMovimiento = async (movimientoData) => {
    try {
      setLoading(true);
      setError(null);
      const nuevoMovimiento = await cajaService.createMovimiento(movimientoData);
      setMovimientos(prev => [nuevoMovimiento, ...prev]);
      await cargarResumen(); // Actualizar resumen
      return nuevoMovimiento;
    } catch (err) {
      setError('Error al agregar movimiento: ' + err.message);
      console.error('Error agregando movimiento:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const actualizarMovimiento = async (id, movimientoData) => {
    try {
      setLoading(true);
      setError(null);
      const movimientoActualizado = await cajaService.updateMovimiento(id, movimientoData);
      setMovimientos(prev => 
        prev.map(mov => mov.id === id ? movimientoActualizado : mov)
      );
      await cargarResumen(); // Actualizar resumen
      return movimientoActualizado;
    } catch (err) {
      setError('Error al actualizar movimiento: ' + err.message);
      console.error('Error actualizando movimiento:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const eliminarMovimiento = async (id) => {
    try {
      setLoading(true);
      setError(null);
      await cajaService.deleteMovimiento(id);
      setMovimientos(prev => prev.filter(mov => mov.id !== id));
      await cargarResumen(); // Actualizar resumen
    } catch (err) {
      setError('Error al eliminar movimiento: ' + err.message);
      console.error('Error eliminando movimiento:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ===== RESUMEN =====
  const cargarResumen = useCallback(async (fechaInicio = null, fechaFin = null) => {
    try {
      // Si no se proporcionan fechas, usar el día actual
      if (!fechaInicio || !fechaFin) {
        const rango = cajaService.getRangoFechas('hoy');
        fechaInicio = rango.inicio;
        fechaFin = rango.fin;
      }
      
      const data = await cajaService.getResumen(fechaInicio, fechaFin);
      setResumen(data);
    } catch (err) {
      setError('Error al cargar resumen: ' + err.message);
      console.error('Error cargando resumen:', err);
    }
  }, []);

  // ===== CATEGORIAS =====
  const cargarCategorias = useCallback(async (tipo = null) => {
    try {
      const data = await cajaService.getCategorias(tipo);
      setCategorias(data);
    } catch (err) {
      setError('Error al cargar categorías: ' + err.message);
      console.error('Error cargando categorías:', err);
    }
  }, []);

  const agregarCategoria = async (categoriaData) => {
    try {
      setLoading(true);
      setError(null);
      const nuevaCategoria = await cajaService.createCategoria(categoriaData);
      setCategorias(prev => [...prev, nuevaCategoria]);
      return nuevaCategoria;
    } catch (err) {
      setError('Error al agregar categoría: ' + err.message);
      console.error('Error agregando categoría:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const actualizarCategoria = async (id, categoriaData) => {
    try {
      setLoading(true);
      setError(null);
      const categoriaActualizada = await cajaService.updateCategoria(id, categoriaData);
      setCategorias(prev => 
        prev.map(cat => cat.id === id ? categoriaActualizada : cat)
      );
      return categoriaActualizada;
    } catch (err) {
      setError('Error al actualizar categoría: ' + err.message);
      console.error('Error actualizando categoría:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const toggleCategoriaActiva = async (id, activa) => {
    try {
      setLoading(true);
      setError(null);
      const categoriaActualizada = await cajaService.toggleCategoriaActiva(id, activa);
      setCategorias(prev => 
        prev.map(cat => cat.id === id ? categoriaActualizada : cat)
      );
      return categoriaActualizada;
    } catch (err) {
      setError('Error al cambiar estado de categoría: ' + err.message);
      console.error('Error toggleando categoría:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ===== CORTES =====
  const cargarCortes = useCallback(async (filtrosCorte = {}) => {
    try {
      setLoading(true);
      setError(null);
      const data = await cajaService.getCortes(filtrosCorte);
      setCortes(data);
    } catch (err) {
      setError('Error al cargar cortes: ' + err.message);
      console.error('Error cargando cortes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const realizarCorte = async (corteData) => {
    try {
      setLoading(true);
      setError(null);
      const nuevoCorte = await cajaService.realizarCorte(corteData);
      setCortes(prev => [nuevoCorte, ...prev]);
      return nuevoCorte;
    } catch (err) {
      setError('Error al realizar corte: ' + err.message);
      console.error('Error realizando corte:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const obtenerUltimoCorte = async () => {
    try {
      return await cajaService.getUltimoCorte();
    } catch (err) {
      console.error('Error obteniendo último corte:', err);
      return null;
    }
  };

  // ===== FILTROS =====
  const actualizarFiltros = (nuevosFiltros) => {
    setFiltros(prev => ({ ...prev, ...nuevosFiltros }));
  };

  const limpiarFiltros = () => {
    setFiltros({});
  };

  // ===== UTILIDADES =====
  const obtenerResumenPorCategoria = async (fechaInicio, fechaFin, tipo = null) => {
    try {
      return await cajaService.getResumenPorCategoria(fechaInicio, fechaFin, tipo);
    } catch (err) {
      console.error('Error obteniendo resumen por categoría:', err);
      return {};
    }
  };

  const obtenerResumenPorMetodoPago = async (fechaInicio, fechaFin) => {
    try {
      return await cajaService.getResumenPorMetodoPago(fechaInicio, fechaFin);
    } catch (err) {
      console.error('Error obteniendo resumen por método de pago:', err);
      return {};
    }
  };

  const limpiarError = () => {
    setError(null);
  };

  // Efectos
  useEffect(() => {
    cargarCategorias();
  }, [cargarCategorias]);

  useEffect(() => {
    cargarResumen();
  }, [cargarResumen]);

  useEffect(() => {
    cargarMovimientos();
  }, [filtros, cargarMovimientos]);

  return {
    // Estado
    movimientos,
    categorias,
    cortes,
    resumen,
    filtros,
    loading,
    error,

    // Acciones de movimientos
    cargarMovimientos,
    agregarMovimiento,
    actualizarMovimiento,
    eliminarMovimiento,

    // Acciones de resumen
    cargarResumen,
    obtenerResumenPorCategoria,
    obtenerResumenPorMetodoPago,

    // Acciones de categorías
    cargarCategorias,
    agregarCategoria,
    actualizarCategoria,
    toggleCategoriaActiva,

    // Acciones de cortes
    cargarCortes,
    realizarCorte,
    obtenerUltimoCorte,

    // Acciones de filtros
    actualizarFiltros,
    limpiarFiltros,

    // Utilidades
    limpiarError,

    // Servicios directos (para casos especiales)
    cajaService
  };
};