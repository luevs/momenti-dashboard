import React, { useEffect, useState } from "react";

// Para UX usamos lectura mock (en futuro se remplaza por supabase)
const MOCK_MAP = {
  c1: { id: "c1", name: "Textiles SA", type: "Empresa", status: "active", points: 120 },
  c2: { id: "c2", name: "Impresos Rápidos", type: "PyME", status: "active", points: 450 },
  c3: { id: "c3", name: "Studio UV", type: "Particular", status: "inactive", points: 0 },
};

export default function CustomerDetail({ customerId, onClose }) {
  const [tab, setTab] = useState("overview");
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    setCustomer(MOCK_MAP[customerId] || null);
  }, [customerId]);

  if (!customer) return <div className="p-4">Cliente no encontrado</div>;

  return (
    <div className="bg-white border rounded p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg font-semibold">{customer.name}</h2>
          <div className="text-sm text-gray-500">{customer.type} · {customer.status}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-yellow-50 rounded text-sm">
            <strong>{Number(customer.points).toFixed(0)}</strong> pts
          </div>
          <button onClick={onClose} className="text-sm text-gray-500">Cerrar</button>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <button className={`px-3 py-1 rounded ${tab==='overview' ? 'bg-blue-50' : ''}`} onClick={()=>setTab('overview')}>Resumen</button>
        <button className={`px-3 py-1 rounded ${tab==='contacts' ? 'bg-blue-50' : ''}`} onClick={()=>setTab('contacts')}>Contactos</button>
        <button className={`px-3 py-1 rounded ${tab==='interactions' ? 'bg-blue-50' : ''}`} onClick={()=>setTab('interactions')}>Interacciones</button>
        <button className={`px-3 py-1 rounded ${tab==='loyalty' ? 'bg-blue-50' : ''}`} onClick={()=>setTab('loyalty')}>Lealtad</button>
      </div>

      <div>
        {tab === 'overview' && (
          <div className="text-sm text-gray-700">
            <p><strong>Últimos pedidos</strong>: (placeholder)</p>
            <p className="mt-2">Notas y resumen del cliente...</p>
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

        {tab === 'loyalty' && (
          <div>
            <div className="text-sm text-gray-600 mb-2">Cuenta de lealtad</div>
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold">{Number(customer.points).toFixed(0)}</div>
              <div>
                <button className="px-3 py-1 bg-green-600 text-white rounded">Acreditar</button>
                <button className="ml-2 px-3 py-1 bg-red-600 text-white rounded">Canjear</button>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">Historial de transacciones (placeholder)</div>
          </div>
        )}
      </div>
    </div>
  );
}