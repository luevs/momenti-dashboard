import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  AlertCircle,
  Eye,
  EyeOff,
  Shield
} from 'lucide-react';
import { useCaja } from '../../hooks/useCaja.js';

const GestionCategorias = ({ className = '' }) => {
  const { 
    categorias, 
    cargarCategorias, 
    agregarCategoria, 
    actualizarCategoria, 
    toggleCategoriaActiva, 
    loading 
  } = useCaja();

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [categoriaEdit, setCategoriaEdit] = useState(null);
  const [mostrarInactivas, setMostrarInactivas] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'ambos'
  });
  
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Cargar todas las categorías (activas e inactivas) al montar
  useEffect(() => {
    const cargarTodasCategorias = async () => {
      try {
        // Cargar todas las categorías sin filtrar por activas
        const { data, error } = await supabase
          .from('categorias_caja')
          .select('*')
          .order('nombre');
        
        if (error) throw error;
        // Aquí necesitaríamos acceso directo a supabase, por ahora usamos el hook
      } catch (error) {
        console.error('Error cargando categorías:', error);
      }
    };
    
    cargarCategorias();
  }, [cargarCategorias]);

  const categoriasVisibles = mostrarInactivas 
    ? categorias 
    : categorias.filter(cat => cat.activa);

  const resetFormulario = () => {
    setFormData({ nombre: '', tipo: 'ambos' });
    setErrors({});
    setCategoriaEdit(null);
    setMostrarFormulario(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    } else if (formData.nombre.trim().length < 2) {
      newErrors.nombre = 'El nombre debe tener al menos 2 caracteres';
    }

    // Verificar que no existe otra categoría con el mismo nombre
    const nombreExists = categorias.some(cat => 
      cat.nombre.toLowerCase() === formData.nombre.trim().toLowerCase() && 
      (!categoriaEdit || cat.id !== categoriaEdit.id)
    );
    
    if (nombreExists) {
      newErrors.nombre = 'Ya existe una categoría con este nombre';
    }

    if (!formData.tipo) {
      newErrors.tipo = 'El tipo es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      
      const categoriaData = {
        nombre: formData.nombre.trim(),
        tipo: formData.tipo
      };

      if (categoriaEdit) {
        await actualizarCategoria(categoriaEdit.id, categoriaData);
      } else {
        await agregarCategoria(categoriaData);
      }

      resetFormulario();
    } catch (error) {
      console.error('Error guardando categoría:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (categoria) => {
    if (categoria.es_sistema) return; // No permitir editar categorías del sistema
    
    setCategoriaEdit(categoria);
    setFormData({
      nombre: categoria.nombre,
      tipo: categoria.tipo
    });
    setMostrarFormulario(true);
  };

  const handleToggleActiva = async (categoria) => {
    if (categoria.es_sistema) return; // No permitir desactivar categorías del sistema
    
    try {
      await toggleCategoriaActiva(categoria.id, !categoria.activa);
    } catch (error) {
      console.error('Error cambiando estado de categoría:', error);
    }
  };

  const getTipoLabel = (tipo) => {
    const labels = {
      'ingreso': 'Solo Ingresos',
      'gasto': 'Solo Gastos',
      'ambos': 'Ingresos y Gastos'
    };
    return labels[tipo] || tipo;
  };

  const getTipoColor = (tipo) => {
    const colors = {
      'ingreso': 'bg-green-100 text-green-800',
      'gasto': 'bg-red-100 text-red-800',
      'ambos': 'bg-blue-100 text-blue-800'
    };
    return colors[tipo] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header y controles */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Tag className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">
              Gestión de Categorías
            </h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setMostrarInactivas(!mostrarInactivas)}
              className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center space-x-1 ${
                mostrarInactivas 
                  ? 'bg-gray-100 text-gray-700' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {mostrarInactivas ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span>{mostrarInactivas ? 'Ocultar inactivas' : 'Mostrar inactivas'}</span>
            </button>
            
            <button
              onClick={() => setMostrarFormulario(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Categoría</span>
            </button>
          </div>
        </div>

        <p className="text-gray-600 text-sm">
          Administra las categorías disponibles para clasificar los movimientos de caja. 
          Las categorías del sistema no pueden ser modificadas.
        </p>
      </div>

      {/* Lista de categorías */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="font-medium text-gray-900">
            Categorías ({categoriasVisibles.length})
          </h4>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Cargando categorías...</p>
          </div>
        ) : categoriasVisibles.length === 0 ? (
          <div className="p-8 text-center">
            <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {mostrarInactivas ? 'No hay categorías inactivas' : 'No hay categorías'}
            </h3>
            <p className="text-gray-600">
              {mostrarInactivas 
                ? 'Todas las categorías están activas.'
                : 'Crea tu primera categoría para organizar los movimientos.'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {categoriasVisibles.map((categoria) => (
              <div key={categoria.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className={`font-medium ${
                          categoria.activa ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {categoria.nombre}
                        </h4>
                        
                        {categoria.es_sistema && (
                          <div className="flex items-center space-x-1">
                            <Shield className="h-4 w-4 text-blue-600" />
                            <span className="text-xs text-blue-600 font-medium">Sistema</span>
                          </div>
                        )}
                        
                        {!categoria.activa && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            Inactiva
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTipoColor(categoria.tipo)}`}>
                          {getTipoLabel(categoria.tipo)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleActiva(categoria)}
                      disabled={categoria.es_sistema}
                      className={`p-2 rounded-lg transition-colors ${
                        categoria.es_sistema 
                          ? 'text-gray-300 cursor-not-allowed' 
                          : categoria.activa
                            ? 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50'
                            : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                      }`}
                      title={categoria.es_sistema 
                        ? 'Las categorías del sistema no pueden ser desactivadas' 
                        : (categoria.activa ? 'Desactivar categoría' : 'Activar categoría')
                      }
                    >
                      {categoria.activa ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    
                    <button
                      onClick={() => handleEdit(categoria)}
                      disabled={categoria.es_sistema}
                      className={`p-2 rounded-lg transition-colors ${
                        categoria.es_sistema 
                          ? 'text-gray-300 cursor-not-allowed' 
                          : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                      }`}
                      title={categoria.es_sistema 
                        ? 'Las categorías del sistema no pueden ser editadas' 
                        : 'Editar categoría'
                      }
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de formulario */}
      {mostrarFormulario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {categoriaEdit ? 'Editar Categoría' : 'Nueva Categoría'}
              </h2>
              <button
                onClick={resetFormulario}
                disabled={submitting}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la Categoría
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  placeholder="Ej: Papelería, Mantenimiento, etc."
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.nombre ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={submitting}
                />
                {errors.nombre && (
                  <p className="text-red-500 text-sm mt-1">{errors.nombre}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Categoría
                </label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.tipo ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={submitting}
                >
                  <option value="ambos">Ingresos y Gastos</option>
                  <option value="ingreso">Solo Ingresos</option>
                  <option value="gasto">Solo Gastos</option>
                </select>
                {errors.tipo && (
                  <p className="text-red-500 text-sm mt-1">{errors.tipo}</p>
                )}
                <p className="text-xs text-gray-600 mt-1">
                  Define si esta categoría se puede usar para ingresos, gastos o ambos.
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetFormulario}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{submitting ? 'Guardando...' : (categoriaEdit ? 'Actualizar' : 'Crear')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionCategorias;