import React, { useEffect, useState } from "react";
import { Mail, Phone, MapPin, User, Building2, BadgeInfo, Hash } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function CustomerDetail({ customer, onClose }) {
  const [tab, setTab] = useState("overview");
  const [ventas, setVentas] = useState([]);
  const [ventasKPIs, setVentasKPIs] = useState(null);

  useEffect(() => {
    if (!customer) return;
    const fetchVentas = async () => {
      console.log("Buscando ventas para:", customer.name);
      const { data, error } = await supabase
        .from("sales")
        .select("id, fecha, importe")
        .ilike("cliente", customer.name); // <-- prueba con ilike
      console.log("Ventas encontradas:", data);
      if (!error) {
        setVentas(data || []);
        if (data && data.length > 0) {
          // KPIs
          const totalVentas = data.length;
          const totalImporte = data.reduce((sum, v) => sum + Number(v.importe || 0), 0);
          const ultimaVenta = data.reduce((max, v) => (!max || new Date(v.fecha) > new Date(max.fecha) ? v : max), null);
          // Frecuencia de compra (días promedio entre ventas)
          const fechas = data.map(v => new Date(v.fecha)).sort((a, b) => a - b);
          let frecuencia = null;
          if (fechas.length > 1) {
            let totalDias = 0;
            for (let i = 1; i < fechas.length; i++) {
              totalDias += (fechas[i] - fechas[i - 1]) / (1000 * 60 * 60 * 24);
            }
            frecuencia = Math.round(totalDias / (fechas.length - 1));
          }
          setVentasKPIs({
            totalVentas,
            totalImporte,
            ultimaVenta,
            frecuencia,
          });
        } else {
          setVentasKPIs(null);
        }
      }
    };
    fetchVentas();
  }, [customer]);

  if (!customer) return <div className="p-4">Cliente no encontrado</div>;

  return (
    <div className="bg-white border rounded p-6 shadow-md h-full flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <User className="text-blue-500" size={22} />
            <h2 className="text-2xl font-bold">{customer.name}</h2>
            {customer.alias && (
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
            {customer.codigo && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">
                Código: {customer.codigo}
              </span>
            )}
            {customer.es_revendedor && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
                Revendedor
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-red-500">Cerrar ✕</button>
      </div>

      <div className="flex gap-4 mb-4">
        <button className={`px-3 py-1 rounded ${tab==='overview' ? 'bg-blue-50 font-semibold' : ''}`} onClick={()=>setTab('overview')}>Resumen</button>
        <button className={`px-3 py-1 rounded ${tab==='contacts' ? 'bg-blue-50 font-semibold' : ''}`} onClick={()=>setTab('contacts')}>Contactos</button>
        <button className={`px-3 py-1 rounded ${tab==='interactions' ? 'bg-blue-50 font-semibold' : ''}`} onClick={()=>setTab('interactions')}>Interacciones</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'overview' && (
          <div className="space-y-4">
            {/* KPIs de ventas */}
            {ventasKPIs && (
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded">
                  <div className="text-xs text-blue-700">Total de compras</div>
                  <div className="text-lg font-bold">{ventasKPIs.totalVentas}</div>
                </div>
                <div className="p-3 bg-green-50 rounded">
                  <div className="text-xs text-green-700">Monto total</div>
                  <div className="text-lg font-bold">${ventasKPIs.totalImporte.toFixed(2)}</div>
                </div>
                <div className="p-3 bg-yellow-50 rounded col-span-2">
                  <div className="text-xs text-yellow-700">Última compra</div>
                  <div className="text-sm font-semibold">
                    {ventasKPIs.ultimaVenta ? new Date(ventasKPIs.ultimaVenta.fecha).toLocaleDateString() : "—"}
                    {ventasKPIs.ultimaVenta ? ` ($${ventasKPIs.ultimaVenta.importe})` : ""}
                  </div>
                </div>
                {ventasKPIs.frecuencia && (
                  <div className="p-3 bg-purple-50 rounded col-span-2">
                    <div className="text-xs text-purple-700">Frecuencia promedio</div>
                    <div className="text-sm font-semibold">{ventasKPIs.frecuencia} días entre compras</div>
                  </div>
                )}
              </div>
            )}

            {/* Dirección fiscal y demás info */}
            <div>
              <div className="font-semibold text-gray-700 mb-1 flex items-center gap-2">
                <Building2 size={18} className="text-gray-400" /> Dirección fiscal
              </div>
              <div className="text-sm text-gray-800">
                {customer.direccion || "—"}
                {customer.no_exterior && ` #${customer.no_exterior}`}
                {customer.no_interior && ` Int. ${customer.no_interior}`}
                {customer.colonia && `, ${customer.colonia}`}
                {customer.cp && `, CP ${customer.cp}`}
                {customer.municipio && `, ${customer.municipio}`}
                {customer.estado && `, ${customer.estado}`}
              </div>
            </div>
            {/* ...resto del overview... */}
          </div>
        )}

        {tab === 'contacts' && (
          <div>
            <div className="text-sm text-gray-600 mb-2">Contactos</div>
            <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">No hay contactos (UX placeholder)</div>
          </div>
        )}

        {tab === 'interactions' && (
          <div>
            <div className="text-sm text-gray-600 mb-2">Interacciones</div>
            <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">Sin interacciones (UX placeholder)</div>
          </div>
        )}
      </div>
    </div>
  );
}