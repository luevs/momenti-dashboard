import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Tag, CreditCard, FileText, Plus, Minus } from 'lucide-react';
import { useCaja } from '../../hooks/useCaja.js';

const RegistroMovimiento = ({ isOpen, onClose, movimientoEdit = null }) => {
  const { categorias, agregarMovimiento, actualizarMovimiento, loading, cajaService } = useCaja();
  
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().slice(0, 16),
    tipo: 'ingreso',
    monto: '',
    categoria_id: '',
    metodo_pago: 'efectivo',
    descripcion: ''
  });
  
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Categorías filtradas según el tipo seleccionado
  const categoriasFiltradas = categorias.filter(cat => 
    cat.tipo === formData.tipo || cat.tipo === 'ambos'
  );

  // Resetear formulario cuando se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      if (movimientoEdit) {
        // Modo edición
        setFormData({
          fecha: new Date(movimientoEdit.fecha).toISOString().slice(0, 16),
          tipo: movimientoEdit.tipo,
          monto: movimientoEdit.monto.toString(),
          categoria_id: movimientoEdit.categoria_id,
          metodo_pago: movimientoEdit.metodo_pago,
          descripcion: movimientoEdit.descripcion || ''
        });
      } else {
        // Modo crear nuevo
        setFormData({
          fecha: new Date().toISOString().slice(0, 16),
          tipo: 'ingreso',
          monto: '',
          categoria_id: '',
          metodo_pago: 'efectivo',
          descripcion: ''
        });
      }
      setErrors({});
    }
  }, [isOpen, movimientoEdit]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error del campo si existe
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fecha) {
      newErrors.fecha = 'La fecha es requerida';
    }

    if (!formData.monto || parseFloat(formData.monto) <= 0) {
      newErrors.monto = 'El monto debe ser mayor a 0';
    }

    if (!formData.categoria_id) {
      newErrors.categoria_id = 'La categoría es requerida';
    }

    if (!formData.metodo_pago) {
      newErrors.metodo_pago = 'El método de pago es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      
      const movimientoData = {
        ...formData,
        monto: parseFloat(formData.monto),
        fecha: new Date(formData.fecha).toISOString()
      };

      if (movimientoEdit) {
        await actualizarMovimiento(movimientoEdit.id, movimientoData);
      } else {
        await agregarMovimiento(movimientoData);
      }

      onClose();
    } catch (error) {
      console.error('Error al guardar movimiento:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <DollarSign className="h-6 w-6 mr-2 text-green-600" />
            {movimientoEdit ? 'Editar Movimiento' : 'Nuevo Movimiento'}
          </h2>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="h-4 w-4 inline mr-1" />
              Fecha y Hora
            </label>
            <input
              type="datetime-local"
              name="fecha"
              value={formData.fecha}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.fecha ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={submitting}
            />
            {errors.fecha && (
              <p className="text-red-500 text-sm mt-1">{errors.fecha}</p>
            )}
          </div>

          {/* Tipo de Movimiento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Movimiento
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleInputChange({ target: { name: 'tipo', value: 'ingreso' } })}
                className={`p-3 rounded-lg border-2 flex items-center justify-center space-x-2 transition-colors ${
                  formData.tipo === 'ingreso'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 hover:border-green-300'
                }`}
                disabled={submitting}
              >
                <Plus className="h-4 w-4" />
                <span className="font-medium">Ingreso</span>
              </button>
              <button
                type="button"
                onClick={() => handleInputChange({ target: { name: 'tipo', value: 'gasto' } })}
                className={`p-3 rounded-lg border-2 flex items-center justify-center space-x-2 transition-colors ${
                  formData.tipo === 'gasto'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-300 hover:border-red-300'
                }`}
                disabled={submitting}
              >
                <Minus className="h-4 w-4" />
                <span className="font-medium">Gasto</span>
              </button>
            </div>
          </div>

          {/* Monto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <DollarSign className="h-4 w-4 inline mr-1" />
              Monto (MXN)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              name="monto"
              value={formData.monto}
              onChange={handleInputChange}
              placeholder="0.00"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.monto ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={submitting}
            />
            {errors.monto && (
              <p className="text-red-500 text-sm mt-1">{errors.monto}</p>
            )}
            {formData.monto && (
              <p className="text-sm text-gray-600 mt-1">
                {cajaService.formatCurrency(parseFloat(formData.monto) || 0)}
              </p>
            )}
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Tag className="h-4 w-4 inline mr-1" />
              Categoría
            </label>
            <select
              name="categoria_id"
              value={formData.categoria_id}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.categoria_id ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={submitting}
            >
              <option value="">Seleccionar categoría...</option>
              {categoriasFiltradas.map(categoria => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
            {errors.categoria_id && (
              <p className="text-red-500 text-sm mt-1">{errors.categoria_id}</p>
            )}
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <CreditCard className="h-4 w-4 inline mr-1" />
              Método de Pago
            </label>
            <select
              name="metodo_pago"
              value={formData.metodo_pago}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.metodo_pago ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={submitting}
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
            {errors.metodo_pago && (
              <p className="text-red-500 text-sm mt-1">{errors.metodo_pago}</p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="h-4 w-4 inline mr-1" />
              Descripción (opcional)
            </label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleInputChange}
              rows={3}
              placeholder="Detalles adicionales del movimiento..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={submitting}
            />
          </div>

          {/* Botones */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || loading}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                formData.tipo === 'ingreso'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {submitting ? 'Guardando...' : (movimientoEdit ? 'Actualizar' : 'Guardar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegistroMovimiento;