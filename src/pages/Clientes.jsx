import React, { useEffect, useMemo, useRef, useState } from "react";
import CustomerCard from "../components/CustomerCard";
import CustomerDetail from "../components/CustomerDetail";
import Modal from "../components/Modal";

// Mock data (temporal para UX) — ahora con phone y salesCount
const SAMPLE = [
  { id: "c1", name: "Textiles SA", type: "Empresa", status: "active", tags: ["retail"], phone: "+5215512345678", salesCount: 12 },
  { id: "c2", name: "Impresos Rápidos", type: "PyME", status: "active", tags: ["vip"], phone: "+5215587654321", salesCount: 5 },
  { id: "c3", name: "Studio UV", type: "Particular", status: "inactive", tags: [], phone: "", salesCount: 0 },
];

export default function Clientes() {
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [customers, setCustomers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  // UI: qué métrica mostrar en los cards
  const [metric, setMetric] = useState("phone"); // "phone" | "sales"

  // Modal para crear nuevo cliente
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("Empresa");
  const [newStatus, setNewStatus] = useState("active");
  const [newPhone, setNewPhone] = useState("");

  // Nuevo: ancho de la lista (en px)
  const [listWidth, setListWidth] = useState(340);
  const draggingRef = useRef(false);

  useEffect(() => {
    // carga mock (en futuro reemplazar por fetch)
    setCustomers(SAMPLE);
  }, []);

  const filtered = useMemo(() => {
    return customers.filter(c => {
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q.toLowerCase());
    });
  }, [customers, q, filterStatus]);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const id = "c" + Date.now();
    const customer = { id, name: newName.trim(), type: newType, status: newStatus, tags: [], phone: newPhone, salesCount: 0 };
    setCustomers(prev => [customer, ...prev]);
    setNewName("");
    setNewType("Empresa");
    setNewStatus("active");
    setNewPhone("");
    setShowNewModal(false);
    setSelectedId(id);
  };

  // Nuevo: handlers para drag
  const handleMouseDown = (e) => {
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current) return;
      setListWidth(Math.max(220, Math.min(e.clientX, 600)));
    };
    const onUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        document.body.style.cursor = "";
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
    };
  }, []);

  return (
    <div className="p-6 flex gap-0 relative select-none">
      {/* Lista de clientes */}
      <div style={{ width: listWidth }} className="transition-all duration-100 bg-transparent">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Clientes</h1>
          <div className="flex items-center gap-2">
            <select value={metric} onChange={e => setMetric(e.target.value)} className="border rounded px-2 py-1 text-sm">
              <option value="phone">Mostrar: Contacto</option>
              <option value="sales">Mostrar: Ventas</option>
            </select>
            <button onClick={() => setShowNewModal(true)} className="bg-blue-600 text-white px-3 py-1 rounded">Nuevo</button>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <input value={q} onChange={e => setQ(e.target.value)} className="flex-1 border rounded px-3 py-1" placeholder="Buscar por nombre" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded px-2">
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>

        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} onClick={() => setSelectedId(c.id)} className="cursor-pointer">
              <CustomerCard customer={c} active={c.id === selectedId} metric={metric} />
            </div>
          ))}
          {filtered.length === 0 && <div className="text-sm text-gray-500">No hay clientes</div>}
        </div>
      </div>

      {/* Separador draggable */}
      <div
        onMouseDown={handleMouseDown}
        className="w-2 cursor-col-resize bg-gray-200 hover:bg-blue-300 transition"
        style={{ zIndex: 10 }}
        title="Arrastra para redimensionar"
      />

      {/* Panel detalle */}
      <div className="flex-1 min-w-0">
        {selectedId ? (
          <CustomerDetail customerId={selectedId} onClose={() => setSelectedId(null)} />
        ) : (
          <div className="p-8 bg-white border rounded text-gray-500">Selecciona un cliente para ver detalles</div>
        )}
      </div>

      <Modal open={showNewModal} title="Nuevo cliente" onClose={() => setShowNewModal(false)}>
        <form onSubmit={handleCreate}>
          <div className="mb-2">
            <label className="block text-xs text-gray-600">Nombre</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div className="flex gap-2 mb-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-600">Tipo</label>
              <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full border rounded px-2 py-1">
                <option>Empresa</option>
                <option>PyME</option>
                <option>Particular</option>
              </select>
            </div>
            <div className="w-32">
              <label className="block text-xs text-gray-600">Estado</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-full border rounded px-2 py-1">
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs text-gray-600">Teléfono / WhatsApp</label>
            <input value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full border rounded px-2 py-1" placeholder="+52..." />
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowNewModal(false)} className="px-3 py-1 rounded border">Cancelar</button>
            <button type="submit" className="bg-green-600 text-white px-3 py-1 rounded">Crear</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}