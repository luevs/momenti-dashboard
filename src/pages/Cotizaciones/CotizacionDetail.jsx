import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Copy, FileText, Printer, Download } from 'lucide-react';
import { obtenerCotizacionPorId, duplicarCotizacion, actualizarStatus, agregarNotaSeguimiento } from '../../services/cotizacionesService';

export default function CotizacionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cotizacion, setCotizacion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNotaModal, setShowNotaModal] = useState(false);
  const [nuevaNota, setNuevaNota] = useState('');
  const printRef = useRef();

  useEffect(() => {
    cargarCotizacion();
  }, [id]);

  const cargarCotizacion = async () => {
    try {
      setLoading(true);
      const data = await obtenerCotizacionPorId(id);
      setCotizacion(data);
    } catch (error) {
      console.error('Error al cargar cotización:', error);
      alert('Error al cargar la cotización');
      navigate('/cotizaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      const nueva = await duplicarCotizacion(id);
      alert(`Cotización duplicada: ${nueva.folio}`);
      navigate('/cotizaciones');
    } catch (error) {
      console.error('Error al duplicar:', error);
      alert('Error al duplicar la cotización');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await actualizarStatus(id, newStatus);
      alert('Status actualizado correctamente');
      cargarCotizacion();
    } catch (error) {
      console.error('Error al actualizar status:', error);
      alert('Error al actualizar el status');
    }
  };

  const handleAgregarNota = async () => {
    if (!nuevaNota.trim()) return;

    try {
      await agregarNotaSeguimiento(id, nuevaNota);
      alert('Nota agregada correctamente');
      setNuevaNota('');
      setShowNotaModal(false);
      cargarCotizacion();
    } catch (error) {
      console.error('Error al agregar nota:', error);
      alert('Error al agregar la nota');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  };

  const getStatusBadge = (status) => {
    const badges = {
      'COTIZADO': 'bg-blue-100 text-blue-700 border-blue-200',
      'EN_PROCESO': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'CERRADO': 'bg-green-100 text-green-700 border-green-200',
      'PERDIDO': 'bg-red-100 text-red-700 border-red-200'
    };
    return badges[status] || badges['COTIZADO'];
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white p-12 rounded-xl shadow-sm text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          <p className="mt-4 text-slate-600">Cargando cotización...</p>
        </div>
      </div>
    );
  }

  if (!cotizacion) {
    return (
      <div className="p-6">
        <div className="bg-white p-12 rounded-xl shadow-sm text-center">
          <p className="text-slate-600">Cotización no encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Sección para imprimir - oculta en pantalla */}
      <div className="hidden print:block">
        <CotizacionPDFTemplate cotizacion={cotizacion} />
      </div>

      {/* Vista normal - oculta al imprimir */}
      <div className="p-6 print:hidden">
        {/* Header con acciones */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/cotizaciones')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                {cotizacion.folio}
              </h1>
              <p className="text-slate-600">
                {cotizacion.cliente_nombre}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/cotizaciones/${id}/editar`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Edit2 size={18} />
              Editar
            </button>
            <button
              onClick={handleDuplicate}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Copy size={18} />
              Duplicar
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center gap-2"
            >
              <Printer size={18} />
              Imprimir PDF
            </button>
          </div>
        </div>

        {/* Información general */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Status</h3>
            <select
              value={cotizacion.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg font-medium border ${getStatusBadge(cotizacion.status)}`}
            >
              <option value="COTIZADO">COTIZADO</option>
              <option value="EN_PROCESO">EN PROCESO</option>
              <option value="CERRADO">CERRADO</option>
              <option value="PERDIDO">PERDIDO</option>
            </select>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Score de Prioridad</h3>
            <p className="text-4xl font-bold text-yellow-600">{cotizacion.score}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Total</h3>
            <p className="text-4xl font-bold text-cyan-600">{formatCurrency(cotizacion.total)}</p>
          </div>
        </div>

        {/* Detalles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Info de cotización */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Información de Cotización</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-slate-600">Fecha de Creación:</span>
                <p className="font-medium text-slate-800">
                  {new Date(cotizacion.fecha_creacion).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <span className="text-sm text-slate-600">Vigencia:</span>
                <p className="font-medium text-slate-800">{cotizacion.vigencia_dias} días hábiles</p>
              </div>
              <div>
                <span className="text-sm text-slate-600">Tiempo de Entrega:</span>
                <p className="font-medium text-slate-800">{cotizacion.tiempo_entrega}</p>
              </div>
              <div>
                <span className="text-sm text-slate-600">Tipo de Cliente:</span>
                <p className="font-medium text-slate-800">{cotizacion.tipo_cliente?.replace('_', ' ')}</p>
              </div>
            </div>
          </div>

          {/* Info del cliente */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Información del Cliente</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-slate-600">Nombre/Empresa:</span>
                <p className="font-medium text-slate-800">{cotizacion.cliente_nombre}</p>
              </div>
              {cotizacion.cliente_telefono && (
                <div>
                  <span className="text-sm text-slate-600">Teléfono:</span>
                  <p className="font-medium text-slate-800">{cotizacion.cliente_telefono}</p>
                </div>
              )}
              {cotizacion.cliente_email && (
                <div>
                  <span className="text-sm text-slate-600">Email:</span>
                  <p className="font-medium text-slate-800">{cotizacion.cliente_email}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Productos / Servicios</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">#</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Descripción</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Medidas</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Cantidad</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Precio Unit.</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cotizacion.items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="py-3 px-4 text-slate-600">{index + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{item.descripcion}</div>
                      <div className="text-sm text-slate-500">{item.tipo_servicio?.replace('_', ' ')}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {item.usa_medidas ? (
                        <div className="text-xs">
                          {item.tipo_precio === 'm2' ? (
                            <>
                              <div className="font-medium text-cyan-700">{item.ancho}m × {item.alto}m</div>
                              <div className="text-slate-500">({(parseFloat(item.ancho) * parseFloat(item.alto)).toFixed(2)} m²)</div>
                              <div className="text-slate-500">${item.precio_por_medida}/m²</div>
                            </>
                          ) : (
                            <>
                              <div className="font-medium text-cyan-700">{item.ancho}m</div>
                              <div className="text-slate-500">Metros lineales</div>
                              <div className="text-slate-500">${item.precio_por_medida}/m</div>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {item.cantidad} {item.unidad}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-800">
                      {formatCurrency(item.precio_unitario)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-800">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="mt-6 border-t border-slate-200 pt-4">
            <div className="max-w-md ml-auto space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(cotizacion.subtotal)}</span>
              </div>
              {cotizacion.descuento > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Descuento:</span>
                  <span className="font-semibold">-{formatCurrency(cotizacion.descuento)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600">IVA (16%):</span>
                <span className="font-semibold text-slate-800">{formatCurrency(cotizacion.iva)}</span>
              </div>
              <div className="flex justify-between text-lg pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-800">TOTAL:</span>
                <span className="font-bold text-cyan-600">{formatCurrency(cotizacion.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notas */}
        {cotizacion.notas && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Notas</h2>
            <div className="text-slate-700 whitespace-pre-wrap">{cotizacion.notas}</div>
          </div>
        )}
      </div>
    </>
  );
}

// Componente de template para PDF
function CotizacionPDFTemplate({ cotizacion }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  };

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header con colores corporativos */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold" style={{ color: '#000000' }}>MOMENTI</h1>
            <p className="text-sm text-slate-600">Imprenta y Publicidad</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-800">{cotizacion.folio}</p>
            <p className="text-sm text-slate-600">Cotización</p>
          </div>
        </div>
        
        {/* Barra de colores corporativos */}
        <div className="flex h-2 rounded">
          <div className="flex-1" style={{ backgroundColor: '#FFD700' }}></div>
          <div className="flex-1" style={{ backgroundColor: '#FF0090' }}></div>
          <div className="flex-1" style={{ backgroundColor: '#00B8E6' }}></div>
        </div>
      </div>

      {/* Información de cotización y cliente */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="font-bold text-slate-800 mb-2">Información de Cotización</h3>
          <p className="text-sm"><strong>Fecha:</strong> {new Date(cotizacion.fecha_creacion).toLocaleDateString('es-MX')}</p>
          <p className="text-sm"><strong>Vigencia:</strong> {cotizacion.vigencia_dias} días hábiles</p>
          <p className="text-sm"><strong>Entrega:</strong> {cotizacion.tiempo_entrega}</p>
        </div>
        <div>
          <h3 className="font-bold text-slate-800 mb-2">Datos del Cliente</h3>
          <p className="text-sm"><strong>{cotizacion.cliente_nombre}</strong></p>
          {cotizacion.cliente_telefono && <p className="text-sm">{cotizacion.cliente_telefono}</p>}
          {cotizacion.cliente_email && <p className="text-sm">{cotizacion.cliente_email}</p>}
        </div>
      </div>

      {/* Tabla de productos */}
      <div className="mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: '#00B8E6', color: 'white' }}>
              <th className="text-left p-2 text-sm">#</th>
              <th className="text-left p-2 text-sm">Descripción</th>
              <th className="text-left p-2 text-sm">Medidas</th>
              <th className="text-left p-2 text-sm">Cant.</th>
              <th className="text-right p-2 text-sm">P. Unit.</th>
              <th className="text-right p-2 text-sm">Total</th>
            </tr>
          </thead>
          <tbody>
            {cotizacion.items.map((item, index) => (
              <tr key={item.id} className="border-b">
                <td className="p-2 text-sm">{index + 1}</td>
                <td className="p-2 text-sm">{item.descripcion}</td>
                <td className="p-2 text-sm">
                  {item.usa_medidas ? (
                    item.tipo_precio === 'm2' ? (
                      <>{item.ancho}m × {item.alto}m ({(parseFloat(item.ancho) * parseFloat(item.alto)).toFixed(2)}m²)</>
                    ) : (
                      <>{item.ancho}m lineal</>
                    )
                  ) : '-'}
                </td>
                <td className="p-2 text-sm">{item.cantidad} {item.unidad}</td>
                <td className="p-2 text-sm text-right">{formatCurrency(item.precio_unitario)}</td>
                <td className="p-2 text-sm text-right font-semibold">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totales */}
      <div className="flex justify-end mb-6">
        <div className="w-64">
          <div className="flex justify-between py-1 text-sm">
            <span>Subtotal:</span>
            <span className="font-semibold">{formatCurrency(cotizacion.subtotal)}</span>
          </div>
          {cotizacion.descuento > 0 && (
            <div className="flex justify-between py-1 text-sm text-red-600">
              <span>Descuento:</span>
              <span className="font-semibold">-{formatCurrency(cotizacion.descuento)}</span>
            </div>
          )}
          <div className="flex justify-between py-1 text-sm">
            <span>IVA (16%):</span>
            <span className="font-semibold">{formatCurrency(cotizacion.iva)}</span>
          </div>
          <div className="flex justify-between py-2 text-lg border-t-2 border-slate-300">
            <span className="font-bold">TOTAL:</span>
            <span className="font-bold" style={{ color: '#00B8E6' }}>{formatCurrency(cotizacion.total)}</span>
          </div>
        </div>
      </div>

      {/* Condiciones */}
      <div className="mb-6 p-4 bg-slate-50 rounded text-xs">
        <h4 className="font-bold mb-2">Condiciones Comerciales:</h4>
        <ul className="list-disc list-inside space-y-1 text-slate-600">
          <li>Forma de pago: 50% anticipo, 50% contra entrega</li>
          <li>Métodos de pago: Efectivo, transferencia bancaria, tarjeta</li>
          <li>Diseño incluido en precio (hasta 2 revisiones)</li>
          <li>Entregas en sucursal sin costo</li>
          <li>Envíos foráneos con costo adicional</li>
          <li>Esta cotización tiene una vigencia de {cotizacion.vigencia_dias} días hábiles</li>
        </ul>
      </div>

      {/* Footer con contacto */}
      <div className="border-t pt-4 text-center text-xs text-slate-600">
        <p className="mb-1">
          <strong>WhatsApp:</strong> +52 614 682 2183 | 
          <strong> Email:</strong> contacto@momentipromo.com
        </p>
        <p className="mb-1">
          <strong>Instagram:</strong> @momenticuu_ | 
          <strong> Facebook:</strong> Momenti Imprenta y Publicidad
        </p>
        <p>Chihuahua, Chihuahua, México</p>
      </div>
    </div>
  );
}
