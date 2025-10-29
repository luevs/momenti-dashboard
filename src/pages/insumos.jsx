import React, { useState, useEffect, useCallback } from "react";
import { Plus, X, User, Trash2, Edit, History, Clock, Calendar, FileText, Package, AlertTriangle } from "lucide-react";
import { supabase } from "../supabaseClient";
import { autoConsumeAfterProduction } from "../utils/autoConsume";

const pad2 = (value) => value.toString().padStart(2, "0");
const toLocalDateInputValue = (date = new Date()) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const toLocalTimeInputValue = (date = new Date()) => `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
const combineLocalDateTime = (dateStr, timeStr) => {
  if (!dateStr) return new Date().toISOString();
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return new Date().toISOString();
  const [hours, minutes] = (timeStr || "08:00").split(":").map(Number);
  const localDate = new Date(year, (month ?? 1) - 1, day, hours ?? 0, minutes ?? 0, 0, 0);
  return localDate.toISOString();
};

export default function Insumos() {
  const [activeTab, setActiveTab] = useState("DTF 1 (Left)");
  const [machines, setMachines] = useState([]);
  const [machineSupplies, setMachineSupplies] = useState([]);
  const [supplyTypes, setSupplyTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para modales
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState(null);
  const [newStock, setNewStock] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [notes, setNotes] = useState("");
  const [recordedBy, setRecordedBy] = useState("Sistema");
  const [restockDate, setRestockDate] = useState(() => toLocalDateInputValue());
  const [restockTime, setRestockTime] = useState(() => toLocalTimeInputValue());
  const [editReason, setEditReason] = useState("");
  const [editAuthorizedBy, setEditAuthorizedBy] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteAuthorizedBy, setDeleteAuthorizedBy] = useState("");
  const [editingSupply, setEditingSupply] = useState(null);
  const [corteModalOpen, setCorteModalOpen] = useState(false);
  const [corteMetros, setCorteMetros] = useState("");
  const [corteFecha, setCorteFecha] = useState(() => new Date().toISOString().slice(0,10));
  const [corteOperador, setCorteOperador] = useState("");
  const [corteError, setCorteError] = useState("");
  const [corteTotalMes, setCorteTotalMes] = useState(0);

  // --- HANDLERS PARA MODALES DE EDITAR Y ELIMINAR ---

  const openEditModal = (supply) => {
    setEditingSupply({
      ...supply,
      consumption_ratio: String(supply.consumption_ratio ?? 1),
      auto_track: Boolean(supply.auto_track),
    });
    setEditReason("");
    setEditAuthorizedBy("");
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
  setEditModalOpen(false);
  setEditingSupply(null);
  };

  const openDeleteModal = (supply) => {
  setEditingSupply({ ...supply });
  setDeleteReason("");
  setDeleteAuthorizedBy("");
  setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
  setDeleteModalOpen(false);
  setEditingSupply(null);
  };

  // Estados para historial
  const [supplyHistory, setSupplyHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Estados para configuración de insumos
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [availableSupplyTypes, setAvailableSupplyTypes] = useState([]);
  const [selectedSupplyType, setSelectedSupplyType] = useState("");
  const [initialStock, setInitialStock] = useState("");
  const [minimumLevel, setMinimumLevel] = useState("");
  const [criticalLevel, setCriticalLevel] = useState("");
  const [consumptionRatio, setConsumptionRatio] = useState("1");
  const [autoTrackConsumption, setAutoTrackConsumption] = useState(true);
  const [configRecordedDate, setConfigRecordedDate] = useState(() => toLocalDateInputValue());
  const [configRecordedTime, setConfigRecordedTime] = useState(() => toLocalTimeInputValue());

  // Cargar datos iniciales
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      // Cargar máquinas
      const { data: machinesData, error: machinesError } = await supabase
        .from('machines')
        .select('*')
        .order('name');

      if (machinesError) throw machinesError;
      setMachines(machinesData || []);

      // Cargar tipos de insumos
      const { data: supplyTypesData, error: supplyTypesError } = await supabase
        .from('supply_types')
        .select('*')
        .order('name');

      if (supplyTypesError) throw supplyTypesError;
      setSupplyTypes(supplyTypesData || []);

      // Cargar estado actual de insumos
      await fetchMachineSupplies();

    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMachineSupplies = async () => {
    const { data, error } = await supabase
      .from('machine_supplies')
      .select(`
        *,
        machines!inner(name, type),
        supply_types!inner(name, category, unit, machine_compatibility)
      `);

    if (error) {
      console.error('Error al cargar insumos:', error);
    } else {
      setMachineSupplies(data || []);
    }
  };

  const calcularTotalMes = useCallback(
    async (machineIdOverride, dateOverride) => {
      const targetMachineId = machineIdOverride ?? machines.find((m) => m.name === activeTab)?.id;
      if (!targetMachineId) {
        setCorteTotalMes(0);
        return;
      }

      let referenceDate = dateOverride
        ? new Date(dateOverride)
        : corteFecha
          ? new Date(corteFecha)
          : new Date();

      if (Number.isNaN(referenceDate.valueOf())) {
        referenceDate = new Date();
      }

      const inicioMes = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
      const finMes = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);

      const inicioStr = inicioMes.toISOString().slice(0, 10);
      const finStr = finMes.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('production_records')
        .select('meters_produced')
        .eq('machine_id', targetMachineId)
        .gte('date', inicioStr)
        .lte('date', finStr);

      if (!error && Array.isArray(data)) {
        const total = data.reduce((sum, rec) => sum + Number(rec.meters_produced || 0), 0);
        setCorteTotalMes(total);
      } else {
        setCorteTotalMes(0);
      }
    },
    [machines, activeTab, corteFecha, setCorteTotalMes],
  );

  // Obtener insumos de la máquina activa
  const getCurrentMachineSupplies = () => {
    return machineSupplies.filter(supply => 
      supply.machines.name === activeTab
    ).sort((a, b) => a.supply_types.name.localeCompare(b.supply_types.name));
  };

  // Determinar estado del insumo (crítico, bajo, ok)
  const getSupplyStatus = (currentStock, criticalLevel, minimumLevel) => {
    if (currentStock <= criticalLevel) return 'critical';
    if (currentStock <= minimumLevel) return 'low';
    return 'ok';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'low': return 'bg-yellow-100 text-yellow-800';
      case 'ok': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'critical': return 'CRÍTICO';
      case 'low': return 'BAJO';
      case 'ok': return 'OK';
      default: return 'N/A';
    }
  };

  const getStatusTextColor = (status) => {
    switch (status) {
      case 'critical': return 'text-red-600';
      case 'low': return 'text-yellow-600';
      case 'ok': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  // Abrir modal de reposición
  const openRestockModal = (supply) => {
    setSelectedSupply(supply);
    setRestockModalOpen(true);
    setNewStock("");
    setBatchNumber("");
    setExpiryDate("");
    setSupplierName("");
    setUnitCost("");
    setNotes("");
    setRecordedBy("Sistema");
    setRestockDate(toLocalDateInputValue());
    setRestockTime(toLocalTimeInputValue());
  };

  // Cerrar modal de reposición
  const closeRestockModal = () => {
    setRestockModalOpen(false);
    setSelectedSupply(null);
    setNewStock("");
    setBatchNumber("");
    setExpiryDate("");
    setSupplierName("");
    setUnitCost("");
    setNotes("");
    setRestockDate(toLocalDateInputValue());
    setRestockTime(toLocalTimeInputValue());
  };

  const closeHistoryModal = () => {
  setHistoryModalOpen(false);
  setSelectedSupply(null);
  setSupplyHistory([]);
  };

  // Guardar reposición de stock
  const handleRestock = async () => {
    if (!selectedSupply || !newStock || parseFloat(newStock) < 0) {
      alert("Por favor, ingresa una cantidad válida.");
      return;
    }

    if (!recordedBy.trim()) {
      alert("Por favor, ingresa quién está registrando el movimiento.");
      return;
    }

    if (!restockDate) {
      alert("Selecciona la fecha de registro del movimiento.");
      return;
    }

    try {
      const quantityBefore = parseFloat(selectedSupply.current_stock);
      const quantityAfter = parseFloat(newStock);
      const quantityChanged = quantityAfter - quantityBefore;
      const recordedAtIso = combineLocalDateTime(restockDate, restockTime);

      // Registrar el movimiento en el historial
      const { error: historyError } = await supabase
        .from('supply_movements')
        .insert([
          {
            machine_id: selectedSupply.machine_id,
            supply_type_id: selectedSupply.supply_type_id,
            movement_type: 'restock',
            quantity_before: quantityBefore,
            quantity_after: quantityAfter,
            quantity_changed: quantityChanged,
            batch_number: batchNumber || null,
            expiry_date: expiryDate || null,
            unit_cost: unitCost ? parseFloat(unitCost) : null,
            supplier: supplierName || null,
            notes: notes || null,
            recorded_by: recordedBy.trim(),
            recorded_at: recordedAtIso,
          }
        ]);

      if (historyError) throw historyError;

      // Actualizar el stock actual
      const updateData = {
        current_stock: quantityAfter,
        last_updated: recordedAtIso,
        updated_by: recordedBy.trim()
      };

      if (unitCost) updateData.cost_per_unit = parseFloat(unitCost);
      if (supplierName) updateData.supplier = supplierName;

      const { error: updateError } = await supabase
        .from('machine_supplies')
        .update(updateData)
        .eq('id', selectedSupply.id);

      if (updateError) throw updateError;

      alert(`Stock actualizado correctamente. ${selectedSupply.supply_types.name}: ${quantityAfter} ${selectedSupply.supply_types.unit}`);
      closeRestockModal();
      fetchMachineSupplies();

    } catch (error) {
      console.error('Error al actualizar stock:', error);
      alert('Hubo un error al actualizar el stock: ' + error.message);
    }
  };

  // Obtener historial de un insumo
  const fetchSupplyHistory = async (machineId, supplyTypeId) => {
    setIsLoadingHistory(true);
    const { data, error } = await supabase
      .from('supply_movements')
      .select('*')
      .eq('machine_id', machineId)
      .eq('supply_type_id', supplyTypeId)
      .order('recorded_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error al obtener historial:', error);
      setSupplyHistory([]);
    } else {
      setSupplyHistory(data || []);
    }
    setIsLoadingHistory(false);
  };

  // Abrir modal de historial
  const openHistoryModal = (supply) => {
    setSelectedSupply({ ...supply });
    setHistoryModalOpen(true);
    fetchSupplyHistory(supply.machine_id, supply.supply_type_id);
  };

  // Abrir modal de configuración
  const openConfigModal = () => {
    if (machines.length === 0) {
      alert("No hay máquinas disponibles para configurar.");
      return;
    }
    setSelectedMachine(machines[0]);
    updateAvailableSupplyTypes(machines[0]);
    setConsumptionRatio("1");
    setAutoTrackConsumption(true);
    setConfigRecordedDate(toLocalDateInputValue());
    setConfigRecordedTime(toLocalTimeInputValue());
    setConfigModalOpen(true);
  };

  // Actualizar tipos de insumos disponibles según la máquina
  const updateAvailableSupplyTypes = (machine) => {
    const machineType = machine.type;
    const alreadyConfigured = machineSupplies
      .filter(ms => ms.machine_id === machine.id)
      .map(ms => ms.supply_type_id);
    
    const available = supplyTypes.filter(st => 
      (st.machine_compatibility === machineType || st.machine_compatibility === 'Ambos') &&
      !alreadyConfigured.includes(st.id)
    );
    
    setAvailableSupplyTypes(available);
    setSelectedSupplyType(available.length > 0 ? available[0].id.toString() : "");
  };

  // Manejar cambio de máquina en configuración
  const handleMachineChange = (machineId) => {
    const machine = machines.find(m => m.id.toString() === machineId);
    setSelectedMachine(machine);
    updateAvailableSupplyTypes(machine);
  };

  // Cerrar modal de configuración
  const closeConfigModal = () => {
    setConfigModalOpen(false);
    setSelectedMachine(null);
    setSelectedSupplyType("");
    setInitialStock("");
    setMinimumLevel("");
    setCriticalLevel("");
    setConsumptionRatio("1");
    setAutoTrackConsumption(true);
    setConfigRecordedDate(toLocalDateInputValue());
    setConfigRecordedTime(toLocalTimeInputValue());
  };

  // Agregar insumo a máquina
  const handleAddSupplyToMachine = async () => {
    if (!selectedMachine || !selectedSupplyType || !initialStock || !minimumLevel || !criticalLevel) {
      alert("Por favor, completa todos los campos.");
      return;
    }

    if (!consumptionRatio || parseFloat(consumptionRatio) <= 0) {
      alert("Define el ratio de consumo (unidades por metro impreso).");
      return;
    }

    if (parseFloat(criticalLevel) >= parseFloat(minimumLevel)) {
      alert("El nivel crítico debe ser menor que el nivel mínimo.");
      return;
    }

    if (!configRecordedDate) {
      alert("Selecciona la fecha del primer movimiento de este insumo.");
      return;
    }

    try {
      const recordedAtIso = combineLocalDateTime(configRecordedDate, configRecordedTime);
      const { error } = await supabase
        .from('machine_supplies')
        .insert([
          {
            machine_id: selectedMachine.id,
            supply_type_id: parseInt(selectedSupplyType),
            current_stock: parseFloat(initialStock),
            minimum_level: parseFloat(minimumLevel),
            critical_level: parseFloat(criticalLevel),
            consumption_ratio: parseFloat(consumptionRatio),
            auto_track: autoTrackConsumption,
            updated_by: "Admin",
            last_updated: recordedAtIso,
          }
        ]);

      if (error) throw error;

      // Registrar el movimiento inicial
      await supabase
        .from('supply_movements')
        .insert([
          {
            machine_id: selectedMachine.id,
            supply_type_id: parseInt(selectedSupplyType),
            movement_type: 'restock',
            quantity_before: 0,
            quantity_after: parseFloat(initialStock),
            quantity_changed: parseFloat(initialStock),
            notes: 'Configuración inicial del insumo',
            recorded_by: 'Admin',
            recorded_at: recordedAtIso,
          }
        ]);

      alert("Insumo agregado correctamente a la máquina.");
      
      // Actualizar datos y disponibles
      await fetchMachineSupplies();
      updateAvailableSupplyTypes(selectedMachine);
      
      // Limpiar campos
      setInitialStock("");
      setMinimumLevel("");
      setCriticalLevel("");
      setConsumptionRatio("1");
      setAutoTrackConsumption(true);
      setConfigRecordedDate(toLocalDateInputValue());
      setConfigRecordedTime(toLocalTimeInputValue());
      
    } catch (error) {
      console.error('Error al agregar insumo:', error);
      alert('Hubo un error al agregar el insumo: ' + error.message);
    }
  };

  // Formatear fecha
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

  // Calcular estadísticas generales
  const getGeneralStats = () => {
    const totalSupplies = machineSupplies.length;
    const criticalSupplies = machineSupplies.filter(s => 
      getSupplyStatus(s.current_stock, s.critical_level, s.minimum_level) === 'critical'
    ).length;
    const lowSupplies = machineSupplies.filter(s => 
      getSupplyStatus(s.current_stock, s.critical_level, s.minimum_level) === 'low'
    ).length;
    
    return {
      total: totalSupplies,
      alerts: criticalSupplies + lowSupplies,
      critical: criticalSupplies,
      activeMachines: machines.filter(m => m.status === 'activo').length
    };
  };

  const stats = getGeneralStats();
  const currentSupplies = getCurrentMachineSupplies();

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-center text-gray-500">Cargando sistema de insumos...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Control de Insumos</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setCorteModalOpen(true);
              const defaultDate = new Date().toISOString().slice(0, 10);
              setCorteFecha(defaultDate);
              setCorteMetros("");
              setCorteOperador("");
              setCorteError("");
              const activeMachine = machines.find((m) => m.name === activeTab);
              if (activeMachine) {
                calcularTotalMes(activeMachine.id, defaultDate);
              } else {
                setCorteTotalMes(0);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
          >
            <Calendar size={18} />
            Corte diario
          </button>
          <button
            onClick={openConfigModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={18} />
            Configurar Insumos
          </button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-600">{stats.activeMachines}</p>
          <p className="text-sm text-gray-600">Máquinas Activas</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
          <p className="text-sm text-gray-600">Críticos</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-yellow-600">{stats.alerts}</p>
          <p className="text-sm text-gray-600">Alertas Totales</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
          <p className="text-sm text-gray-600">Insumos Monitoreados</p>
        </div>
      </div>

      {/* Tabs y contenido principal */}
      <div className="bg-white rounded-xl shadow p-4">
        {/* Tabs para máquinas */}
        <div className="flex space-x-4 mb-6 border-b">
          {machines.map((machine) => (
            <button
              key={machine.id}
              onClick={() => setActiveTab(machine.name)}
              className={`px-4 py-2 font-semibold ${
                activeTab === machine.name
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {machine.name}
            </button>
          ))}
        </div>

        {/* Contenido de la máquina seleccionada */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Package className="text-blue-600" size={24} />
            Insumos de {activeTab}
          </h3>
          
          {currentSupplies.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No hay insumos configurados para esta máquina.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentSupplies.map((supply) => {
                const status = getSupplyStatus(supply.current_stock, supply.critical_level, supply.minimum_level);
                const percentage = supply.current_stock > 0 ? 
                  ((supply.current_stock / (supply.minimum_level * 4)) * 100).toFixed(0) : 0; // Asumiendo que el 100% es 4x el nivel mínimo
                const ratio = supply.consumption_ratio ? parseFloat(supply.consumption_ratio) || 1 : 1;
                const autoTrack = Boolean(supply.auto_track);
                const lastUpdatedLabel = supply.last_updated ? formatDate(supply.last_updated) : 'Sin registro';
                
                return (
                  <div key={supply.id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold">{supply.supply_types.name}</h4>
                      <span className={`text-sm px-2 py-1 rounded-full ${getStatusColor(status)}`}>
                        {getStatusText(status)}
                      </span>
                    </div>
                    
                    <p className={`text-2xl font-bold ${getStatusTextColor(status)} mb-1`}>
                      {supply.current_stock} {supply.supply_types.unit}
                    </p>
                    
                    <div className="text-sm text-gray-600 mb-3">
                      <p>Mínimo: {supply.minimum_level} {supply.supply_types.unit}</p>
                      <p>Crítico: {supply.critical_level} {supply.supply_types.unit}</p>
                      {supply.supplier && <p>Proveedor: {supply.supplier}</p>}
                      <p>
                        Consumo teórico: {ratio.toFixed(2)} {supply.supply_types.unit} / m
                        {autoTrack ? <span className="ml-2 inline-flex items-center text-green-600 text-xs">(auto)</span> : null}
                      </p>
                      <p>Último movimiento: {lastUpdatedLabel}</p>
                    </div>

                    {/* Barra de progreso */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                      <div
                        className={`h-2 rounded-full ${
                          status === 'critical' ? 'bg-red-500' :
                          status === 'low' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => openRestockModal(supply)}
                        className="flex-1 text-xs px-3 py-2 bg-green-100 text-green-800 rounded hover:bg-green-200 transition"
                      >
                        Reponer Stock
                      </button>
                      <button
                        onClick={() => openHistoryModal(supply)}
                        className="flex items-center justify-center px-2 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition"
                      >
                        <History size={14} />
                      </button>
                      <button
                        onClick={() => openEditModal(supply)}
                        className="flex items-center justify-center px-2 py-2 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition"
                        title="Editar insumo"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(supply)}
                        className="flex items-center justify-center px-2 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200 transition"
                        title="Eliminar insumo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE REPOSICIÓN */}
      {restockModalOpen && selectedSupply && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeRestockModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>
            
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Package className="text-green-600" size={24} />
              Reponer Stock
            </h2>
            
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p><strong>Insumo:</strong> {selectedSupply.supply_types.name}</p>
              <p><strong>Máquina:</strong> {activeTab}</p>
              <p><strong>Stock actual:</strong> {selectedSupply.current_stock} {selectedSupply.supply_types.unit}</p>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-gray-700 font-bold mb-2">Nueva cantidad total *</label>
                <input
                  type="number"
                  placeholder="Cantidad después de reponer"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-2">Registrado por *</label>
                <select
                  value={recordedBy}
                  onChange={e => setRecordedBy(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                >
                  <option value="">Selecciona...</option>
                  <option value="Jasiel">Jasiel</option>
                  <option value="Daniela">Daniela</option>
                  <option value="Karla">Karla</option>
                  <option value="Eduardo">Eduardo</option>
                  <option value="Operador 1">Operador 1</option>
                  <option value="Operador 2">Operador 2</option>
                  <option value="Operador 3">Operador 3</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-2">Fecha de registro *</label>
                  <input
                    type="date"
                    value={restockDate}
                    onChange={(e) => setRestockDate(e.target.value)}
                    className="border rounded px-3 py-2 w-full"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-2">Hora</label>
                  <input
                    type="time"
                    value={restockTime}
                    onChange={(e) => setRestockTime(e.target.value)}
                    className="border rounded px-3 py-2 w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-2">Número de lote</label>
                <input
                  type="text"
                  placeholder="Lote del producto"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-2">Fecha de caducidad</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-2">Proveedor</label>
                <input
                  type="text"
                  placeholder="Nombre del proveedor"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-2">Costo por unidad</label>
                <input
                  type="number"
                  placeholder="Costo por unidad"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-2">Notas</label>
                <textarea
                  placeholder="Observaciones adicionales"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="border rounded px-3 py-2 w-full h-20 resize-none"
                />
              </div>

              {newStock && (
                <div className="bg-blue-50 p-3 rounded text-sm">
                  <p>
                    <strong>Cambio:</strong> {parseFloat(newStock) - selectedSupply.current_stock > 0 ? '+' : ''}{(parseFloat(newStock) - selectedSupply.current_stock).toFixed(2)} {selectedSupply.supply_types.unit}
                  </p>
                  <p>
                    <strong>Stock final:</strong> {newStock} {selectedSupply.supply_types.unit}
                  </p>
                </div>
              )}

              <button
                onClick={handleRestock}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Actualizar Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE HISTORIAL */}
      {historyModalOpen && selectedSupply && (
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
              Historial de {selectedSupply.supply_types.name} - {activeTab}
            </h2>

            {isLoadingHistory ? (
              <p className="text-center text-gray-500 py-8">Cargando historial...</p>
            ) : supplyHistory.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No hay movimientos registrados para este insumo.</p>
            ) : (
              <div className="space-y-4">
                {supplyHistory.map((record) => (
                  <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="text-gray-400" size={16} />
                          <span className="font-semibold text-blue-600">
                            {record.movement_type === 'restock' ? 'Reposición' : 
                             record.movement_type === 'consumption' ? 'Consumo' : 'Ajuste'}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatDate(record.recorded_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          <strong>Cambio:</strong> {record.quantity_before} → {record.quantity_after} {selectedSupply.supply_types.unit}
                          <span className={`ml-2 ${record.quantity_changed >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ({record.quantity_changed >= 0 ? '+' : ''}{record.quantity_changed})
                          </span>
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Por:</strong> {record.recorded_by}
                        </p>
                        {record.batch_number && (
                          <p className="text-sm text-gray-600">
                            <strong>Lote:</strong> {record.batch_number}
                          </p>
                        )}
                        {record.supplier && (
                          <p className="text-sm text-gray-600">
                            <strong>Proveedor:</strong> {record.supplier}
                          </p>
                        )}
                        {record.notes && (
                          <p className="text-sm text-gray-600">
                            <strong>Notas:</strong> {record.notes}
                          </p>
                        )}
                      </div>
                      {record.unit_cost && (
                        <div className="text-right text-sm">
                          <p className="text-gray-600">Costo: ${record.unit_cost}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CONFIGURACIÓN */}
      {configModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg relative">
            <button
              onClick={closeConfigModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>
            <h2 className="text-xl font-semibold mb-4">Configurar Insumo</h2>
            {/* Aquí pon los campos para seleccionar máquina, tipo de insumo, stock inicial, mínimo, crítico, etc. */}
            <div className="flex flex-col gap-4">
              <label className="block text-gray-700 font-bold">Máquina</label>
              <select
                value={selectedMachine?.id || ""}
                onChange={e => handleMachineChange(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              >
                {machines.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <label className="block text-gray-700 font-bold">Tipo de Insumo</label>
              <select
                value={selectedSupplyType}
                onChange={e => setSelectedSupplyType(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              >
                <option value="">Selecciona...</option>
                {availableSupplyTypes.map(st => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
              <label className="block text-gray-700 font-bold">Stock inicial *</label>
              <input
                type="number"
                value={initialStock}
                onChange={e => setInitialStock(e.target.value)}
                className="border rounded px-3 py-2 w-full"
                min="0"
              />
              {selectedSupplyType && (
                <span className="text-xs text-blue-600 mt-1 block">
                  Ingresa el stock en {
                    supplyTypes.find(st => st.id.toString() === selectedSupplyType)?.unit || "la unidad correspondiente"
                  }
                </span>
              )}
              <label className="block text-gray-700 font-bold">Nivel mínimo *</label>
              <input
                type="number"
                value={minimumLevel}
                onChange={e => setMinimumLevel(e.target.value)}
                className="border rounded px-3 py-2 w-full"
                min="0"
              />
              <label className="block text-gray-700 font-bold">Nivel crítico *</label>
              <input
                type="number"
                value={criticalLevel}
                onChange={e => setCriticalLevel(e.target.value)}
                className="border rounded px-3 py-2 w-full"
                min="0"
              />
              <label className="block text-gray-700 font-bold">Consumo teórico *</label>
              <input
                type="number"
                value={consumptionRatio}
                onChange={e => setConsumptionRatio(e.target.value)}
                className="border rounded px-3 py-2 w-full"
                min="0"
                step="0.01"
              />
              <span className="text-xs text-gray-500">Unidades del insumo por cada metro impreso (ej. film: 1.00).</span>
              <label className="block text-gray-700 font-bold">Fecha inicial del movimiento *</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="date"
                  value={configRecordedDate}
                  onChange={e => setConfigRecordedDate(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                />
                <input
                  type="time"
                  value={configRecordedTime}
                  onChange={e => setConfigRecordedTime(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                />
              </div>
              <span className="text-xs text-gray-500">Esta fecha se mostrará en la tarjeta del insumo y quedará registrada en el historial.</span>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 mt-2">
                <input
                  type="checkbox"
                  checked={autoTrackConsumption}
                  onChange={e => setAutoTrackConsumption(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Habilitar descuento automático según metros impresos
              </label>
              <button
                onClick={handleAddSupplyToMachine}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Agregar Insumo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN */}
      {editModalOpen && editingSupply && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg relative">
            <button
              onClick={closeEditModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>
            <h2 className="text-xl font-semibold mb-4">
              Editar Insumo {editingSupply?.supply_types?.name ? `- ${editingSupply.supply_types.name}` : ""}
            </h2>
            <div className="flex flex-col gap-4">
              <label className="block text-gray-700 font-bold">Stock mínimo</label>
              <input
                type="number"
                value={editingSupply.minimum_level}
                onChange={e => setEditingSupply({ ...editingSupply, minimum_level: e.target.value })}
                className="border rounded px-3 py-2 w-full"
              />
              <label className="block text-gray-700 font-bold">Stock crítico</label>
              <input
                type="number"
                value={editingSupply.critical_level}
                onChange={e => setEditingSupply({ ...editingSupply, critical_level: e.target.value })}
                className="border rounded px-3 py-2 w-full"
              />
              <label className="block text-gray-700 font-bold">Consumo teórico *</label>
              <input
                type="number"
                value={editingSupply.consumption_ratio}
                onChange={e => setEditingSupply({ ...editingSupply, consumption_ratio: e.target.value })}
                className="border rounded px-3 py-2 w-full"
                min="0"
                step="0.01"
              />
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(editingSupply.auto_track)}
                  onChange={e => setEditingSupply({ ...editingSupply, auto_track: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Habilitar descuento automático
              </label>
              <label className="block text-gray-700 font-bold mb-2">Razón de edición *</label>
              <input
                type="text"
                value={editReason}
                onChange={e => setEditReason(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              />
              <label className="block text-gray-700 font-bold mb-2">Quién autoriza *</label>
              <input
                type="text"
                value={editAuthorizedBy}
                onChange={e => setEditAuthorizedBy(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              />
              <button
                onClick={async () => {
                  if (!editReason.trim() || !editAuthorizedBy.trim()) {
                    alert("Completa la razón y quién autoriza.");
                    return;
                  }
                  if (!editingSupply.consumption_ratio || parseFloat(editingSupply.consumption_ratio) <= 0) {
                    alert("Define un consumo teórico válido (mayor que cero).");
                    return;
                  }
                  const { error } = await supabase
                    .from('machine_supplies')
                    .update({
                      minimum_level: parseFloat(editingSupply.minimum_level),
                      critical_level: parseFloat(editingSupply.critical_level),
                      consumption_ratio: parseFloat(editingSupply.consumption_ratio || 0) || 0,
                      auto_track: Boolean(editingSupply.auto_track),
                      edit_reason: editReason,
                      edit_authorized_by: editAuthorizedBy
                    })
                    .eq('id', editingSupply.id);
                  if (error) {
                    alert("Error al editar insumo: " + error.message);
                  } else {
                    alert("Insumo editado correctamente.");
                    closeEditModal();
                    fetchMachineSupplies();
                  }
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ELIMINACIÓN */}
      {deleteModalOpen && editingSupply && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg relative">
            <button
              onClick={closeDeleteModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>
            <h2 className="text-xl font-semibold mb-4">Eliminar Insumo {editingSupply?.supply_types?.name ? `- ${editingSupply.supply_types.name}` : ""}</h2>
            <p className="mb-2">¿Por qué deseas eliminar <strong>{editingSupply?.supply_types?.name || "este insumo"}</strong>?</p>
            <input
              type="text"
              placeholder="Razón de eliminación"
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              className="border rounded px-3 py-2 w-full mb-2"
            />
            <input
              type="text"
              placeholder="Quién autoriza"
              value={deleteAuthorizedBy}
              onChange={e => setDeleteAuthorizedBy(e.target.value)}
              className="border rounded px-3 py-2 w-full mb-4"
            />
            <button
              onClick={async () => {
                if (!deleteReason.trim() || !deleteAuthorizedBy.trim()) {
                  alert("Completa la razón y quién autoriza.");
                  return;
                }
                const { error } = await supabase
                  .from('machine_supplies')
                  .update({
                    delete_reason: deleteReason,
                    delete_authorized_by: deleteAuthorizedBy
                  })
                  .eq('id', editingSupply.id);
                if (error) {
                  alert("Error al guardar razón de eliminación: " + error.message);
                  return;
                }
                // Ahora sí elimina
                const { error: delError } = await supabase
                  .from('machine_supplies')
                  .delete()
                  .eq('id', editingSupply.id);
                if (delError) {
                  alert("Error al eliminar insumo: " + delError.message);
                } else {
                  alert("Insumo eliminado correctamente.");
                  closeDeleteModal();
                  fetchMachineSupplies();
                }
              }}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Confirmar eliminación
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE CORTE DIARIO */}
      {corteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg relative">
            <button
              onClick={() => setCorteModalOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="text-yellow-500" size={24} />
              Corte diario de {activeTab}
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-gray-700 font-bold mb-2">Fecha</label>
                <input
                  type="date"
                  value={corteFecha}
                  onChange={e => setCorteFecha(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">Metros impresos *</label>
                <input
                  type="number"
                  value={corteMetros}
                  onChange={e => setCorteMetros(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">Operador *</label>
                <select
                  value={corteOperador}
                  onChange={e => setCorteOperador(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                >
                  <option value="">Selecciona...</option>
                  <option value="Jasiel">Jasiel</option>
                  <option value="Daniela">Daniela</option>
                  <option value="Karla">Karla</option>
                  <option value="Eduardo">Eduardo</option>
                  <option value="Operador 1">Operador 1</option>
                  <option value="Operador 2">Operador 2</option>
                  <option value="Operador 3">Operador 3</option>
                </select>
              </div>
              <div className="bg-blue-50 p-3 rounded text-sm">
                <strong>Total del mes:</strong> {corteTotalMes} m
              </div>
              {corteError && <div className="text-red-600 text-sm">{corteError}</div>}
              <button
                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                onClick={async () => {
                  setCorteError("");
                  if (!corteMetros || parseFloat(corteMetros) <= 0) {
                    setCorteError("Ingresa los metros impresos.");
                    return;
                  }
                  if (!corteOperador) {
                    setCorteError("Selecciona el operador.");
                    return;
                  }
                  // Busca la máquina activa
                  const maquina = machines.find(m => m.name === activeTab);
                  if (!maquina) {
                    setCorteError("No se encontró la máquina activa.");
                    return;
                  }
                  // Valida que no exista ya un corte para esa fecha y máquina
                  const { data: existente, error: errorExistente } = await supabase
                    .from('production_records')
                    .select('id')
                    .eq('machine_id', maquina.id)
                    .eq('date', corteFecha);
                  if (existente && existente.length > 0) {
                    setCorteError("Ya existe un corte para esta máquina y fecha.");
                    return;
                  }
                  const metrosValue = parseFloat(corteMetros);
                  // Inserta el corte
                  const { data: corteRegistrado, error } = await supabase
                    .from('production_records')
                    .insert([{
                      machine_id: maquina.id,
                      date: corteFecha,
                      meters_produced: metrosValue,
                      recorded_by: corteOperador
                    }])
                    .select()
                    .single();
                  if (error) {
                    setCorteError("Error al guardar el corte: " + error.message);
                    return;
                  }

                  let consumoResumen = [];
                  let autoConsumptionFailed = false;
                  try {
                    consumoResumen = await autoConsumeAfterProduction({
                      machineId: maquina.id,
                      meters: metrosValue,
                      operator: corteOperador,
                      productionRecordId: (typeof corteRegistrado?.id === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(corteRegistrado.id)) ? corteRegistrado.id : null,
                      productionDate: corteFecha,
                    });
                  } catch (autoError) {
                    console.error("Error al descontar insumos automáticamente", autoError);
                    autoConsumptionFailed = true;
                  }
                  await fetchMachineSupplies();

                  setCorteModalOpen(false);
                  setCorteMetros("");
                  setCorteOperador("");
                  setCorteError("");
                  await calcularTotalMes(maquina.id, corteFecha);

                  const resumenTexto = consumoResumen.length
                    ? `\n\nConsumo registrado:\n${consumoResumen
                        .map((item) => {
                          const unitText = item.unit ? ` ${item.unit}` : "";
                          return `- ${item.name}: -${item.amount.toFixed(2)}${unitText}`;
                        })
                        .join("\n")}`
                    : "";

                  if (autoConsumptionFailed) {
                    alert(`Corte guardado, pero revisa el stock: no se pudo descontar automáticamente.`);
                  } else {
                    alert(`¡Corte diario registrado correctamente!${resumenTexto}`);
                  }
                }}
              >
                Guardar Corte Diario
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}