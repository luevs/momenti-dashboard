import React, { useState, useEffect } from "react";
import { Plus, X, User, Trash2, Edit, History, Clock, Calendar, FileText } from "lucide-react";
import { supabase } from "../supabaseClient";

// Colores para el estado
const estadoColores = {
  activo: "bg-green-100 text-green-800",
  expirado: "bg-red-100 text-red-800",
};

// Función para determinar el estado visual
const getClientStatus = (remainingMeters, totalMeters) => {
  if (remainingMeters <= 0) {
    return 'expirado';
  }
  const remainingPercentage = (remainingMeters / totalMeters) * 100;
  return 'activo';
};

// Función para formatear fecha
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Función para obtener usuario actual (personalizar según tu sistema de auth)
const getCurrentUser = () => {
  return localStorage.getItem('currentUser') || 'Sistema';
};

export default function ClientesLealtad() {
  const [clientes, setClientes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [metrosConsumidos, setMetrosConsumidos] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("DTF");
  const [isLoading, setIsLoading] = useState(true);
  
  const [addClientModalOpen, setAddClientModalOpen] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: "", type: "DTF", totalMeters: "", numeroWpp: "", lastPurchase: "" });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState([]);
  const [deletorName, setDeletorName] = useState("");
  const deleteReasonsList = ["Error de captura", "Cliente inactivo", "Solicitud del cliente", "Cierre de negocio"];
  
  const [searchQuery, setSearchQuery] = useState("");
  const [showExpiringClients, setShowExpiringClients] = useState(false);

  // Estados para el modal de edición
  const [editClientModalOpen, setEditClientModalOpen] = useState(false);
  const [editingClientData, setEditingClientData] = useState(null);

  // Estados para el historial
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [clientHistory, setClientHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Estados para el modal de pedido mejorado
  const [observaciones, setObservaciones] = useState("");
  const [registeredBy, setRegisteredBy] = useState(getCurrentUser());

  const fetchClients = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('loyalty_clients')
      .select('*')
      .eq('type', filtroTipo);

    if (error) {
      console.error("Error al obtener clientes:", error);
    } else {
      setClientes(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, [filtroTipo]);

  const abrirModal = (cliente) => {
    setSelectedClient(cliente);
    setModalOpen(true);
    setObservaciones("");
    setRegisteredBy(getCurrentUser());
  };

  const cerrarModal = () => {
    setModalOpen(false);
    setSelectedClient(null);
    setMetrosConsumidos("");
    setObservaciones("");
  };

  // Función para obtener historial de un cliente
  const getClientHistory = async (clientId) => {
    setIsLoadingHistory(true);
    const { data, error } = await supabase
      .from('order_history')
      .select('*')
      .eq('client_id', clientId)
      .order('recorded_at', { ascending: false });

    if (error) {
      console.error("Error al obtener historial:", error);
      setClientHistory([]);
    } else {
      setClientHistory(data || []);
    }
    setIsLoadingHistory(false);
  };

  // Abrir modal de historial
  const openHistoryModal = (cliente) => {
    setSelectedClient(cliente);
    setHistoryModalOpen(true);
    getClientHistory(cliente.id);
  };

  // Cerrar modal de historial
  const closeHistoryModal = () => {
    setHistoryModalOpen(false);
    setSelectedClient(null);
    setClientHistory([]);
  };

  // Función mejorada para registrar pedido con historial
  const registrarPedido = async () => {
    if (!selectedClient || !metrosConsumidos || isNaN(parseFloat(metrosConsumidos)) || parseFloat(metrosConsumidos) <= 0) {
      alert("Por favor, ingresa una cantidad de metros válida.");
      return;
    }

    if (!registeredBy.trim()) {
      alert("Por favor, ingresa quién está registrando el pedido.");
      return;
    }

    try {
      const metros = parseFloat(metrosConsumidos);
      const newRemaining = selectedClient.remainingMeters - metros;
      
      // 1. Primero guardamos el historial del pedido
      const { data: historyData, error: historyError } = await supabase
        .from('order_history')
        .insert([
          {
            client_id: selectedClient.id,
            client_name: selectedClient.name,
            meters_consumed: metros,
            recorded_at: new Date().toISOString(),
            recorded_by: registeredBy.trim(),
            observaciones: observaciones.trim() || null
          }
        ])
        .select();

      if (historyError) {
        console.error("Error al guardar historial:", historyError);
        alert("Hubo un error al guardar el historial del pedido: " + historyError.message);
        return;
      }

      // 2. Si el historial se guardó correctamente, actualizamos el cliente
      const { data, error } = await supabase
        .from('loyalty_clients')
        .update({ 
          remainingMeters: newRemaining,
          status: getClientStatus(newRemaining, selectedClient.totalMeters),
          lastPurchase: new Date().toISOString().slice(0, 10)
        })
        .eq('id', selectedClient.id)
        .select();

      if (error) {
        console.error("Error al actualizar el cliente en Supabase:", error);
        alert("Hubo un error al actualizar los metros: " + error.message);
        
        // Si falla la actualización del cliente, eliminamos el registro del historial
        await supabase
          .from('order_history')
          .delete()
          .eq('id', historyData[0].id);
      } else {
        // ✅ Todo salió bien
        alert(`Pedido registrado correctamente. ${metros}m consumidos de ${selectedClient.name}`);
        cerrarModal();
        fetchClients();
      }
    } catch (err) {
      console.error("Error inesperado en registrarPedido:", err);
      alert("Ocurrió un error inesperado. Revisa la consola para más detalles.");
    }
  };

  const handleAddClient = async () => {
    const { name, type, totalMeters, numeroWpp, lastPurchase } = newClientData;
    if (!name || !totalMeters || !lastPurchase) {
      alert("Por favor, completa todos los campos obligatorios.");
      return;
    }

    const initialStatus = getClientStatus(totalMeters, totalMeters);

    try {
      const { error } = await supabase
        .from('loyalty_clients')
        .insert([
          { 
            name, 
            type, 
            totalMeters: parseFloat(totalMeters), 
            remainingMeters: parseFloat(totalMeters),
            status: initialStatus,
            lastPurchase: lastPurchase,
            numeroWpp: numeroWpp
          }
        ]);

      if (error) {
        console.error("Error al agregar cliente:", error);
        alert("Hubo un error al agregar el cliente: " + error.message);
      } else {
        alert("Cliente agregado correctamente");
        setAddClientModalOpen(false);
        setNewClientData({ name: "", type: "DTF", totalMeters: "", numeroWpp: "", lastPurchase: "" });
        fetchClients();
      }
    } catch (err) {
      console.error("Error inesperado al agregar cliente:", err);
      alert("Ocurrió un error inesperado.");
    }
  };
  
  const handleDeleteClient = async () => {
    if (!deleteReason.length || !deletorName) {
      alert("Por favor, selecciona al menos una razón y escribe tu nombre.");
      return;
    }
  
    try {
      const { data: auditData, error: auditError } = await supabase
        .from('deleted_clients_audit')
        .insert([
          {
            deleted_at: new Date().toISOString(),
            client_id: selectedClient.id,
            client_name: selectedClient.name,
            deleted_by_name: deletorName,
            reasons: deleteReason,
          }
        ]);
  
      if (auditError) {
        console.error("Error al registrar la eliminación:", auditError);
        alert("Hubo un error al registrar la eliminación. Intenta de nuevo. Detalles: " + auditError.message);
        return;
      }
  
      const { error: deleteError } = await supabase
        .from('loyalty_clients')
        .delete()
        .eq('id', selectedClient.id);
  
      if (deleteError) {
        console.error("Error al eliminar el cliente:", deleteError);
        alert("Hubo un error al eliminar el cliente. El registro de auditoría fue guardado. Detalles: " + deleteError.message);
      } else {
        alert("Cliente eliminado con éxito y registrado.");
        setDeleteModalOpen(false);
        setDeleteReason([]);
        setDeletorName("");
        fetchClients();
      }
    } catch (err) {
      console.error("Error inesperado al eliminar cliente:", err);
      alert("Ocurrió un error inesperado.");
    }
  };
  
  const toggleReason = (reason) => {
    if (deleteReason.includes(reason)) {
      setDeleteReason(deleteReason.filter(r => r !== reason));
    } else {
      setDeleteReason([...deleteReason, reason]);
    }
  };

  const handleOpenEditModal = (client) => {
    setEditingClientData({ ...client });
    setEditClientModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditClientModalOpen(false);
    setEditingClientData(null);
  };

  const handleSaveEdit = async () => {
    if (!editingClientData.name || !editingClientData.totalMeters) {
      alert("El nombre y los metros totales son campos obligatorios.");
      return;
    }

    try {
      const { error } = await supabase
        .from('loyalty_clients')
        .update({
          name: editingClientData.name,
          type: editingClientData.type,
          totalMeters: parseFloat(editingClientData.totalMeters),
          remainingMeters: parseFloat(editingClientData.remainingMeters),
          numeroWpp: editingClientData.numeroWpp,
          lastPurchase: editingClientData.lastPurchase
        })
        .eq('id', editingClientData.id);

      if (error) {
        console.error("Error al actualizar el cliente:", error);
        alert("Hubo un error al actualizar los datos del cliente: " + error.message);
      } else {
        alert("Cliente actualizado correctamente");
        handleCloseEditModal();
        fetchClients();
      }
    } catch (err) {
      console.error("Error inesperado al guardar la edición:", err);
      alert("Ocurrió un error inesperado. Revisa la consola.");
    }
  };

  // Calcular estadísticas del historial
  const calculateHistoryStats = (history) => {
    if (!history.length) return { total: 0, promedio: 0, ultimoMes: 0 };
    
    const total = history.reduce((sum, record) => sum + record.meters_consumed, 0);
    const promedio = total / history.length;
    
    const unMesAtras = new Date();
    unMesAtras.setMonth(unMesAtras.getMonth() - 1);
    
    const ultimoMes = history
      .filter(record => new Date(record.recorded_at) >= unMesAtras)
      .reduce((sum, record) => sum + record.meters_consumed, 0);
    
    return { total, promedio: promedio.toFixed(2), ultimoMes };
  };
  
  const filteredClients = clientes
    .filter(cliente => {
      const matchesName = cliente.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesExpiring = showExpiringClients ? cliente.remainingMeters < 5 : true;
      return matchesName && matchesExpiring;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clientes con Programa de Lealtad</h1>
        <button
          onClick={() => setAddClientModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Agregar Cliente
        </button>
      </div>
      
      {/* Selector de tipo y buscador */}
      <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
        <div className="flex space-x-2">
          <button
            onClick={() => { setFiltroTipo("DTF"); setShowExpiringClients(false); }}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filtroTipo === "DTF" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            DTF
          </button>
          <button
            onClick={() => { setFiltroTipo("UV DTF"); setShowExpiringClients(false); }}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filtroTipo === "UV DTF" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            UV DTF
          </button>
        </div>
        <div className="flex-1 w-full">
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setShowExpiringClients(!showExpiringClients)}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            showExpiringClients ? "bg-yellow-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          {showExpiringClients ? "Todos los Clientes" : "A punto de expirar"}
        </button>
      </div>

      {isLoading ? (
        <p className="text-center text-gray-500 mt-4">Cargando clientes...</p>
      ) : filteredClients.length === 0 ? (
        <p className="text-center text-gray-500 mt-4">No hay clientes con este tipo de programa.</p>
      ) : (
        <div className="bg-white rounded-xl shadow p-4">
          <div className="grid grid-cols-8 font-semibold text-gray-600 border-b pb-2 mb-2">
            <span className="col-span-2">Cliente</span>
            <span>Total</span>
            <span>Restantes</span>
            <span className="text-right">Última Compra</span>
            <span className="text-right col-span-2">Acciones</span>
          </div>
          <ul className="divide-y divide-gray-200">
            {filteredClients.map((cliente) => {
              const clientStatus = getClientStatus(cliente.remainingMeters, cliente.totalMeters);
              const isAboutToExpire = cliente.remainingMeters <= (cliente.totalMeters * 0.5);
              
              let rowClasses = "py-3 transition grid grid-cols-8 items-center";
              if (clientStatus === 'expirado') {
                rowClasses += " bg-red-50 hover:bg-red-100";
              } else if (isAboutToExpire) {
                rowClasses += " bg-yellow-50 hover:bg-yellow-100";
              } else {
                rowClasses += " hover:bg-gray-50";
              }
              
              return (
                <li key={cliente.id} className={rowClasses}>
                  <div className="flex flex-col col-span-2 items-start">
                    <div className="flex items-center gap-2">
                      <User className="text-blue-600" size={24} />
                      <div>
                        <h2 className="font-semibold">{cliente.name}</h2>
                        {isAboutToExpire && (
                          <span className="mt-1 text-xs px-2 py-1 rounded-full bg-yellow-200 text-yellow-800 font-semibold">
                            Por expirar
                          </span>
                        )}
                        <span className={`block mt-1 text-xs px-2 py-1 rounded-full ${estadoColores[clientStatus]}`}>
                          {clientStatus}
                        </span>
                        <span className="block text-gray-500 text-sm mt-1">{cliente.numeroWpp}</span>
                      </div>
                    </div>
                  </div>
                  <span>{cliente.totalMeters} m</span>
                  <span>{cliente.remainingMeters} m</span>
                  <span className="text-right">{cliente.lastPurchase}</span>
                  <div className="flex justify-end col-span-2 space-x-2">
                    <button
                      onClick={() => openHistoryModal(cliente)}
                      className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded hover:bg-purple-200 transition flex items-center gap-1"
                      title="Ver historial"
                    >
                      <History size={14} />
                      Historial
                    </button>
                    <button
                      onClick={() => abrirModal(cliente)}
                      className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 transition"
                    >
                      Registrar Pedido
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(cliente)}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded-full"
                      aria-label="Editar cliente"
                    >
                      <Edit size={20} />
                    </button>
                    <button
                      onClick={() => { setSelectedClient(cliente); setDeleteModalOpen(true); }}
                      className="p-1 text-red-600 hover:bg-red-100 rounded-full"
                      aria-label="Eliminar cliente"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* MODAL MEJORADO para registrar pedido */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg relative">
            <button
              onClick={cerrarModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>
            <h2 className="text-xl font-semibold mb-4">
              Registrar pedido para {selectedClient?.name}
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-gray-700 font-bold mb-2">Metros consumidos *</label>
                <input
                  type="number"
                  placeholder="Metros consumidos"
                  value={metrosConsumidos}
                  onChange={(e) => setMetrosConsumidos(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  min="0"
                  step="0.1"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 font-bold mb-2">Registrado por *</label>
                <input
                  type="text"
                  placeholder="Nombre de quien registra"
                  value={registeredBy}
                  onChange={(e) => setRegisteredBy(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-2">Observaciones</label>
                <textarea
                  placeholder="Notas adicionales (opcional)"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="border rounded px-3 py-2 w-full h-20 resize-none"
                />
              </div>

              {selectedClient && (
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <p><strong>Metros restantes actuales:</strong> {selectedClient.remainingMeters}m</p>
                  <p><strong>Después del pedido:</strong> {selectedClient.remainingMeters - parseFloat(metrosConsumidos || 0)}m</p>
                </div>
              )}

              <button
                onClick={registrarPedido}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Guardar Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE HISTORIAL */}
      {historyModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-4xl max-h-[80vh] overflow-y-auto shadow-lg relative">
            <button
              onClick={closeHistoryModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>
            
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <History className="text-purple-600" size={24} />
              Historial de {selectedClient?.name}
            </h2>

            {isLoadingHistory ? (
              <p className="text-center text-gray-500 py-8">Cargando historial...</p>
            ) : clientHistory.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No hay registros de pedidos para este cliente.</p>
            ) : (
              <>
                {/* Estadísticas */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {(() => {
                    const stats = calculateHistoryStats(clientHistory);
                    return (
                      <>
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                          <p className="text-2xl font-bold text-blue-600">{stats.total}m</p>
                          <p className="text-sm text-gray-600">Total consumido</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                          <p className="text-2xl font-bold text-green-600">{stats.promedio}m</p>
                          <p className="text-sm text-gray-600">Promedio por pedido</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg text-center">
                          <p className="text-2xl font-bold text-purple-600">{stats.ultimoMes}m</p>
                          <p className="text-sm text-gray-600">Último mes</p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Lista de historial */}
                <div className="space-y-4">
                  {clientHistory.map((record) => (
                    <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="text-gray-400" size={16} />
                            <span className="text-lg font-semibold text-blue-600">
                              {record.meters_consumed}m
                            </span>
                            <span className="text-sm text-gray-500">
                              - {formatDate(record.recorded_at)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <span className="flex items-center gap-1">
                              <User size={14} />
                              Registrado por: {record.recorded_by}
                            </span>
                          </div>

                          {/* Comentado hasta agregar columna observaciones
                          {record.observaciones && (
                            <div className="flex items-start gap-2 mt-2">
                              <FileText className="text-gray-400 mt-0.5" size={14} />
                              <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                {record.observaciones}
                              </p>
                            </div>
                          )}
                          */}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL para agregar nuevo cliente */}
      {addClientModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg relative">
            <button
              onClick={() => setAddClientModalOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>
            <h2 className="text-xl font-semibold mb-4">
              Agregar nuevo cliente con programa
            </h2>
            <div className="flex flex-col gap-4">
              <label className="block text-gray-700 font-bold">Nombre del cliente *</label>
              <input
                type="text"
                placeholder="Nombre del cliente"
                value={newClientData.name}
                onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                className="border rounded px-3 py-2 w-full"
              />
              <label className="block text-gray-700 font-bold">Número de WhatsApp</label>
              <input
                type="text"
                placeholder="Número de WhatsApp"
                value={newClientData.numeroWpp}
                onChange={(e) => setNewClientData({ ...newClientData, numeroWpp: e.target.value })}
                className="border rounded px-3 py-2 w-full"
              />
              <label className="block text-gray-700 font-bold">Tipo de programa *</label>
              <select
                value={newClientData.type}
                onChange={(e) => setNewClientData({ ...newClientData, type: e.target.value })}
                className="border rounded px-3 py-2 w-full"
              >
                <option value="DTF">DTF</option>
                <option value="UV DTF">UV DTF</option>
              </select>
              <label className="block text-gray-700 font-bold">Metros totales del programa *</label>
              <input
                type="number"
                placeholder="Metros totales del programa"
                value={newClientData.totalMeters}
                onChange={(e) => setNewClientData({ ...newClientData, totalMeters: e.target.value })}
                className="border rounded px-3 py-2 w-full"
                min="0"
              />
              <label className="block text-gray-700 font-bold">Fecha de compra *</label>
              <input
                type="date"
                placeholder="Fecha de compra"
                value={newClientData.lastPurchase}
                onChange={(e) => setNewClientData({ ...newClientData, lastPurchase: e.target.value })}
                className="border rounded px-3 py-2 w-full"
              />
              <button
                onClick={handleAddClient}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Guardar Cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}