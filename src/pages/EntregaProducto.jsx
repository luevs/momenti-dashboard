import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Printer, Plus, Trash2, Save } from 'lucide-react';

export default function EntregaProducto() {
  // Estados principales
  const [clientes, setClientes] = useState([]);
  const [trabajos, setTrabajos] = useState([]);
  
  // Formulario de nuevo trabajo
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [tipoTrabajo, setTipoTrabajo] = useState('');
  const [productos, setProductos] = useState([]);
  const [nuevoProducto, setNuevoProducto] = useState({ nombre: '', cantidad: '', descripcion: '' });
  
  // Búsqueda de cliente
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [mostrarListaClientes, setMostrarListaClientes] = useState(false);
  
  // Estados UI
  const [isLoading, setIsLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Cargar clientes al montar
  useEffect(() => {
    cargarClientes();
    cargarTrabajos();
  }, []);

  // Filtrar clientes según búsqueda
  useEffect(() => {
    if (busquedaCliente.trim() === '') {
      setClientesFiltrados([]);
      setMostrarListaClientes(false);
      return;
    }
    
    const filtrados = clientes.filter(c => 
      c.razon_social?.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
      c.alias?.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
      c.celular?.includes(busquedaCliente)
    );
    
    setClientesFiltrados(filtrados);
    setMostrarListaClientes(true);
  }, [busquedaCliente, clientes]);

  const cargarClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('customers_')
        .select('id, razon_social, alias, celular, email')
        .order('razon_social');
      
      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      mostrarMensaje('error', 'Error al cargar clientes');
    }
  };

  const cargarTrabajos = async () => {
    try {
      const { data, error } = await supabase
        .from('entregas_producto')
        .select(`
          *,
          customer:customers_(razon_social, alias, celular)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTrabajos(data || []);
    } catch (error) {
      console.error('Error al cargar trabajos:', error);
    }
  };

  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    setBusquedaCliente(cliente.razon_social || cliente.alias);
    setMostrarListaClientes(false);
  };

  const agregarProducto = () => {
    if (!nuevoProducto.nombre || !nuevoProducto.cantidad) {
      mostrarMensaje('error', 'Complete nombre y cantidad del producto');
      return;
    }
    
    setProductos([...productos, { ...nuevoProducto, id: Date.now() }]);
    setNuevoProducto({ nombre: '', cantidad: '', descripcion: '' });
  };

  const eliminarProducto = (id) => {
    setProductos(productos.filter(p => p.id !== id));
  };

  const guardarTrabajo = async () => {
    if (!clienteSeleccionado) {
      mostrarMensaje('error', 'Seleccione un cliente');
      return;
    }
    if (!tipoTrabajo.trim()) {
      mostrarMensaje('error', 'Ingrese el tipo de trabajo');
      return;
    }
    if (productos.length === 0) {
      mostrarMensaje('error', 'Agregue al menos un producto');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('entregas_producto')
        .insert({
          customer_id: clienteSeleccionado.id,
          tipo_trabajo: tipoTrabajo,
          productos: productos,
          estado: 'recibido'
        })
        .select()
        .single();

      if (error) throw error;

      mostrarMensaje('success', 'Trabajo guardado exitosamente');
      limpiarFormulario();
      cargarTrabajos();
      
      // Mostrar ticket automáticamente
      imprimirTicket(data);
    } catch (error) {
      console.error('Error al guardar trabajo:', error);
      mostrarMensaje('error', 'Error al guardar el trabajo');
    } finally {
      setIsLoading(false);
    }
  };

  const limpiarFormulario = () => {
    setClienteSeleccionado(null);
    setBusquedaCliente('');
    setTipoTrabajo('');
    setProductos([]);
    setNuevoProducto({ nombre: '', cantidad: '', descripcion: '' });
  };

  const imprimirTicket = (trabajo) => {
    const cliente = trabajo.customer || clienteSeleccionado;
    const fecha = new Date().toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    const ventanaImpresion = window.open('', '_blank');
    ventanaImpresion.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Ticket de Entrega - ${trabajo.id}</title>
        <link rel="preload" as="image" href="/momenti-logo.jpg" />
        <style>
          @media print {
            @page { size: 80mm auto; margin: 2mm; }
            body {
              font-family: 'Arial', sans-serif;
              font-size: 15px;
              line-height: 1.3;
              margin: 0;
              padding: 0;
              width: 76mm;
            }
            img, .logo { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          body {
            font-family: 'Arial', sans-serif;
            font-size: 15px;
            line-height: 1.3;
            margin: 0;
            padding: 4px;
            width: 76mm;
            background: white;
            color: black;
            box-sizing: border-box;
          }
          .container { max-width: 100%; margin: 0 auto; padding: 0 2px; box-sizing: border-box; word-break: break-word; overflow-wrap: anywhere; }
          .logo { display: block; margin: 0 auto 8px auto; width: 120px; max-width: 100%; height: auto; -webkit-filter: grayscale(100%) contrast(220%); filter: grayscale(100%) contrast(220%); image-rendering: -webkit-optimize-contrast; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .small { font-size: 12px; color: #222; }
          .header { text-align: center; margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 6px; }
          .info-section { margin-bottom: 6px; font-size: 13px; }
          .productos-section { background: #f8f9fa; border: 1px solid #333; border-radius: 2px; padding: 6px; margin: 8px 0; font-size: 13px; }
          .signature-section { border: 1px dashed #000; margin: 8px 0; padding: 6px; text-align: center; }
          .signature-box { border-bottom: 1px solid #000; height: 40px; margin: 6px 0; background: white; }
          .disclaimer { background: #f8f9fa; border: 1px solid #333; padding: 6px; margin: 8px 0; font-size: 11px; text-align: justify; }
          .footer { text-align: center; margin-top: 8px; border-top: 1px dashed #000; padding-top: 4px; }
          .producto-item { border-bottom: 1px dashed #ccc; padding: 4px 0; margin: 4px 0; }
          .producto-item:last-child { border-bottom: none; }
          * { box-sizing: border-box; }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Logo -->
          <img src="/momenti-logo.jpg" alt="Momenti Logo" class="logo" loading="eager" width="120" />
          
          <!-- Header -->
          <div class="header">
            <div class="bold" style="font-size: 16px;">SUCURSAL MATRIZ</div>
            <div style="font-size: 13px;">Fco. Villa 3700, local 17</div>
            <div style="font-size: 13px;">Tel: 6146822183</div>
            <div class="bold" style="font-size: 15px; margin-top: 6px;">ENTREGA DE PRODUCTO</div>
          </div>

          <!-- Información básica -->
          <div class="info-section">
            <div><strong>Folio:</strong> ${trabajo.id}</div>
            <div><strong>Fecha:</strong> ${fecha}</div>
            <div><strong>Cliente:</strong> ${cliente.razon_social || cliente.alias}</div>
            <div><strong>Tel cliente:</strong> ${cliente.celular || 'N/A'}</div>
            <div><strong>Tipo de trabajo:</strong> ${trabajo.tipo_trabajo}</div>
          </div>

          <!-- Sección de productos -->
          <div class="productos-section">
            <div class="center bold" style="margin-bottom: 6px; font-size: 14px;">
              === PRODUCTOS ENTREGADOS ===
            </div>
            
            ${(trabajo.productos || productos).map((p, index) => `
              <div class="producto-item">
                <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                  <span class="bold">${index + 1}. ${p.nombre}</span>
                  <span class="bold">x${p.cantidad}</span>
                </div>
                ${p.descripcion ? `<div class="small" style="font-style: italic; margin-left: 8px;">${p.descripcion}</div>` : ''}
              </div>
            `).join('')}
            
            <div style="border-top: 1px solid #000; margin-top: 6px; padding-top: 4px;">
              <div style="text-align: right;" class="bold">
                Total de artículos: ${(trabajo.productos || productos).reduce((sum, p) => sum + parseInt(p.cantidad || 0), 0)}
              </div>
            </div>
          </div>

          <!-- Deslinde de responsabilidad -->
          <div class="disclaimer">
            <div class="bold center" style="margin-bottom: 4px; font-size: 12px;">DESLINDE DE RESPONSABILIDAD</div>
            <p style="margin: 4px 0;">
              El cliente entrega los productos mencionados para su personalización bajo su propia responsabilidad. 
              <strong>MOMENTI</strong> no se hace responsable de daños, pérdidas o defectos preexistentes en los productos entregados.
            </p>
            <p style="margin: 4px 0;">
              Al firmar este documento, el cliente reconoce haber entregado los productos listados y acepta las condiciones mencionadas.
            </p>
          </div>

          <!-- Sección de firma -->
          <div class="signature-section">
            <div class="bold" style="margin-bottom: 4px; font-size: 14px;">AUTORIZACIÓN DEL CLIENTE</div>
            <div style="margin-bottom: 6px; font-size: 12px;">
              Confirmo la entrega de ${(trabajo.productos || productos).length} producto(s)
            </div>
            <div class="signature-box"></div>
            <div class="small">Firma del cliente</div>
            <div class="small" style="margin-top: 2px;">Fecha: ${new Date().toLocaleDateString('es-MX')}</div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <div style="font-size: 14px;">¡Gracias por tu preferencia!</div>
            <div class="bold" style="font-size: 15px;">GRACIAS POR SU COMPRA</div>
            <div style="margin-top: 4px; font-size: 12px;">Conserve este comprobante</div>
          </div>
        </div>

        <script>
          (function() {
            function allImagesLoaded() {
              const imgs = Array.from(document.images);
              return imgs.every(img => img.complete && img.naturalWidth > 0);
            }
            function waitForImagesThenPrint() {
              const imgs = Array.from(document.images);
              if (imgs.length === 0 || allImagesLoaded()) {
                setTimeout(function(){ window.print && window.print(); }, 50);
                return;
              }
              let done = 0; const total = imgs.length;
              const onDone = function(){
                done++; if (done >= total) setTimeout(function(){ window.print && window.print(); }, 50);
              };
              imgs.forEach(function(img){
                if (img.complete) { onDone(); return; }
                img.addEventListener('load', onDone, { once: true });
                img.addEventListener('error', onDone, { once: true });
              });
              // Fallback: si tarda demasiado, imprime de todos modos
              setTimeout(function(){ if (!allImagesLoaded()) { window.print && window.print(); } }, 1500);
            }
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
              waitForImagesThenPrint();
            } else {
              document.addEventListener('DOMContentLoaded', waitForImagesThenPrint, { once: true });
            }
          })();
        </script>
      </body>
      </html>
    `);
    ventanaImpresion.document.close();
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Entrega de Producto</h1>
        <p className="text-gray-600 mt-2">Registra los productos que los clientes dejan para personalizar</p>
      </div>

      {/* Mensaje de feedback */}
      {mensaje.texto && (
        <div className={`mb-4 p-4 rounded-lg ${
          mensaje.tipo === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {mensaje.texto}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario de nuevo trabajo */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Nuevo Trabajo</h2>
          
          {/* Búsqueda de Cliente */}
          <div className="mb-4 relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
                placeholder="Buscar cliente por nombre o teléfono..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Lista de clientes filtrados */}
            {mostrarListaClientes && clientesFiltrados.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {clientesFiltrados.map(cliente => (
                  <div
                    key={cliente.id}
                    onClick={() => seleccionarCliente(cliente)}
                    className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                  >
                    <div className="font-medium">{cliente.razon_social || cliente.alias}</div>
                    <div className="text-sm text-gray-600">{cliente.celular}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cliente seleccionado */}
          {clienteSeleccionado && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="font-medium text-blue-900">
                {clienteSeleccionado.razon_social || clienteSeleccionado.alias}
              </div>
              <div className="text-sm text-blue-700">{clienteSeleccionado.celular}</div>
            </div>
          )}

          {/* Tipo de Trabajo */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Trabajo</label>
            <input
              type="text"
              value={tipoTrabajo}
              onChange={(e) => setTipoTrabajo(e.target.value)}
              placeholder="Ej: Estampado DTF, Sublimación, Vinil, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Productos */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Productos</label>
            
            {/* Lista de productos agregados */}
            {productos.length > 0 && (
              <div className="mb-3 space-y-2">
                {productos.map(producto => (
                  <div key={producto.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{producto.nombre} (x{producto.cantidad})</div>
                      {producto.descripcion && (
                        <div className="text-sm text-gray-600">{producto.descripcion}</div>
                      )}
                    </div>
                    <button
                      onClick={() => eliminarProducto(producto.id)}
                      className="ml-2 text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Formulario para agregar producto */}
            <div className="border border-gray-300 rounded-lg p-3 space-y-2">
              <input
                type="text"
                value={nuevoProducto.nombre}
                onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
                placeholder="Nombre del producto"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                value={nuevoProducto.cantidad}
                onChange={(e) => setNuevoProducto({ ...nuevoProducto, cantidad: e.target.value })}
                placeholder="Cantidad"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={nuevoProducto.descripcion}
                onChange={(e) => setNuevoProducto({ ...nuevoProducto, descripcion: e.target.value })}
                placeholder="Descripción (opcional)"
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={agregarProducto}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Agregar Producto
              </button>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3">
            <button
              onClick={guardarTrabajo}
              disabled={isLoading}
              className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2 font-medium"
            >
              <Save size={20} />
              {isLoading ? 'Guardando...' : 'Guardar e Imprimir'}
            </button>
            <button
              onClick={limpiarFormulario}
              className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Lista de trabajos recientes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Trabajos Recientes</h2>
          
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {trabajos.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay trabajos registrados</p>
            ) : (
              trabajos.map(trabajo => (
                <div key={trabajo.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-gray-900">
                        {trabajo.customer?.razon_social || trabajo.customer?.alias || 'Cliente no encontrado'}
                      </div>
                      <div className="text-sm text-gray-600">{trabajo.tipo_trabajo}</div>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Folio: {trabajo.id}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-3">
                    {trabajo.productos?.length || 0} producto(s) - {new Date(trabajo.created_at).toLocaleDateString('es-MX')}
                  </div>
                  
                  <button
                    onClick={() => imprimirTicket(trabajo)}
                    className="w-full bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2 text-sm"
                  >
                    <Printer size={16} />
                    Reimprimir Ticket
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
