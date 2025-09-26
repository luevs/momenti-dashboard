import React, { useEffect, useMemo, useRef, useState } from "react";
import CustomerCard from "../components/CustomerCard";
import CustomerDetail from "../components/CustomerDetail";
import Modal from "../components/Modal";
import { supabase } from "../supabaseClient"; // Asegúrate de tener este import

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

  // Estados para el redimensionamiento dinámico
  const [listWidth, setListWidth] = useState(400);
  const draggingRef = useRef(false);
  const containerRef = useRef(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Cargar clientes reales de Supabase
  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase
        .from("customers_")
        .select("id, alias, razon_social, telefono, celular, email");
      if (error) {
        console.error("Error al cargar clientes:", error);
        setCustomers([]);
      } else {
        setCustomers(
          (data || []).map(c => ({
            id: c.id,
            name: c.razon_social || c.alias || "Sin nombre",
            phone: c.celular || c.telefono || "",
            email: c.email || "",
            // Puedes agregar más campos si los necesitas en el card
          }))
        );
      }
    };
    fetchCustomers();
  }, []);

  const filtered = useMemo(() => {
    return customers.filter(c => {
      if (!q) return true;
      return c.name.toLowerCase().includes(q.toLowerCase());
    });
  }, [customers, q]);

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

  // Handlers para el redimensionamiento
  const handleMouseDown = (e) => {
    e.preventDefault();
    draggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = listWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const handleMouseMove = (e) => {
    if (!draggingRef.current || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const deltaX = e.clientX - startXRef.current;
    const newWidth = startWidthRef.current + deltaX;
    
    // Límites: mínimo 250px, máximo 70% del contenedor
    const minWidth = 250;
    const maxWidth = containerWidth * 0.7;
    
    const clampedWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
    setListWidth(clampedWidth);
  };

  const handleMouseUp = () => {
    if (draggingRef.current) {
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
  };

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [listWidth]);

  // Función para resetear el tamaño
  const resetLayout = () => {
    setListWidth(400);
  };

  const selectedCustomer = customers.find(c => c.id === selectedId);

  return (
    <div
      className="flex gap-0 relative select-none h-[calc(100vh-48px)]" // Ajusta el 48px si tienes header
      ref={containerRef}
    >
      {/* Lista de clientes */}
      <div
        style={{ width: `${listWidth}px` }}
        className="flex-shrink-0 bg-white rounded-l-lg border border-r-0 border-gray-200 h-full"
      >
        <div className="p-4 h-full flex flex-col">
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

          <div className="flex-1 overflow-y-auto space-y-2">
          {filtered.map(c => (
            <div key={c.id} onClick={() => setSelectedId(c.id)} className="cursor-pointer">
              <CustomerCard customer={c} active={c.id === selectedId} metric={metric} />
            </div>
          ))}
          {filtered.length === 0 && <div className="text-sm text-gray-500">No hay clientes</div>}
        </div>
        </div>
      </div>

      {/* Separador draggable */}
      <div
        onMouseDown={handleMouseDown}
        className="w-1 cursor-col-resize bg-gray-300 hover:bg-blue-400 transition-colors duration-200 relative group flex-shrink-0"
        style={{ zIndex: 10 }}
        title="Arrastra para redimensionar"
      >
        {/* Indicador visual */}
        <div className="absolute inset-y-0 left-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
        
        {/* Botón de reset (aparece al hacer hover) */}
        <button
          onClick={resetLayout}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                     bg-gray-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 
                     transition-opacity duration-200 whitespace-nowrap z-20"
          title="Resetear tamaño"
        >
          Reset
        </button>
      </div>

      {/* Panel detalle */}
      <div className="flex-1 min-w-0 bg-white rounded-r-lg border border-l-0 border-gray-200">
        {selectedId ? (
          <div className="h-full">
            <CustomerDetail customer={selectedCustomer} onClose={() => setSelectedId(null)} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-lg font-medium mb-2">Selecciona un cliente</h3>
              <p className="text-sm">Haz clic en cualquier cliente de la lista para ver sus detalles</p>
            </div>
          </div>
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