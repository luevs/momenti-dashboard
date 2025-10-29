import React, { useState, useEffect } from 'react';
import { 
  Filter, 
  Calendar, 
  Tag, 
  CreditCard, 
  TrendingUp, 
  TrendingDown,
  X,
  RotateCcw
} from 'lucide-react';
import { useCaja } from '../../hooks/useCaja.js';

const FiltrosMovimientos = ({ className = '' }) => {
  const { 
    filtros, 
    categorias, 
    actualizarFiltros, 
    limpiarFiltros, 
    cargarResumen,
    cajaService 
  } = useCaja();

  const [filtrosLocal, setFiltrosLocal] = useState({
    fechaInicio: '',
    fechaFin: '',
    tipo: '',
    categoria_id: '',
    metodo_pago: '',
    rangoRapido: 'hoy'
  });

  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Opciones de rango rápido
  const rangosRapidos = [
    { value: 'hoy', label: 'Hoy' },
    { value: 'ayer', label: 'Ayer' },
    { value: 'semana', label: 'Esta semana' },
    { value: 'mes', label: 'Este mes' },
    { value: 'mesAnterior', label: 'Mes anterior' },
    { value: 'personalizado', label: 'Personalizado' }
  ];

  // Actualizar filtros locales cuando cambien los filtros globales
  useEffect(() => {
    setFiltrosLocal(prev => ({
      ...prev,
      ...filtros
    }));
  }, [filtros]);

  // Aplicar rango rápido
  const aplicarRangoRapido = (rango) => {
    if (rango === 'personalizado') {
      setFiltrosLocal(prev => ({
        ...prev,
        rangoRapido: rango
      }));
      return;
    }

    const { inicio, fin } = cajaService.getRangoFechas(rango);
    const nuevosFilterros = {
      ...filtrosLocal,
      rangoRapido: rango,
      fechaInicio: inicio.slice(0, 16), // Para datetime-local
      fechaFin: fin.slice(0, 16)
    };

    setFiltrosLocal(nuevosFilterros);
    aplicarFiltros(nuevosFilterros);
  };

  const aplicarFiltros = async (filtrosParaAplicar = filtrosLocal) => {
    const filtrosLimpios = {};
    
    if (filtrosParaAplicar.fechaInicio) {
      filtrosLimpios.fechaInicio = new Date(filtrosParaAplicar.fechaInicio).toISOString();
    }
    if (filtrosParaAplicar.fechaFin) {
      filtrosLimpios.fechaFin = new Date(filtrosParaAplicar.fechaFin).toISOString();
    }
    if (filtrosParaAplicar.tipo) {
      filtrosLimpios.tipo = filtrosParaAplicar.tipo;
    }
    if (filtrosParaAplicar.categoria_id) {
      filtrosLimpios.categoria_id = filtrosParaAplicar.categoria_id;
    }
    if (filtrosParaAplicar.metodo_pago) {
      filtrosLimpios.metodo_pago = filtrosParaAplicar.metodo_pago;
    }

    actualizarFiltros(filtrosLimpios);
    
    // Actualizar resumen con las nuevas fechas
    if (filtrosLimpios.fechaInicio && filtrosLimpios.fechaFin) {
      await cargarResumen(filtrosLimpios.fechaInicio, filtrosLimpios.fechaFin);
    }
  };

  const limpiarTodosFiltros = () => {
    const filtrosVacios = {
      fechaInicio: '',
      fechaFin: '',
      tipo: '',
      categoria_id: '',
      metodo_pago: '',
      rangoRapido: 'hoy'
    };
    
    setFiltrosLocal(filtrosVacios);
    limpiarFiltros();
    
    // Aplicar rango "hoy" por defecto
    aplicarRangoRapido('hoy');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFiltrosLocal(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'fechaInicio' || name === 'fechaFin' ? { rangoRapido: 'personalizado' } : {})
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    aplicarFiltros();
  };

  // Contar filtros activos
  const filtrosActivos = Object.values(filtros).filter(valor => valor && valor !== '').length;

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header de filtros */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">Filtros</h3>
            {filtrosActivos > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {filtrosActivos} activo{filtrosActivos !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {filtrosActivos > 0 && (
              <button
                onClick={limpiarTodosFiltros}
                className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Limpiar
              </button>
            )}
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="lg:hidden inline-flex items-center px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              {mostrarFiltros ? <X className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Rangos rápidos - siempre visibles */}
      <div className="px-6 py-4 border-b border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Periodo
        </label>
        <div className="flex flex-wrap gap-2">
          {rangosRapidos.map(rango => (
            <button
              key={rango.value}
              onClick={() => aplicarRangoRapido(rango.value)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                filtrosLocal.rangoRapido === rango.value
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {rango.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros detallados */}
      <div className={`${mostrarFiltros ? 'block' : 'hidden lg:block'}`}>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Fechas personalizadas */}
          {filtrosLocal.rangoRapido === 'personalizado' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Fecha Inicio
                </label>
                <input
                  type="datetime-local"
                  name="fechaInicio"
                  value={filtrosLocal.fechaInicio}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Fecha Fin
                </label>
                <input
                  type="datetime-local"
                  name="fechaFin"
                  value={filtrosLocal.fechaFin}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tipo de movimiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Movimiento
              </label>
              <select
                name="tipo"
                value={filtrosLocal.tipo}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos los tipos</option>
                <option value="ingreso">
                  <TrendingUp className="inline h-4 w-4 mr-1" />
                  Ingresos
                </option>
                <option value="gasto">
                  <TrendingDown className="inline h-4 w-4 mr-1" />
                  Gastos
                </option>
              </select>
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Tag className="h-4 w-4 inline mr-1" />
                Categoría
              </label>
              <select
                name="categoria_id"
                value={filtrosLocal.categoria_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas las categorías</option>
                {categorias.map(categoria => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Método de pago */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CreditCard className="h-4 w-4 inline mr-1" />
                Método de Pago
              </label>
              <select
                name="metodo_pago"
                value={filtrosLocal.metodo_pago}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos los métodos</option>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
          </div>

          {/* Botón aplicar - solo para móvil o cuando hay cambios */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Filter className="h-4 w-4 mr-2" />
              Aplicar Filtros
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FiltrosMovimientos;