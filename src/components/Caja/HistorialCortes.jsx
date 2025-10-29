import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  DollarSign, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  Filter,
  Search,
  Clock,
  User,
  FileText,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useCaja } from '../../hooks/useCaja.js';

const HistorialCortes = ({ className = '' }) => {
  const { cortes, cargarCortes, loading, cajaService } = useCaja();
  const [filtros, setFiltros] = useState({
    fechaInicio: '',
    fechaFin: ''
  });
  const [corteSeleccionado, setCorteSeleccionado] = useState(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  useEffect(() => {
    cargarCortes();
  }, [cargarCortes]);

  const aplicarFiltros = () => {
    const filtrosLimpios = {};
    if (filtros.fechaInicio) filtrosLimpios.fechaInicio = filtros.fechaInicio;
    if (filtros.fechaFin) filtrosLimpios.fechaFin = filtros.fechaFin;
    cargarCortes(filtrosLimpios);
  };

  const limpiarFiltros = () => {
    setFiltros({ fechaInicio: '', fechaFin: '' });
    cargarCortes();
  };

  const getDiferenciaColor = (diferencia) => {
    if (diferencia === 0) return 'text-green-600';
    if (Math.abs(diferencia) <= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDiferenciaIcon = (diferencia) => {
    if (diferencia === 0) return CheckCircle;
    return AlertTriangle;
  };

  const formatPeriodo = (fechaInicio, fechaFin) => {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    // Si es el mismo día
    if (inicio.toDateString() === fin.toDateString()) {
      return `${cajaService.formatDateOnly(fechaInicio)} (${inicio.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} - ${fin.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })})`;
    }
    
    return `${cajaService.formatDateOnly(fechaInicio)} - ${cajaService.formatDateOnly(fechaFin)}`;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Cargando historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Search className="h-5 w-5 mr-2" />
              Filtros de Búsqueda
            </h3>
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="md:hidden p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Filter className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className={`${mostrarFiltros ? 'block' : 'hidden md:block'} p-6`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="h-4 w-4 inline mr-1" />
                Fecha Inicio
              </label>
              <input
                type="date"
                value={filtros.fechaInicio}
                onChange={(e) => setFiltros(prev => ({ ...prev, fechaInicio: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="h-4 w-4 inline mr-1" />
                Fecha Fin
              </label>
              <input
                type="date"
                value={filtros.fechaFin}
                onChange={(e) => setFiltros(prev => ({ ...prev, fechaFin: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-end space-x-2">
              <button
                onClick={aplicarFiltros}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Buscar
              </button>
              <button
                onClick={limpiarFiltros}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de cortes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Historial de Cortes ({cortes.length})
          </h3>
        </div>

        {cortes.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay cortes registrados</h3>
            <p className="text-gray-600">
              Los cortes de caja que realices aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {cortes.map((corte) => {
              const DiferenciaIcon = getDiferenciaIcon(corte.diferencia);
              
              return (
                <div key={corte.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {formatPeriodo(corte.fecha_inicio, corte.fecha_fin)}
                        </div>
                        <div className="text-sm text-gray-600">
                          Creado: {cajaService.formatDate(corte.created_at)}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setCorteSeleccionado(corte)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm text-blue-600 font-medium">Saldo Inicial</div>
                      <div className="font-bold text-blue-800">
                        {cajaService.formatCurrency(corte.saldo_inicial)}
                      </div>
                    </div>
                    
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-sm text-green-600 font-medium">Ingresos</div>
                      <div className="font-bold text-green-800">
                        {cajaService.formatCurrency(corte.total_ingresos)}
                      </div>
                    </div>
                    
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-sm text-red-600 font-medium">Gastos</div>
                      <div className="font-bold text-red-800">
                        {cajaService.formatCurrency(corte.total_gastos)}
                      </div>
                    </div>
                    
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600 font-medium">Saldo Final</div>
                      <div className="font-bold text-gray-800">
                        {cajaService.formatCurrency(corte.saldo_calculado)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Efectivo contado: {cajaService.formatCurrency(corte.efectivo_contado)}
                        </span>
                      </div>
                    </div>
                    
                    <div className={`flex items-center space-x-2 ${getDiferenciaColor(corte.diferencia)}`}>
                      <DiferenciaIcon className="h-4 w-4" />
                      <span className="font-medium">
                        Diferencia: {corte.diferencia >= 0 ? '+' : ''}
                        {cajaService.formatCurrency(Math.abs(corte.diferencia))}
                      </span>
                    </div>
                  </div>

                  {corte.observaciones && (
                    <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <FileText className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-yellow-800">Observaciones:</div>
                          <div className="text-sm text-yellow-700">{corte.observaciones}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      {corteSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Detalle del Corte
              </h2>
              <button
                onClick={() => setCorteSeleccionado(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Información del período */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Período del Corte</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Inicio:</div>
                      <div className="font-medium">{cajaService.formatDate(corteSeleccionado.fecha_inicio)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Fin:</div>
                      <div className="font-medium">{cajaService.formatDate(corteSeleccionado.fecha_fin)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumen financiero */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Resumen Financiero</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Saldo Inicial:</span>
                      <span className="font-medium">{cajaService.formatCurrency(corteSeleccionado.saldo_inicial)}</span>
                    </div>
                    <div className="flex justify-between items-center text-green-600">
                      <span className="flex items-center">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        Total Ingresos:
                      </span>
                      <span className="font-medium">{cajaService.formatCurrency(corteSeleccionado.total_ingresos)}</span>
                    </div>
                    <div className="flex justify-between items-center text-red-600">
                      <span className="flex items-center">
                        <TrendingDown className="h-4 w-4 mr-1" />
                        Total Gastos:
                      </span>
                      <span className="font-medium">{cajaService.formatCurrency(corteSeleccionado.total_gastos)}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Saldo Calculado:</span>
                      <span className="font-medium">{cajaService.formatCurrency(corteSeleccionado.saldo_calculado)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Efectivo Contado:</span>
                      <span className="font-medium">{cajaService.formatCurrency(corteSeleccionado.efectivo_contado)}</span>
                    </div>
                    <div className={`flex justify-between items-center border-t pt-2 ${getDiferenciaColor(corteSeleccionado.diferencia)}`}>
                      <span className="font-medium">Diferencia:</span>
                      <span className="font-bold">
                        {corteSeleccionado.diferencia >= 0 ? '+' : ''}{cajaService.formatCurrency(Math.abs(corteSeleccionado.diferencia))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desglose de billetes */}
              {corteSeleccionado.desglose_billetes && Object.keys(corteSeleccionado.desglose_billetes).length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Desglose de Efectivo</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      {Object.entries(corteSeleccionado.desglose_billetes).map(([denominacion, cantidad]) => (
                        cantidad > 0 && (
                          <div key={denominacion} className="flex justify-between">
                            <span>{cajaService.formatCurrency(parseFloat(denominacion))}:</span>
                            <span>{cantidad} = {cajaService.formatCurrency(parseFloat(denominacion) * cantidad)}</span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Observaciones */}
              {corteSeleccionado.observaciones && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Observaciones</h3>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-yellow-800">{corteSeleccionado.observaciones}</p>
                  </div>
                </div>
              )}

              {/* Información de creación */}
              <div className="border-t pt-4">
                <div className="text-sm text-gray-600">
                  Corte realizado el {cajaService.formatDate(corteSeleccionado.created_at)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistorialCortes;