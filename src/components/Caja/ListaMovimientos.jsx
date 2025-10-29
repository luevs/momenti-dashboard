import React, { useState } from 'react';
import { 
  Edit2, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Tag,
  CreditCard,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useCaja } from '../../hooks/useCaja.js';

const ListaMovimientos = ({ onEditMovimiento = null, className = '' }) => {
  const { movimientos, eliminarMovimiento, loading, cajaService } = useCaja();
  const [eliminandoId, setEliminandoId] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);

  const handleEliminar = async (id) => {
    try {
      setEliminandoId(id);
      await eliminarMovimiento(id);
      setShowConfirmDelete(null);
    } catch (error) {
      console.error('Error al eliminar movimiento:', error);
    } finally {
      setEliminandoId(null);
    }
  };

  const getMetodoPagoIcon = (metodo) => {
    return <CreditCard className="h-4 w-4" />;
  };

  const getMetodoPagoLabel = (metodo) => {
    const labels = {
      'efectivo': 'Efectivo',
      'tarjeta': 'Tarjeta',
      'transferencia': 'Transferencia'
    };
    return labels[metodo] || metodo;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Cargando movimientos...</p>
        </div>
      </div>
    );
  }

  if (movimientos.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay movimientos</h3>
          <p className="text-gray-600">
            No se encontraron movimientos con los filtros aplicados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Movimientos de Caja ({movimientos.length})
        </h3>
      </div>

      {/* Lista para móvil */}
      <div className="block md:hidden">
        {movimientos.map((movimiento) => (
          <div key={movimiento.id} className="border-b border-gray-200 last:border-b-0">
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {movimiento.tipo === 'ingreso' ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`text-lg font-semibold ${
                    movimiento.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {cajaService.formatCurrency(movimiento.monto)}
                  </span>
                </div>
                <div className="flex space-x-1">
                  {onEditMovimiento && (
                    <button
                      onClick={() => onEditMovimiento(movimiento)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowConfirmDelete(movimiento.id)}
                    disabled={eliminandoId === movimiento.id}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>{cajaService.formatDate(movimiento.fecha)}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Tag className="h-4 w-4" />
                  <span>{movimiento.categoria?.nombre || 'Sin categoría'}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getMetodoPagoIcon(movimiento.metodo_pago)}
                  <span>{getMetodoPagoLabel(movimiento.metodo_pago)}</span>
                </div>
                
                {movimiento.descripcion && (
                  <div className="flex items-start space-x-2">
                    <FileText className="h-4 w-4 mt-0.5" />
                    <span className="text-xs">{movimiento.descripcion}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla para desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Categoría
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Monto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Método
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descripción
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {movimientos.map((movimiento) => (
              <tr key={movimiento.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {cajaService.formatDate(movimiento.fecha)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {movimiento.tipo === 'ingreso' ? (
                      <>
                        <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Ingreso
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-4 w-4 text-red-600 mr-2" />
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          Gasto
                        </span>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {movimiento.categoria?.nombre || 'Sin categoría'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className={`text-sm font-semibold ${
                    movimiento.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {cajaService.formatCurrency(movimiento.monto)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    {getMetodoPagoIcon(movimiento.metodo_pago)}
                    <span className="ml-2">{getMetodoPagoLabel(movimiento.metodo_pago)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                  {movimiento.descripcion || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    {onEditMovimiento && (
                      <button
                        onClick={() => onEditMovimiento(movimiento)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setShowConfirmDelete(movimiento.id)}
                      disabled={eliminandoId === movimiento.id}
                      className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50"
                    >
                      {eliminandoId === movimiento.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de confirmación para eliminar */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                Confirmar Eliminación
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar este movimiento? Esta acción no se puede deshacer.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmDelete(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleEliminar(showConfirmDelete)}
                disabled={eliminandoId === showConfirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {eliminandoId === showConfirmDelete ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListaMovimientos;