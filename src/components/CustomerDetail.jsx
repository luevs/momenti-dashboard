import React, { useEffect, useState } from "react";
import { Mail, Phone, MapPin, User, Building2, BadgeInfo, Hash, TrendingUp, Calendar, DollarSign, ShoppingBag, ExternalLink } from "lucide-react";
import { supabase } from "../supabaseClient";

const formatearFecha = (fechaString) => {
  if (!fechaString) return "Sin fecha";
  
  // Si viene en formato "DD/MM/YYYY HH:MM"
  if (fechaString.includes('/') && fechaString.includes(' ')) {
    const [fechaParte, horaParte] = fechaString.split(' ');
    const [dia, mes, año] = fechaParte.split('/');
    const fechaISO = `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}T${horaParte}:00`;
    const fecha = new Date(fechaISO);
    
    if (!isNaN(fecha.getTime())) {
      return fecha.toLocaleDateString('es-ES');
    }
  }
  
  // Si viene solo en formato "DD/MM/YYYY"
  if (fechaString.includes('/')) {
    const [dia, mes, año] = fechaString.split('/');
    const fechaISO = `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    const fecha = new Date(fechaISO);
    
    if (!isNaN(fecha.getTime())) {
      return fecha.toLocaleDateString('es-ES');
    }
  }
  
  return fechaString;
};

export default function CustomerDetail({ customer, onClose }) {
  const [tab, setTab] = useState("overview");
  const [ventas, setVentas] = useState([]);
  const [ventasKPIs, setVentasKPIs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loyaltyPrograms, setLoyaltyPrograms] = useState([]);
  const [loyaltyKPIs, setLoyaltyKPIs] = useState(null);

  useEffect(() => {
    if (!customer) return;
    
    const fetchVentasYPrograms = async () => {
      setLoading(true);
      console.log("Buscando ventas para cliente:", customer.name);
      
      // Query de ventas
      const { data: ventasData, error: ventasError } = await supabase
        .from("sales")
        .select("venta_id, cliente, fecha, venta_de, importe, pagos, saldo, atendio")
        .ilike("cliente", customer.name)
        .order('fecha', { ascending: false });

      // Query para programas de lealtad
      const { data: programsData, error: programsError } = await supabase
        .from("loyalty_clients")
        .select("id, type, totalMeters, remainingMeters, status, purchase_date, program_number, name, is_active, created_at")
        .eq("customer_id", customer.id)
        .order('program_number', { ascending: false });

      console.log("Ventas encontradas:", ventasData);
      console.log("Programas encontrados:", programsData);
      console.log("Customer completo:", customer);
      console.log("Nombre a buscar:", customer.name);
      console.log("Error en programas:", programsError);

      if (!ventasError) {
        setVentas(ventasData || []);
        
        // Calcular KPIs de ventas
        if (ventasData && ventasData.length > 0) {
          const totalVentas = ventasData.length;
          const totalGastado = ventasData.reduce((sum, v) => sum + (Number(v.importe) || 0), 0);
          const saldoPendiente = ventasData.reduce((sum, v) => sum + (Number(v.saldo) || 0), 0);
          
          const ultimaVenta = ventasData[0];
          
          const productosCount = {};
          ventasData.forEach(v => {
            const producto = v.venta_de || 'Sin especificar';
            productosCount[producto] = (productosCount[producto] || 0) + 1;
          });
          const productoMasComprado = Object.entries(productosCount)
            .sort(([,a], [,b]) => b - a)[0];

          setVentasKPIs({
            totalVentas,
            totalGastado,
            saldoPendiente,
            ultimaVenta,
            productoMasComprado: productoMasComprado ? {
              nombre: productoMasComprado[0],
              cantidad: productoMasComprado[1]
            } : null
          });
        } else {
          setVentasKPIs(null);
        }
      }
      
      if (!programsError) {
        setLoyaltyPrograms(programsData || []);
        
        if (programsData && programsData.length > 0) {
          const totalPrograms = programsData.length;
          const totalMetersEverPurchased = programsData.reduce((sum, p) => sum + Number(p.totalMeters || 0), 0);
          const totalMetersRemaining = programsData.reduce((sum, p) => sum + Number(p.remainingMeters || 0), 0);
          const activePrograms = programsData.filter(p => p.is_active === true && Number(p.remainingMeters) > 0);
          
          setLoyaltyKPIs({
            totalPrograms,
            totalMetersEverPurchased,
            totalMetersRemaining,
            activePrograms: activePrograms.length,
            programs: programsData
          });
        } else {
          setLoyaltyKPIs(null);
        }
      }
      
      setLoading(false);
    };

    fetchVentasYPrograms();
  }, [customer]);

  const ultimasVentas = ventas.slice(0, 5);

  if (!customer) return <div className="p-4">Cliente no encontrado</div>;

  return (
    <div className="bg-white border rounded p-6 shadow-md h-full flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <User className="text-blue-500" size={22} />
            <h2 className="text-2xl font-bold">{customer.name}</h2>
            {customer.alias && customer.alias !== customer.name && (
              <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">{customer.alias}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {customer.rfc && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                <Hash size={14} /> {customer.rfc}
              </span>
            )}
            {customer.regimen_fiscal && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">
                <BadgeInfo size={14} /> {customer.regimen_fiscal}
              </span>
            )}
            {customer.tipo_cliente && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
                {customer.tipo_cliente}
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-red-500">Cerrar ✕</button>
      </div>

      <div className="flex gap-4 mb-4">
        <button className={`px-3 py-1 rounded ${tab==='overview' ? 'bg-blue-50 font-semibold' : ''}`} onClick={()=>setTab('overview')}>Resumen</button>
        <button className={`px-3 py-1 rounded ${tab==='ventas' ? 'bg-blue-50 font-semibold' : ''}`} onClick={()=>setTab('ventas')}>Todas las Ventas</button>
        <button className={`px-3 py-1 rounded ${tab==='lealtad' ? 'bg-blue-50 font-semibold' : ''}`} onClick={()=>setTab('lealtad')}>Programas de Lealtad</button>
        <button className={`px-3 py-1 rounded ${tab==='contacts' ? 'bg-blue-50 font-semibold' : ''}`} onClick={()=>setTab('contacts')}>Contactos</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <div className="text-center py-4 text-gray-500">Cargando información...</div>}
        
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* KPIs de Ventas */}
            {ventasKPIs ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700 mb-1">
                      <TrendingUp size={16} />
                      <span className="text-xs font-medium">Total Ventas</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">{ventasKPIs.totalVentas}</div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700 mb-1">
                      <DollarSign size={16} />
                      <span className="text-xs font-medium">Total Gastado</span>
                    </div>
                    <div className="text-2xl font-bold text-green-900">${ventasKPIs.totalGastado.toLocaleString()}</div>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-700 mb-1">
                      <Calendar size={16} />
                      <span className="text-xs font-medium">Última Compra</span>
                    </div>
                    <div className="text-sm font-bold text-yellow-900">
                      {formatearFecha(ventasKPIs.ultimaVenta.fecha)}
                    </div>
                    <div className="text-xs text-yellow-600">${Number(ventasKPIs.ultimaVenta.importe).toLocaleString()}</div>
                  </div>

                  {ventasKPIs.productoMasComprado && (
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2 text-purple-700 mb-1">
                        <ShoppingBag size={16} />
                        <span className="text-xs font-medium">Más Comprado</span>
                      </div>
                      <div className="text-sm font-bold text-purple-900">{ventasKPIs.productoMasComprado.nombre}</div>
                      <div className="text-xs text-purple-600">{ventasKPIs.productoMasComprado.cantidad} veces</div>
                    </div>
                  )}

                  {ventasKPIs.saldoPendiente > 0 && (
                    <div className="p-4 bg-red-50 rounded-lg col-span-2">
                      <div className="flex items-center gap-2 text-red-700 mb-1">
                        <span className="text-xs font-medium">Saldo Pendiente</span>
                      </div>
                      <div className="text-xl font-bold text-red-900">${ventasKPIs.saldoPendiente.toLocaleString()}</div>
                    </div>
                  )}
                </div>

                {/* Últimas 5 ventas */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-700">Últimas 5 Ventas</h3>
                    {ventas.length > 5 && (
                      <button 
                        onClick={() => setTab('ventas')} 
                        className="text-blue-600 text-sm flex items-center gap-1 hover:underline"
                      >
                        Ver todas <ExternalLink size={12} />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {ultimasVentas.map((venta, index) => (
                      <div key={venta.venta_id || index} className="border rounded p-3 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-sm">{formatearFecha(venta.fecha)}</div>
                            <div className="text-xs text-gray-500">{venta.venta_de || 'Sin especificar'}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">${Number(venta.importe).toLocaleString()}</div>
                            {Number(venta.saldo) > 0 && (
                              <div className="text-xs text-red-600">Saldo: ${Number(venta.saldo).toLocaleString()}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              !loading && (
                <div className="p-4 bg-gray-50 rounded text-center text-gray-600">
                  Este cliente no tiene ventas registradas
                </div>
              )
            )}

            {/* Programas de Lealtad en Overview */}
            {loyaltyKPIs && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <ShoppingBag size={18} className="text-purple-400" /> Programas de Lealtad
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2 text-purple-700 mb-1">
                      <span className="text-xs font-medium">Programas Comprados</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-900">{loyaltyKPIs.totalPrograms}</div>
                  </div>

                  <div className="p-4 bg-indigo-50 rounded-lg">
                    <div className="flex items-center gap-2 text-indigo-700 mb-1">
                      <span className="text-xs font-medium">Metros Disponibles</span>
                    </div>
                    <div className="text-2xl font-bold text-indigo-900">{loyaltyKPIs.totalMetersRemaining.toFixed(1)}m</div>
                  </div>

                  <div className="p-4 bg-pink-50 rounded-lg col-span-2">
                    <div className="text-xs text-pink-700 font-medium mb-1">Total Metros Históricos</div>
                    <div className="text-xl font-bold text-pink-900">{loyaltyKPIs.totalMetersEverPurchased}m comprados</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-600">Detalle de Programas:</div>
                  {loyaltyKPIs.programs.map((program, index) => (
                    <div key={program.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border-l-4 border-purple-400">
                      <div>
                        <div className="font-medium text-sm">
                          Programa #{program.program_number || index + 1} - {program.type}
                        </div>
                        <div className="text-xs text-gray-500">
                          Comprado: {new Date(program.purchase_date || program.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm">
                          {program.remainingMeters.toFixed(1)}m / {program.totalMeters}m
                        </div>
                        <div className={`text-xs px-2 py-1 rounded ${
                          program.status === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {program.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Información del Cliente */}
            <div className="space-y-4">
              <div>
                <div className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Building2 size={18} className="text-gray-400" /> Dirección Fiscal
                </div>
                <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded">
                  {customer.direccion || "—"}
                  {customer.no_exterior && ` #${customer.no_exterior}`}
                  {customer.no_interior && ` Int. ${customer.no_interior}`}
                  {customer.colonia && `, ${customer.colonia}`}
                  {customer.cp && `, CP ${customer.cp}`}
                  {customer.municipio && `, ${customer.municipio}`}
                  {customer.estado && `, ${customer.estado}`}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Phone size={16} className="text-gray-400" /> Contacto
                  </div>
                  <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded">
                    <div><span className="text-gray-500">Teléfono:</span> {customer.telefono || "—"}</div>
                    <div><span className="text-gray-500">Celular:</span> {customer.celular || "—"}</div>
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Mail size={16} className="text-gray-400" /> Email
                  </div>
                  <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded">
                    {customer.email || "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'ventas' && (
          <div>
            {ventas.length > 0 ? (
              <div className="space-y-2">
                <div className="font-semibold text-gray-700 mb-4">
                  Todas las Ventas de {customer.name} ({ventas.length})
                </div>
                {ventas.map((venta, index) => (
                  <div key={venta.venta_id || index} className="border rounded p-3 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-sm">{formatearFecha(venta.fecha)}</div>
                        <div className="text-xs text-gray-500">{venta.venta_de || 'Sin especificar'}</div>
                        {venta.atendio && <div className="text-xs text-gray-400">Atendió: {venta.atendio}</div>}
                      </div>
                      <div className="text-right">
                        <div className="font-bold">${Number(venta.importe).toLocaleString()}</div>
                        {Number(venta.saldo) > 0 && (
                          <div className="text-xs text-red-600">Saldo: ${Number(venta.saldo).toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No hay ventas registradas para este cliente</div>
            )}
          </div>
        )}

        {tab === 'lealtad' && (
          <div>
            {loyaltyPrograms.length > 0 ? (
              <div className="space-y-4">
                <div className="font-semibold text-gray-700 mb-4">
                  Programas de Lealtad de {customer.name} ({loyaltyPrograms.length})
                </div>
                
                {loyaltyKPIs && (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="text-xs text-purple-700 font-medium">Total Programas</div>
                      <div className="text-2xl font-bold text-purple-900">{loyaltyKPIs.totalPrograms}</div>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-lg">
                      <div className="text-xs text-indigo-700 font-medium">Metros Disponibles</div>
                      <div className="text-2xl font-bold text-indigo-900">{loyaltyKPIs.totalMetersRemaining.toFixed(1)}m</div>
                    </div>
                    <div className="p-4 bg-pink-50 rounded-lg">
                      <div className="text-xs text-pink-700 font-medium">Metros Históricos</div>
                      <div className="text-2xl font-bold text-pink-900">{loyaltyKPIs.totalMetersEverPurchased}m</div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {loyaltyPrograms.map((program, index) => (
                    <div key={program.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">Programa #{program.program_number || index + 1}</div>
                          <div className="text-sm text-gray-600">{program.type}</div>
                          <div className="text-xs text-gray-500">
                            Comprado: {new Date(program.purchase_date || program.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{program.remainingMeters}m / {program.totalMeters}m</div>
                          <div className={`text-xs px-2 py-1 rounded mt-1 ${
                            program.status === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {program.status}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No hay programas de lealtad registrados para este cliente</div>
            )}
          </div>
        )}

        {tab === 'contacts' && (
          <div className="text-center py-8 text-gray-500">
            Funcionalidad de contactos próximamente
          </div>
        )}
      </div>
    </div>
  );
}