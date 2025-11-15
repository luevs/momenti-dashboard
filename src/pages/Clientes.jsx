import React, { useEffect, useMemo, useRef, useState } from "react";
import CustomerCard from "../components/CustomerCard";
import CustomerDetail from "../components/CustomerDetail";
import Modal from "../components/Modal";
import { supabase } from "../supabaseClient";

export default function Clientes() {
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [customers, setCustomers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // UI: qué métrica mostrar en los cards
  const [metric, setMetric] = useState("phone"); // "phone" | "sales"

  // Modal para crear nuevo cliente
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("Revendedor");
  // const [newStatus, setNewStatus] = useState("active"); // Column doesn't exist
  const [newPhone, setNewPhone] = useState("");

  // Modal para eliminar cliente
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCustomerId, setDeleteCustomerId] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  // Modal para editar cliente
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("Revendedor");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editRFC, setEditRFC] = useState("");
  // const [editCustomerId, setEditCustomerId] = useState(""); // No needed anymore

  // Estados para el redimensionamiento dinámico
  const [listWidth, setListWidth] = useState(400);
  const draggingRef = useRef(false);
  const containerRef = useRef(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Cargar clientes reales de Supabase
  useEffect(() => {
    const fetchCustomers = async () => {
      console.log("🔍 Intentando cargar clientes de la tabla customers_...");
      console.log("🔧 Configuración de Supabase:", {
        url: import.meta.env.VITE_SUPABASE_URL,
        hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
      });
      
      setIsLoading(true);
      
      try {
        // Primero vamos a probar la conexión básica
        console.log("🧪 Testing conexión a Supabase...");
        const testConnection = await supabase.from("customers_").select("count", { count: "exact", head: true });
        console.log("📡 Test de conexión:", testConnection);

        const { data, error } = await supabase
          .from("customers_")
          .select("id, codigo_cliente, alias, razon_social, celular, email");
        
        console.log("📊 Respuesta de Supabase:", { data, error });
        
        if (error) {
          console.error("❌ Error al cargar clientes:", error);
          console.error("Código de error:", error.code);
          console.error("Mensaje de error:", error.message);
          console.error("Detalles del error:", error.details);
          console.error("Hint:", error.hint);
          setCustomers([]);
        } else {
          console.log("✅ Datos cargados exitosamente:", data);
          console.log("📈 Cantidad de clientes encontrados:", data?.length || 0);
          
          const formattedCustomers = (data || []).map(c => {
            console.log("🔄 Procesando cliente:", c);
            return {
              id: c.id,
              codigo_cliente: c.codigo_cliente,
              name: c.razon_social || c.alias || "Sin nombre",
              phone: c.celular || "",
              email: c.email || "",
              status: "active", // Default status since column doesn't exist
            };
          });
          
          console.log("🎯 Clientes formateados:", formattedCustomers);
          setCustomers(formattedCustomers);
        }
      } catch (err) {
        console.error("💥 Error inesperado al cargar clientes:", err);
        console.error("Stack trace:", err.stack);
        setCustomers([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  const filtered = useMemo(() => {
    return customers.filter(c => {
      // Filtrar por texto de búsqueda
      const matchesSearch = !q || c.name.toLowerCase().includes(q.toLowerCase());
      
      // Filtrar por status (todos son "active" por defecto)
      const matchesStatus = filterStatus === "all" || filterStatus === "active";
      
      return matchesSearch && matchesStatus;
    });
  }, [customers, q, filterStatus]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    console.log("Intentando crear cliente con datos:", {
      razon_social: newName.trim(),
      alias: newName.trim(),
      tipo_cliente: newType,
      celular: newPhone || null,
    });

    try {
      const payload = {
        razon_social: newName.trim(),
        alias: newName.trim(),
        tipo_cliente: newType,
        celular: newPhone || null
      };

      const { data, error } = await supabase
        .from("customers_")
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error("Error detallado de Supabase:", error);
        console.error("Código de error:", error.code);
        console.error("Mensaje:", error.message);
        alert(`Error específico: ${error.message}`);
        return;
      }

      console.log("Cliente creado exitosamente:", data);

      // Agregar al estado local
      const newCustomer = {
        id: data.id,
        codigo_cliente: data.codigo_cliente,
        name: data.razon_social,
        phone: data.celular || "",
        email: data.email || ""
      };

      setCustomers(prev => [newCustomer, ...prev]);
      
      // Limpiar formulario
      setNewName("");
      setNewType("Revendedor");
      setNewPhone("");
      setShowNewModal(false);
      setSelectedId(data.id);

    } catch (error) {
      console.error("Error inesperado:", error);
      alert("Error inesperado al crear el cliente.");
    }
  };

  // Función para iniciar el proceso de eliminación
  const handleDeleteClick = (customerId) => {
    setDeleteCustomerId(customerId);
    setDeleteReason("");
    setDeletePassword("");
    setShowDeleteModal(true);
  };

  // Función para confirmar eliminación
  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    
    // Validaciones
    if (!deleteReason.trim()) {
      alert("Debes proporcionar una razón para eliminar el cliente.");
      return;
    }
    
    if (deletePassword !== "ELIMINAR") {
      alert("Debes escribir 'ELIMINAR' para confirmar.");
      return;
    }

    try {
      const customerToDelete = customers.find(c => c.id === deleteCustomerId);
      
      // Registrar la eliminación en una tabla de auditoría (opcional)
      await supabase.from("customer_deletions").insert([{
        customer_id: deleteCustomerId,
        customer_name: customerToDelete?.name,
        reason: deleteReason.trim(),
        deleted_at: new Date().toISOString(),
        // deleted_by: currentUser.id // Si tienes sistema de usuarios
      }]);

      // Eliminar el cliente
      const { error } = await supabase
        .from("customers_")
        .delete()
        .eq("id", deleteCustomerId);

      if (error) {
        console.error("Error al eliminar cliente:", error);
        alert(`Error al eliminar: ${error.message}`);
        return;
      }

      // Actualizar estado local
      setCustomers(prev => prev.filter(c => c.id !== deleteCustomerId));
      
      // Si el cliente eliminado estaba seleccionado, deseleccionar
      if (selectedId === deleteCustomerId) {
        setSelectedId(null);
      }

      // Cerrar modal
      setShowDeleteModal(false);
      setDeleteCustomerId(null);
      
      alert("Cliente eliminado exitosamente.");

    } catch (error) {
      console.error("Error inesperado al eliminar:", error);
      alert("Error inesperado al eliminar el cliente.");
    }
  };

  // Función para abrir el modal de edición con los datos del cliente
  const handleEditClick = (customer) => {
    setEditingCustomer(customer);
    setEditName(customer.name || "");
    setEditPhone(customer.phone || "");
    setEditEmail(customer.email || "");
    // Buscar datos completos del cliente
    fetchCustomerDetails(customer.id);
    setShowEditModal(true);
  };

  const fetchCustomerDetails = async (customerId) => {
    const { data, error } = await supabase
      .from("customers_")
      .select("*")
      .eq("id", customerId)
      .single();
      
    if (data && !error) {
      setEditName(data.razon_social || data.alias || "");
      setEditType(data.tipo_cliente || "Revendedor");
  setEditPhone(data.celular || "");
      setEditEmail(data.email || "");
      setEditAddress(data.direccion || "");
      setEditRFC(data.rfc || "");
    }
  };

  // Función para guardar los cambios del cliente editado
  // Función para limpiar el formulario de edición
  const clearEditForm = () => {
    setShowEditModal(false);
    setEditingCustomer(null);
    setEditName("");
    setEditType("Revendedor");
    setEditPhone("");
    setEditEmail("");
    setEditAddress("");
    setEditRFC("");
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      alert("El nombre es obligatorio");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("customers_")
        .update({
          razon_social: editName.trim(),
          alias: editName.trim(),
          tipo_cliente: editType,
          celular: editPhone || null,
          email: editEmail || null,
          direccion: editAddress || null,
          rfc: editRFC || null,
        })
        .eq("id", editingCustomer.id)
        .select()
        .single();

      if (error) {
        console.error("Error al actualizar cliente:", error);
        alert(`Error al actualizar: ${error.message}`);
        return;
      }

      // Actualizar en el estado local
      setCustomers(prev => prev.map(c => 
        c.id === editingCustomer.id 
          ? {
              ...c,
              name: data.razon_social,
              phone: data.celular || "",
              email: data.email || "",
            }
          : c
      ));

      // Cerrar modal y limpiar formulario
      clearEditForm();
      
      alert("Cliente actualizado exitosamente");

    } catch (error) {
      console.error("Error inesperado:", error);
      alert("Error inesperado al actualizar el cliente.");
    }
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

  const resetLayout = () => {
    setListWidth(400);
  };

  const selectedCustomer = customers.find(c => c.id === selectedId);
  const customerToDelete = customers.find(c => c.id === deleteCustomerId);

  return (
    <div
      className="flex gap-0 relative select-none h-[calc(100vh-48px)]"
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
              <button 
                onClick={() => window.location.reload()} 
                className="bg-gray-500 text-white px-3 py-1 rounded text-xs"
                title="Recargar datos"
              >
                🔄
              </button>
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
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <div className="text-sm text-gray-500">Cargando clientes...</div>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">👥</div>
                <div className="text-sm text-gray-500">
                  {customers.length === 0 ? "No hay clientes en la base de datos" : "No se encontraron clientes con los filtros aplicados"}
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Total en BD: {customers.length} clientes
                </div>
              </div>
            ) : (
              filtered.map(c => (
                <div key={c.id} className="relative group">
                  <div onClick={() => setSelectedId(c.id)} className="cursor-pointer">
                    <CustomerCard customer={c} active={c.id === selectedId} metric={metric} />
                  </div>
                  {/* Botones que aparecen al hacer hover */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(c);
                      }}
                      className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-blue-600"
                      title="Editar cliente"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(c.id);
                      }}
                      className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      title="Eliminar cliente"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
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
        <div className="absolute inset-y-0 left-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
        
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

      {/* Modal para crear cliente */}
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
                <option>Revendedor</option>
                <option>Cliente Final</option>
                <option>Otro</option>
              </select>
            </div>
            <div className="w-32">
              <label className="block text-xs text-gray-600">Tipo</label>
              <div className="text-sm text-gray-500 py-1">Cliente Final</div>
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

      {/* Modal para eliminar cliente */}
      <Modal open={showDeleteModal} title="Eliminar Cliente" onClose={() => setShowDeleteModal(false)}>
        <form onSubmit={handleConfirmDelete}>
          <div className="mb-4 p-4 bg-red-50 rounded border border-red-200">
            <div className="flex items-center gap-2 text-red-700 mb-2">
              <span className="text-xl">⚠️</span>
              <span className="font-semibold">¡Advertencia!</span>
            </div>
            <p className="text-sm text-red-600">
              Estás a punto de eliminar permanentemente al cliente: 
              <span className="font-bold"> {customerToDelete?.name}</span>
            </p>
            <p className="text-xs text-red-500 mt-1">
              Esta acción no se puede deshacer. Se eliminarán todos los datos relacionados.
            </p>
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Razón para eliminar el cliente: <span className="text-red-500">*</span>
            </label>
            <select 
              value={deleteReason} 
              onChange={e => setDeleteReason(e.target.value)} 
              className="w-full border rounded px-3 py-2 focus:border-red-500"
              required
            >
              <option value="">Seleccionar razón...</option>
              <option value="Cliente duplicado">Cliente duplicado</option>
              <option value="Información incorrecta">Información incorrecta</option>
              <option value="Cliente inactivo permanente">Cliente inactivo permanente</option>
              <option value="Solicitud del cliente">Solicitud del cliente</option>
              <option value="Error de captura">Error de captura</option>
              <option value="Otro motivo">Otro motivo</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Para confirmar, escribe: <span className="font-mono bg-gray-100 px-2 py-1 rounded">ELIMINAR</span>
            </label>
            <input 
              type="text"
              value={deletePassword} 
              onChange={e => setDeletePassword(e.target.value)} 
              className="w-full border rounded px-3 py-2 focus:border-red-500"
              placeholder="Escribe ELIMINAR para confirmar"
              required
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button 
              type="button" 
              onClick={() => setShowDeleteModal(false)} 
              className="px-4 py-2 rounded border hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
              disabled={!deleteReason || deletePassword !== "ELIMINAR"}
            >
              Eliminar Definitivamente
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal para editar cliente */}
      <Modal open={showEditModal} title="Editar Cliente" onClose={clearEditForm}>
        <form onSubmit={handleSaveEdit}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre / Razón Social <span className="text-red-500">*</span>
              </label>
              <input 
                value={editName} 
                onChange={e => setEditName(e.target.value)} 
                className="w-full border rounded px-3 py-2 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cliente</label>
              <select 
                value={editType} 
                onChange={e => setEditType(e.target.value)} 
                className="w-full border rounded px-3 py-2"
              >
                <option>Revendedor</option>
                <option>Cliente Final</option>
                <option>Otro</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RFC</label>
              <input 
                value={editRFC} 
                onChange={e => setEditRFC(e.target.value)} 
                className="w-full border rounded px-3 py-2"
                placeholder="RFC (opcional)"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input 
                value={editPhone} 
                onChange={e => setEditPhone(e.target.value)} 
                className="w-full border rounded px-3 py-2"
                placeholder="+52..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input 
                type="email"
                value={editEmail} 
                onChange={e => setEditEmail(e.target.value)} 
                className="w-full border rounded px-3 py-2"
                placeholder="correo@ejemplo.com"
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <textarea 
                value={editAddress} 
                onChange={e => setEditAddress(e.target.value)} 
                className="w-full border rounded px-3 py-2 h-20 resize-none"
                placeholder="Dirección completa (opcional)"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t">
            <button 
              type="button" 
              onClick={clearEditForm} 
              className="px-4 py-2 rounded border hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}