import React, { useState, useEffect } from "react";
import { Plus, X, User, Trash2, Edit, History, Clock, Calendar, FileText } from "lucide-react";
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import SignatureCanvas from "react-signature-canvas";
import LoyaltyTicket from "../components/LoyaltyTicket";

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

function getExpiringThreshold(totalMeters) {
  if (totalMeters <= 5) return 0.5;
  if (totalMeters > 5 && totalMeters <= 10) return 0.333;
  if (totalMeters > 10 && totalMeters <= 30) return 0.2;
  return 0.1;
}

export default function ClientesLealtad() {
  const [allClients, setAllClients] = useState([]);
  const [clientes, setClientes] = useState([]); // filtrados por tipo
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [metrosConsumidos, setMetrosConsumidos] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("DTF Textil");
  const [isLoading, setIsLoading] = useState(true);
  
  const [addClientModalOpen, setAddClientModalOpen] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: "", type: "DTF Textil", totalMeters: "", numeroWpp: "", lastPurchase: "" });

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
  const [registeredByCustom, setRegisteredByCustom] = useState("");

  // Nuevos estados para el historial global
  const [globalHistoryModalOpen, setGlobalHistoryModalOpen] = useState(false);
  const [globalHistory, setGlobalHistory] = useState([]);
  const [isLoadingGlobalHistory, setIsLoadingGlobalHistory] = useState(false);

  // Estados para el modal de pedido mejorado
  const [postPedidoModalOpen, setPostPedidoModalOpen] = useState(false);
  const [ultimoPedidoGuardado, setUltimoPedidoGuardado] = useState(null);

  const [activeTab, setActiveTab] = useState("clientes"); // "clientes" o "historial"

  // NUEVOS ESTADOS PARA EL TICKET
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketData, setTicketData] = useState(null);

  // Estados adicionales
  const [signatureData, setSignatureData] = useState("");
  const signatureRef = React.useRef();
  const [autorizacionCliente, setAutorizacionCliente] = useState(false);

  // 1. Solo una función para traer todos los clientes
  const fetchClients = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('loyalty_clients')
      .select('*');
    if (error) {
      console.error("Error al obtener clientes:", error);
    } else {
      setAllClients(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

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
    if (!autorizacionCliente) {
      alert("Por favor, confirma la autorización del cliente.");
      return;
    }

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
            type: selectedClient.type,
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
        // NUEVA LÓGICA - PREPARAR DATOS DEL TICKET
        const ticketInfo = {
          client: {
            id: selectedClient.id,
            name: selectedClient.name,
            type: selectedClient.type,
            totalMeters: selectedClient.totalMeters,
            remainingMeters: newRemaining, // Metros después del pedido
            numeroWpp: selectedClient.numeroWpp
          },
          order: {
            metersConsumed: metros,
            registeredBy: registeredBy.trim(),
            observaciones: observaciones.trim(),
            recordedAt: new Date().toISOString(),
            folio: Math.floor(Math.random() * 9999) + 1000
          }
        };

        // Guardado exitoso - preparar datos para ambos modales
        setUltimoPedidoGuardado({
          cliente: selectedClient,
          metros: metros,
          observaciones,
          registradoPor: registeredBy,
          fecha: new Date().toLocaleDateString('es-MX')
        });

        // PREPARAR DATOS DEL TICKET
        setTicketData(ticketInfo);

        cerrarModal();
        setPostPedidoModalOpen(true);
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
        setNewClientData({ name: "", type: "DTF Textil", totalMeters: "", numeroWpp: "", lastPurchase: "" });
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
    if (
      !editingClientData.name ||
      !editingClientData.totalMeters ||
      !editingClientData.editReason ||
      !editingClientData.editAuthorizedBy
    ) {
      alert("Todos los campos son obligatorios, incluyendo razón y autorización.");
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
          lastPurchase: editingClientData.lastPurchase,
          editReason: editingClientData.editReason,
          editAuthorizedBy: editingClientData.editAuthorizedBy
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
  
  // 2. Filtra los clientes para la tabla
  const filteredClients = allClients
    .filter(cliente => cliente.type === filtroTipo)
    .filter(cliente => cliente.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(cliente => {
      if (!showExpiringClients) return true;
      const clientStatus = getClientStatus(cliente.remainingMeters, cliente.totalMeters);
      const expiringThreshold = getExpiringThreshold(cliente.totalMeters);
      return (
        clientStatus === 'activo' &&
        cliente.remainingMeters > 0 &&
        cliente.remainingMeters <= (cliente.totalMeters * expiringThreshold)
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const fetchGlobalHistory = async () => {
    setIsLoadingGlobalHistory(true);
    const { data, error } = await supabase
      .from('order_history')
      .select('*')
      .order('recorded_at', { ascending: false });

    if (error) {
      console.error("Error al obtener historial global:", error);
      setGlobalHistory([]);
    } else {
      setGlobalHistory(data || []);
    }
    setIsLoadingGlobalHistory(false);
  };

  useEffect(() => {
    if (globalHistoryModalOpen) {
      fetchGlobalHistory();
    }
  }, [globalHistoryModalOpen]);

  const exportGlobalHistoryToExcel = () => {
    if (!globalHistory.length) return;
    const worksheet = XLSX.utils.json_to_sheet(globalHistory);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "historial_global.xlsx");
  };

  const handleDeleteHistoryRecord = async (historyId) => {
    if (!window.confirm("¿Seguro que deseas eliminar este registro del historial?")) return;
    const { error } = await supabase
      .from('order_history')
      .delete()
      .eq('id', historyId);

    if (error) {
      alert("Error al eliminar el registro: " + error.message);
    } else {
      setGlobalHistory(globalHistory.filter(r => r.id !== historyId));
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clientes con Programa de Lealtad</h1>
        <div className="flex gap-2">
          {/* Botón de historial global */}
          <button
            onClick={() => { setActiveTab("historial"); fetchGlobalHistory(); }}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 hover:bg-purple-200 transition"
            title="Ver historial global"
          >
            <History className="text-purple-600" size={22} />
          </button>
          {/* Botón de agregar cliente */}
          <button
            onClick={() => setAddClientModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={18} />
            Agregar Cliente
          </button>
        </div>
      </div>
      
      {/* SCORECARDS */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-600">
            {allClients.filter(c => c.type === "DTF Textil").length}
          </p>
          <p className="text-sm text-gray-600">Clientes DTF Textil</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-purple-600">
            {allClients.filter(c => c.type === "UV DTF").length}
          </p>
          <p className="text-sm text-gray-600">Clientes UV DTF</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-600">
            {allClients.length}
          </p>
          <p className="text-sm text-gray-600">Programas vendidos</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-yellow-600">
            {allClients.reduce((sum, c) => sum + parseFloat(c.totalMeters), 0)}
          </p>
          <p className="text-sm text-gray-600">Metros vendidos</p>
        </div>
      </div>

      {/* Selector de tipo y buscador */}
      <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
        <div className="flex space-x-2">
          <button
            onClick={() => { setFiltroTipo("DTF Textil"); setShowExpiringClients(false); }}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filtroTipo === "DTF Textil" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            DTF Textil
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
                <select
                  value={registeredBy}
                  onChange={e => setRegisteredBy(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                >
                  <option value="">Selecciona...</option>
                  <option value="Jasiel">Jasiel</option>
                  <option value="Daniela">Daniela</option>
                  <option value="Karla">Karla</option>
                  <option value="Eduardo">Eduardo</option>
                  <option value="Otro">Otro</option>
                </select>
                {registeredBy === "Otro" && (
                  <input
                    type="text"
                    placeholder="Escribe el nombre"
                    value={registeredByCustom}
                    onChange={e => setRegisteredByCustom(e.target.value)}
                    className="border rounded px-3 py-2 w-full mt-2"
                  />
                )}
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
                  <p>
                    <strong>Metros restantes actuales:</strong> {parseFloat(selectedClient.remainingMeters.toFixed(2))}m
                  </p>
                  <p>
                    <strong>Después del pedido:</strong>{" "}
                    {parseFloat((selectedClient.remainingMeters - parseFloat(metrosConsumidos || 0)).toFixed(2))}m
                  </p>
                </div>
              )}

              <div>
                <label className="block text-gray-700 font-bold mb-2">
                  Autorización del cliente *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autorizacionCliente}
                    onChange={e => setAutorizacionCliente(e.target.checked)}
                    id="autorizacionCliente"
                  />
                  <label htmlFor="autorizacionCliente" className="text-sm text-gray-700">
                    El cliente autoriza este pedido y está conforme.
                  </label>
                </div>
              </div>

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
                          <p className="text-2xl font-bold text-blue-600">{Number(stats.total).toFixed(2)}m</p>
                          <p className="text-sm text-gray-600">Total consumido</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                          <p className="text-2xl font-bold text-green-600">{Number(stats.promedio).toFixed(2)}m</p>
                          <p className="text-sm text-gray-600">Promedio por pedido</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg text-center">
                          <p className="text-2xl font-bold text-purple-600">{Number(stats.ultimoMes).toFixed(2)}m</p>
                          <p className="text-sm text-gray-600">Último mes</p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Lista de historial */}
                <div className="space-y-4">
                  {clientHistory.map((record, idx) => (
                    <div key={record.id} className="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center">
                      <div>
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
                      </div>
                      {/* Botón de WhatsApp solo para el último pedido y si hay número */}
                      {idx === 0 && selectedClient?.numeroWpp && (
                        <button
                          onClick={() => {
                            const numero = selectedClient.numeroWpp.replace(/\D/g, "");
                            const fechaPedido = new Date(record.recorded_at).toLocaleDateString('es-MX');
                            const saludo = `Saludos ${selectedClient.name}\nLe informamos que su pedido de ${record.type} ya está listo para que pase por el.`;
                            const metrosConsumidos = parseFloat(record.meters_consumed.toFixed(2));
                            const metrosRestantes = parseFloat(selectedClient.remainingMeters.toFixed(2));
                            const mensaje = `${saludo}\nEl día ${fechaPedido} consumiste ${metrosConsumidos} metros de tu programa de lealtad (${record.type}). Te quedan ${metrosRestantes} metros en tu plan. ¡Gracias por tu preferencia!`;
                            const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
                            window.open(url, "_blank");
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition mt-2 sm:mt-0"
                          title="Enviar mensaje de WhatsApp"
                        >
                          WhatsApp
                        </button>
                      )}
                      {idx === 0 && (
                        <button
                          onClick={() => {
                            // Prepara los datos del ticket igual que en registrarPedido
                            const ticketInfo = {
                              client: {
                                id: selectedClient.id,
                                name: selectedClient.name,
                                type: selectedClient.type,
                                totalMeters: selectedClient.totalMeters,
                                remainingMeters: selectedClient.remainingMeters,
                                numeroWpp: selectedClient.numeroWpp
                              },
                              order: {
                                metersConsumed: record.meters_consumed,
                                registeredBy: record.recorded_by,
                                observaciones: record.observaciones,
                                recordedAt: record.recorded_at,
                                folio: record.folio || Math.floor(Math.random() * 9999) + 1000
                              }
                            };
                            setTicketData(ticketInfo);
                            setTicketModalOpen(true);
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition mt-2 sm:mt-0"
                          title="Imprimir Ticket"
                        >
                          <FileText size={16} />
                          Imprimir Ticket
                        </button>
                      )}
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
              <span className="text-xs text-gray-500 mt-1 block">
                Formato recomendado: <b>521XXXXXXXXXX</b> (ejemplo para México, incluye código de país y número sin espacios ni signos)
              </span>
              <label className="block text-gray-700 font-bold">Tipo de programa *</label>
              <select
                value={newClientData.type}
                onChange={(e) => setNewClientData({ ...newClientData, type: e.target.value })}
                className="border rounded px-3 py-2 w-full"
              >
                <option value="DTF Textil">DTF Textil</option>
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

      {/* MODAL DE EDICIÓN */}
      {editClientModalOpen && editingClientData && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg relative max-h-[450px] overflow-y-auto">
            <button
              onClick={handleCloseEditModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>
            <h2 className="text-xl font-semibold mb-4">Editar cliente</h2>
            <div className="flex flex-col gap-4">
              <label className="block text-gray-700 font-bold">Nombre *</label>
              <input
                type="text"
                value={editingClientData.name}
                onChange={e => setEditingClientData({ ...editingClientData, name: e.target.value })}
                className="border rounded px-3 py-2 w-full"
              />
              <label className="block text-gray-700 font-bold">Número de WhatsApp</label>
              <input
                type="text"
                value={editingClientData.numeroWpp}
                onChange={e => setEditingClientData({ ...editingClientData, numeroWpp: e.target.value })}
                className="border rounded px-3 py-2 w-full"
              />
              <span className="text-xs text-gray-500 mt-1 block">
                Formato recomendado: <b>521XXXXXXXXXX</b> (ejemplo para México, incluye código de país y número sin espacios ni signos)
              </span>
              <label className="block text-gray-700 font-bold">Tipo de programa *</label>
              <select
                value={editingClientData.type}
                onChange={e => setEditingClientData({ ...editingClientData, type: e.target.value })}
                className="border rounded px-3 py-2 w-full"
              >
                <option value="DTF Textil">DTF Textil</option>
                <option value="UV DTF">UV DTF</option>
              </select>
              <label className="block text-gray-700 font-bold">Metros totales *</label>
              <input
                type="number"
                value={editingClientData.totalMeters}
                onChange={e => setEditingClientData({ ...editingClientData, totalMeters: e.target.value })}
                className="border rounded px-3 py-2 w-full"
                min="0"
              />
              <label className="block text-gray-700 font-bold">Metros restantes *</label>
              <input
                type="number"
                value={editingClientData.remainingMeters}
                onChange={e => setEditingClientData({ ...editingClientData, remainingMeters: e.target.value })}
                className="border rounded px-3 py-2 w-full"
                min="0"
              />
              <label className="block text-gray-700 font-bold">Fecha de última compra</label>
              <input
                type="date"
                value={editingClientData.lastPurchase}
                onChange={e => setEditingClientData({ ...editingClientData, lastPurchase: e.target.value })}
                className="border rounded px-3 py-2 w-full"
              />

              <label className="block text-gray-700 font-bold">Razón de Edición *</label>
              <input
                type="text"
                value={editingClientData.editReason || ""}
                onChange={e => setEditingClientData({ ...editingClientData, editReason: e.target.value })}
                className="border rounded px-3 py-2 w-full"
                placeholder="Explica la razón de la edición"
              />
              <label className="block text-gray-700 font-bold">Quién autoriza la edición *</label>
              <input
                type="text"
                value={editingClientData.editAuthorizedBy || ""}
                onChange={e => setEditingClientData({ ...editingClientData, editAuthorizedBy: e.target.value })}
                className="border rounded px-3 py-2 w-full"
                placeholder="Nombre de quien autoriza"
              />

              <button
                onClick={handleSaveEdit}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ELIMINACIÓN */}
      {deleteModalOpen && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg relative">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>
            <h2 className="text-xl font-semibold mb-4">Eliminar cliente</h2>
            <p className="mb-2">¿Por qué deseas eliminar a <strong>{selectedClient.name}</strong>?</p>
            <div className="flex flex-col gap-2 mb-4">
              {deleteReasonsList.map(reason => (
                <label key={reason} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={deleteReason.includes(reason)}
                    onChange={() => toggleReason(reason)}
                  />
                  {reason}
                </label>
              ))}
            </div>
            <label className="block text-gray-700 font-bold mb-2">Tu nombre *</label>
            <input
              type="text"
              value={deletorName}
              onChange={e => setDeletorName(e.target.value)}
              className="border rounded px-3 py-2 w-full mb-4"
              placeholder="Escribe tu nombre"
            />
            <button
              onClick={handleDeleteClient}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Confirmar eliminación
            </button>
          </div>
        </div>
      )}

      {/* Muestra la tabla de clientes solo si activeTab === "clientes" */}
      {activeTab === "clientes" && (
        <>
          {isLoading ? (
            <p className="text-center text-gray-500 mt-4">Cargando clientes...</p>
          ) : filteredClients.length === 0 ? (
            <p className="text-center text-gray-500 mt-4">No hay clientes con este tipo de programa.</p>
          ) : (
            <div className="bg-white rounded-xl shadow p-4">
              <div className="grid grid-cols-6 font-semibold text-gray-600 border-b pb-2 mb-2">
                <span>Cliente</span>
                <span>Contacto</span>
                <span>Total</span>
                <span>Restantes</span>
                <span>Última Compra</span>
                <span className="text-center">Acciones</span>
              </div>
              <ul className="divide-y divide-gray-200">
                {filteredClients.map((cliente) => {
                  const clientStatus = getClientStatus(cliente.remainingMeters, cliente.totalMeters);
                  const expiringThreshold = getExpiringThreshold(cliente.totalMeters);
                  const isAboutToExpire =
                    clientStatus === 'activo' &&
                    cliente.remainingMeters > 0 &&
                    cliente.remainingMeters <= (cliente.totalMeters * expiringThreshold);
                  
                  let rowClasses = "py-3 transition grid grid-cols-6 items-center";
                  if (clientStatus === 'expirado') {
                    rowClasses += " bg-red-50 hover:bg-red-100";
                  } else if (isAboutToExpire) {
                    rowClasses += " bg-yellow-50 hover:bg-yellow-100";
                  } else {
                    rowClasses += " hover:bg-gray-50";
                  }
                  
                  return (
                    <li key={cliente.id} className={rowClasses}>
                      {/* Cliente */}
                      <div className="flex items-center gap-2">
                        <User className="text-blue-600" size={24} />
                        <div>
                          <h2 className="font-semibold">{cliente.name}</h2>
                          {isAboutToExpire && (
                            <span className="mt-1 text-xs px-2 py-1 rounded-full bg-yellow-200 text-yellow-800 font-semibold">
                              Por expirar
                            </span>
                          )}
                          {clientStatus === 'expirado' && (
                            <span className="block mt-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">
                              expirado
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Contacto */}
                      <span className="truncate">{cliente.numeroWpp || "-"}</span>
                      {/* Total */}
                      <span>{parseFloat(cliente.totalMeters.toFixed(2))} m</span>
                      {/* Restantes */}
                      <span>{parseFloat(cliente.remainingMeters.toFixed(2))} m</span>
                      {/* Última Compra */}
                      <span>{cliente.lastPurchase}</span>
                      {/* Acciones */}
                      <div className="flex justify-center items-center gap-2">
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
        </>
      )}

      {/* Muestra la tabla de historial global solo si activeTab === "historial" */}
      {activeTab === "historial" && (
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <History className="text-purple-600" size={24} />
              Historial Global de Movimientos
            </h2>
            <div className="flex gap-2">
              <button
                onClick={exportGlobalHistoryToExcel}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Exportar a Excel
              </button>
              <button
                onClick={() => setActiveTab("clientes")}
                className="bg-gray-200 text-gray-700 px-3 py-2 rounded hover:bg-gray-300 flex items-center"
                title="Cerrar historial global"
              >
                <X size={18} className="mr-1" />
                Cerrar
              </button>
            </div>
          </div>
          {isLoadingGlobalHistory ? (
            <p className="text-center text-gray-500 py-8">Cargando historial...</p>
          ) : globalHistory.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No hay movimientos registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Fecha</th>
                    <th className="px-4 py-2 text-left">Cliente</th>
                    <th className="px-4 py-2 text-left">Tipo</th>
                    <th className="px-4 py-2 text-left">Metros consumidos</th>
                    <th className="px-4 py-2 text-left">Registrado por</th>
                    <th className="px-4 py-2 text-left">Observaciones</th>
                    <th className="px-4 py-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {globalHistory.map((record) => (
                    <tr key={record.id} className="border-b">
                      <td className="px-4 py-2">{formatDate(record.recorded_at)}</td>
                      <td className="px-4 py-2">{record.client_name}</td>
                      <td className="px-4 py-2">{record.type || ""}</td>
                      <td className="px-4 py-2">{record.meters_consumed}m</td>
                      <td className="px-4 py-2">{record.recorded_by}</td>
                      <td className="px-4 py-2">{record.observaciones || ""}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleDeleteHistoryRecord(record.id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded-full"
                          title="Eliminar registro"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL POST PEDIDO CON OPCIÓN DE TICKET */}
      {postPedidoModalOpen && ultimoPedidoGuardado && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg relative">
            <button
              onClick={() => setPostPedidoModalOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>
            <h2 className="text-xl font-semibold mb-4 text-center text-green-600">
              ¡Pedido Registrado Exitosamente!
            </h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-center">
                <strong className="text-blue-800">{ultimoPedidoGuardado.cliente.name}</strong>
              </p>
              <p className="text-center text-blue-600">
                <strong>{ultimoPedidoGuardado.metros}m</strong> consumidos de <strong>{ultimoPedidoGuardado.cliente.type}</strong>
              </p>
              <p className="text-sm text-center text-blue-500">
                Registrado por: {ultimoPedidoGuardado.registradoPor}
              </p>
              {ultimoPedidoGuardado.observaciones && (
                <p className="text-xs text-center text-gray-600 mt-2">
                  Observaciones: {ultimoPedidoGuardado.observaciones}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {/* Botón del Ticket */}
              <button
                className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2"
                onClick={() => {
                  setPostPedidoModalOpen(false);
                  setTicketModalOpen(true);
                }}
              >
                <FileText size={18} />
                Generar Ticket de Lealtad
              </button>

              {/* Botón de WhatsApp */}
              <button
                className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition font-medium"
                onClick={() => {
                  const numero = ultimoPedidoGuardado.cliente.numeroWpp?.replace(/\D/g, "");
                  if (!numero) {
                    alert("El cliente no tiene número de WhatsApp registrado.");
                    return;
                  }
                  const saludo = `Saludos ${ultimoPedidoGuardado.cliente.name}\nLe informamos que su pedido de ${ultimoPedidoGuardado.cliente.type} ya está listo para que pase por el.`;
                  const mensaje = `${saludo}\nEl día ${ultimoPedidoGuardado.fecha} consumiste ${ultimoPedidoGuardado.metros} metros de tu programa de lealtad (${ultimoPedidoGuardado.cliente.type}). Te quedan ${(ultimoPedidoGuardado.cliente.remainingMeters - ultimoPedidoGuardado.metros).toFixed(2)} metros en tu plan. Conserve su comprobante. ¡Gracias por tu preferencia!`;
                  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
                  window.open(url, "_blank");
                }}
              >
                Enviar WhatsApp
              </button>

              {/* Botón de cerrar */}
              <button
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                onClick={() => setPostPedidoModalOpen(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPONENTE DEL TICKET */}
      <LoyaltyTicket
        isOpen={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        ticketData={ticketData}
      />
    </div>
  );
}