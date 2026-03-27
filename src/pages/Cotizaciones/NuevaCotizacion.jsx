import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, FileText, Printer, X, Plus, Trash2, Calculator } from 'lucide-react';
import { crearCotizacion, actualizarCotizacion, obtenerCotizacionPorId, calcularScore } from '../../services/cotizacionesService';

export default function NuevaCotizacion() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  // Estado del formulario
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Info de cotización
    vigencia_dias: 5,
    tiempo_entrega: '3-5 días hábiles',
    
    // Cliente
    cliente_nombre: '',
    cliente_telefono: '',
    cliente_email: '',
    tipo_cliente: 'CLIENTE_FINAL',
    
    // Totales
    subtotal: 0,
    descuento: 0,
    iva: 0,
    total: 0,
    
    // Otros
    notas: '',
    status: 'COTIZADO'
  });

  const [items, setItems] = useState([
    {
      descripcion: '',
      cantidad: '1',
      unidad: 'pzas',
      precio_unitario: 0,
      total: 0,
      tipo_servicio: 'DTF_TEXTIL',
      // Campos para impresiones con medidas
      usa_medidas: false,
      ancho: '',
      alto: '',
      tipo_precio: 'm2', // 'm2' o 'metro_lineal'
      precio_por_medida: 0
    }
  ]);

  useEffect(() => {
    if (isEdit) {
      cargarCotizacion();
    }
  }, [id]);

  useEffect(() => {
    calcularTotales();
  }, [items, formData.descuento]);

  const cargarCotizacion = async () => {
    try {
      setLoading(true);
      const data = await obtenerCotizacionPorId(id);
      setFormData({
        vigencia_dias: data.vigencia_dias,
        tiempo_entrega: data.tiempo_entrega,
        cliente_nombre: data.cliente_nombre,
        cliente_telefono: data.cliente_telefono || '',
        cliente_email: data.cliente_email || '',
        tipo_cliente: data.tipo_cliente,
        subtotal: data.subtotal,
        descuento: data.descuento,
        iva: data.iva,
        total: data.total,
        notas: data.notas || '',
        status: data.status
      });
      setItems(data.items.map(item => ({
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        unidad: item.unidad || 'pzas',
        precio_unitario: parseFloat(item.precio_unitario),
        total: parseFloat(item.total),
        tipo_servicio: item.tipo_servicio || 'OTRO',
        usa_medidas: item.usa_medidas || false,
        ancho: item.ancho || '',
        alto: item.alto || '',
        tipo_precio: item.tipo_precio || 'm2',
        precio_por_medida: item.precio_por_medida || 0
      })));
    } catch (error) {
      console.error('Error al cargar cotización:', error);
      alert('Error al cargar la cotización');
      navigate('/cotizaciones');
    } finally {
      setLoading(false);
    }
  };

  const calcularTotales = () => {
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    const descuento = parseFloat(formData.descuento) || 0;
    const subtotalConDescuento = subtotal - descuento;
    const iva = subtotalConDescuento * 0.16;
    const total = subtotalConDescuento + iva;

    setFormData(prev => ({
      ...prev,
      subtotal: subtotal,
      iva: iva,
      total: total
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // Si cambia el tipo de servicio, determinar si usa medidas
    if (field === 'tipo_servicio') {
      const serviciosConMedidas = ['VINIL_IMPRESO', 'LONA', 'VINIL_MICROPERFORADO'];
      const usaMedidas = serviciosConMedidas.includes(value);
      newItems[index].usa_medidas = usaMedidas;
      
      if (!usaMedidas) {
        // Resetear campos de medidas si no se usan
        newItems[index].ancho = '';
        newItems[index].alto = '';
        newItems[index].tipo_precio = 'm2';
        newItems[index].precio_por_medida = 0;
      }
    }

    // Calcular total del item
    if (newItems[index].usa_medidas) {
      // Si usa medidas, calcular según ancho, alto y precio por medida
      const ancho = parseFloat(newItems[index].ancho) || 0;
      const alto = parseFloat(newItems[index].alto) || 0;
      const precioPorMedida = parseFloat(newItems[index].precio_por_medida) || 0;
      const cantidad = parseFloat(newItems[index].cantidad) || 0;
      
      let areaOMetros = 0;
      if (newItems[index].tipo_precio === 'm2') {
        // Calcular m²: ancho(m) * alto(m)
        areaOMetros = ancho * alto;
      } else {
        // Calcular metros lineales: solo ancho(m)
        areaOMetros = ancho;
      }
      
      newItems[index].total = cantidad * areaOMetros * precioPorMedida;
      // Actualizar precio unitario para referencia
      newItems[index].precio_unitario = areaOMetros * precioPorMedida;
    } else {
      // Cálculo normal: cantidad * precio_unitario
      if (field === 'cantidad' || field === 'precio_unitario') {
        const cantidad = parseFloat(newItems[index].cantidad) || 0;
        const precio = parseFloat(newItems[index].precio_unitario) || 0;
        newItems[index].total = cantidad * precio;
      }
    }

    setItems(newItems);
  };

  const agregarItem = () => {
    setItems([...items, {
      descripcion: '',
      cantidad: '1',
      unidad: 'pzas',
      precio_unitario: 0,
      total: 0,
      tipo_servicio: 'DTF_TEXTIL',
      usa_medidas: false,
      ancho: '',
      alto: '',
      tipo_precio: 'm2',
      precio_por_medida: 0
    }]);
  };

  const eliminarItem = (index) => {
    if (items.length === 1) {
      alert('Debe haber al menos un producto');
      return;
    }
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const validarFormulario = () => {
    if (!formData.cliente_nombre.trim()) {
      alert('El nombre del cliente es obligatorio');
      return false;
    }

    if (items.length === 0) {
      alert('Debe agregar al menos un producto');
      return false;
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].descripcion.trim()) {
        alert(`El producto ${i + 1} debe tener descripción`);
        return false;
      }
      if (parseFloat(items[i].precio_unitario) <= 0) {
        alert(`El producto ${i + 1} debe tener un precio mayor a 0`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (generarPDF = false) => {
    if (!validarFormulario()) return;

    try {
      setLoading(true);

      const cotizacionData = {
        ...formData,
        subtotal: parseFloat(formData.subtotal),
        descuento: parseFloat(formData.descuento),
        iva: parseFloat(formData.iva),
        total: parseFloat(formData.total)
      };

      const itemsData = items.map(item => ({
        descripcion: item.descripcion,
        cantidad: item.cantidad.toString(),
        unidad: item.unidad,
        precio_unitario: parseFloat(item.precio_unitario),
        total: parseFloat(item.total),
        tipo_servicio: item.tipo_servicio,
        usa_medidas: item.usa_medidas || false,
        ancho: item.ancho || null,
        alto: item.alto || null,
        tipo_precio: item.tipo_precio || null,
        precio_por_medida: item.precio_por_medida || null
      }));

      let resultado;
      if (isEdit) {
        resultado = await actualizarCotizacion(id, cotizacionData, itemsData);
        alert('Cotización actualizada correctamente');
      } else {
        resultado = await crearCotizacion(cotizacionData, itemsData);
        alert(`Cotización creada: ${resultado.folio}`);
      }

      if (generarPDF) {
        navigate(`/cotizaciones/${resultado.id}/pdf`);
      } else {
        navigate('/cotizaciones');
      }
    } catch (error) {
      console.error('Error al guardar cotización:', error);
      alert('Error al guardar la cotización: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  };

  const scoreActual = calcularScore(formData.total, formData.tipo_cliente, formData.tiempo_entrega, items.length);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <FileText className="text-cyan-500" size={32} />
          {isEdit ? 'Editar Cotización' : 'Nueva Cotización'}
        </h1>
        <p className="text-slate-600 mt-1">
          {isEdit ? 'Actualiza los datos de la cotización' : 'Completa el formulario para generar una cotización profesional'}
        </p>
      </div>

      {loading && !isEdit ? (
        <div className="bg-white p-12 rounded-xl shadow-sm text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          <p className="mt-4 text-slate-600">Cargando...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sección 1: Info de Cotización */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Calculator size={20} className="text-cyan-500" />
              Información de la Cotización
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Vigencia (días)
                </label>
                <select
                  name="vigencia_dias"
                  value={formData.vigencia_dias}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value={3}>3 días</option>
                  <option value={5}>5 días</option>
                  <option value={7}>7 días</option>
                  <option value={10}>10 días</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tiempo de Entrega
                </label>
                <input
                  type="text"
                  name="tiempo_entrega"
                  value={formData.tiempo_entrega}
                  onChange={handleInputChange}
                  placeholder="ej: 3-5 días hábiles"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Sección 2: Datos del Cliente */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Datos del Cliente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre / Empresa <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="cliente_nombre"
                  value={formData.cliente_nombre}
                  onChange={handleInputChange}
                  placeholder="Nombre del cliente o empresa"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  name="cliente_telefono"
                  value={formData.cliente_telefono}
                  onChange={handleInputChange}
                  placeholder="+52 614 123 4567"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="cliente_email"
                  value={formData.cliente_email}
                  onChange={handleInputChange}
                  placeholder="cliente@ejemplo.com"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tipo de Cliente
                </label>
                <select
                  name="tipo_cliente"
                  value={formData.tipo_cliente}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="CLIENTE_FINAL">Cliente Final</option>
                  <option value="NEGOCIO_NUEVO">Negocio Nuevo</option>
                  <option value="EVENTO_CORPORATIVO">Evento/Corporativo</option>
                  <option value="REVENDEDOR">Revendedor</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sección 3: Productos/Servicios */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Productos / Servicios</h2>
              <button
                onClick={agregarItem}
                className="bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors flex items-center gap-2"
              >
                <Plus size={18} />
                Agregar Producto
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-slate-700">Producto #{index + 1}</span>
                    {items.length > 1 && (
                      <button
                        onClick={() => eliminarItem(index)}
                        className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Descripción
                      </label>
                      <textarea
                        value={item.descripcion}
                        onChange={(e) => handleItemChange(index, 'descripcion', e.target.value)}
                        placeholder="Describe el producto o servicio"
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Cantidad
                      </label>
                      <input
                        type="text"
                        value={item.cantidad}
                        onChange={(e) => handleItemChange(index, 'cantidad', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Unidad
                      </label>
                      <input
                        type="text"
                        value={item.unidad}
                        onChange={(e) => handleItemChange(index, 'unidad', e.target.value)}
                        placeholder="pzas"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Precio Unit.
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.precio_unitario}
                        onChange={(e) => handleItemChange(index, 'precio_unitario', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Tipo de Servicio
                      </label>
                      <select
                        value={item.tipo_servicio}
                        onChange={(e) => handleItemChange(index, 'tipo_servicio', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                      >
                        <option value="DTF_TEXTIL">DTF Textil</option>
                        <option value="UV_DTF">UV DTF</option>
                        <option value="VINIL_IMPRESO">Vinil Impreso</option>
                        <option value="VINIL_SUAJADO">Vinil Suajado</option>
                        <option value="VINIL_MICROPERFORADO">Vinil Microperforado</option>
                        <option value="VINIL_HOLOGRAFICO">Vinil Holográfico</option>
                        <option value="LONA">Lona</option>
                        <option value="PAPELERIA">Papelería</option>
                        <option value="GRABADO_LASER">Grabado Láser</option>
                        <option value="INSTALACION">Instalación</option>
                        <option value="OTRO">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Total
                      </label>
                      <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800">
                        {formatCurrency(item.total)}
                      </div>
                    </div>
                  </div>

                  {/* Campos de medidas para impresiones */}
                  {item.usa_medidas && (
                    <div className="mt-4 p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                        <h4 className="text-sm font-semibold text-cyan-800">Configuración de Medidas</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Tipo de Precio
                          </label>
                          <select
                            value={item.tipo_precio}
                            onChange={(e) => handleItemChange(index, 'tipo_precio', e.target.value)}
                            className="w-full px-3 py-2 border border-cyan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm bg-white"
                          >
                            <option value="m2">Por m² (ancho × alto)</option>
                            <option value="metro_lineal">Por Metro Lineal (ancho)</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Ancho (metros)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.ancho}
                            onChange={(e) => handleItemChange(index, 'ancho', e.target.value)}
                            placeholder="1.20"
                            className="w-full px-3 py-2 border border-cyan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                          />
                        </div>
                        
                        {item.tipo_precio === 'm2' && (
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Alto (metros)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.alto}
                              onChange={(e) => handleItemChange(index, 'alto', e.target.value)}
                              placeholder="0.90"
                              className="w-full px-3 py-2 border border-cyan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                            />
                          </div>
                        )}
                        
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Precio por {item.tipo_precio === 'm2' ? 'm²' : 'Metro Lineal'}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.precio_por_medida}
                            onChange={(e) => handleItemChange(index, 'precio_por_medida', e.target.value)}
                            placeholder="0.00"
                            className="w-full px-3 py-2 border border-cyan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                          />
                        </div>
                      </div>
                      
                      {/* Mostrar cálculo */}
                      {item.ancho && item.precio_por_medida && (
                        <div className="mt-3 p-2 bg-white rounded border border-cyan-200">
                          <p className="text-xs text-slate-600">
                            {item.tipo_precio === 'm2' ? (
                              <>
                                <strong>Cálculo:</strong> {item.cantidad} × ({item.ancho}m × {item.alto || 0}m) × ${item.precio_por_medida} = 
                                <span className="font-semibold text-cyan-700"> {formatCurrency(item.total)}</span>
                              </>
                            ) : (
                              <>
                                <strong>Cálculo:</strong> {item.cantidad} × {item.ancho}m × ${item.precio_por_medida} = 
                                <span className="font-semibold text-cyan-700"> {formatCurrency(item.total)}</span>
                              </>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sección 4: Totales */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Totales y Score</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-200">
                  <span className="text-slate-700">Subtotal:</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(formData.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-200">
                  <span className="text-slate-700">Descuento:</span>
                  <input
                    type="number"
                    step="0.01"
                    name="descuento"
                    value={formData.descuento}
                    onChange={handleInputChange}
                    className="w-32 px-3 py-1 border border-slate-300 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-200">
                  <span className="text-slate-700">IVA (16%):</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(formData.iva)}</span>
                </div>
                <div className="flex justify-between items-center py-3 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg px-4">
                  <span className="text-lg font-bold text-slate-800">TOTAL:</span>
                  <span className="text-2xl font-bold text-cyan-600">{formatCurrency(formData.total)}</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-lg border-2 border-yellow-200">
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-2">Score de Prioridad</p>
                  <p className="text-5xl font-bold text-yellow-600 mb-2">{scoreActual}</p>
                  <div className="flex items-center justify-center gap-1 text-yellow-500">
                    {scoreActual >= 90 ? '⭐⭐⭐' : scoreActual >= 70 ? '⭐⭐' : '⭐'}
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    {scoreActual >= 90 ? 'Prioridad Alta' : scoreActual >= 70 ? 'Prioridad Media' : 'Prioridad Normal'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sección 5: Notas */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Notas Adicionales</h2>
            <textarea
              name="notas"
              value={formData.notas}
              onChange={handleInputChange}
              placeholder="Agrega cualquier nota o detalle adicional sobre esta cotización..."
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex gap-4 justify-end">
            <button
              onClick={() => navigate('/cotizaciones')}
              disabled={loading}
              className="px-6 py-3 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <X size={20} />
              Cancelar
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={20} />
              {loading ? 'Guardando...' : 'Guardar Cotización'}
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Printer size={20} />
              Guardar y Generar PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
