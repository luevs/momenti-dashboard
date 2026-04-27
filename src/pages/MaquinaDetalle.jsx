import React, { useState, useEffect } from "react";
import { Plus, X, User, Trash2, Edit, History, Clock, Calendar, FileText, Package, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "../supabaseClient";
import useCurrentUser from '../utils/useCurrentUser';
import { useParams } from "react-router-dom";
import { Bar } from 'react-chartjs-2'; // Si quieres usar Chart.js (opcional)

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function MaquinaDetalle() {
  const { id } = useParams();
  const currentUser = useCurrentUser();
  const [machines, setMachines] = useState([]);
  const [machineSupplies, setMachineSupplies] = useState([]);
  const [supplyTypes, setSupplyTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [productionRecords, setProductionRecords] = useState([]);
  const [isLoadingProduction, setIsLoadingProduction] = useState(true);
  
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
  const [editReason, setEditReason] = useState("");
  const [editAuthorizedBy, setEditAuthorizedBy] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteAuthorizedBy, setDeleteAuthorizedBy] = useState("");
  const [editingSupply, setEditingSupply] = useState(null);
  const [corteModalOpen, setCorteModalOpen] = useState(false);
  const [corteMetros, setCorteMetros] = useState("");
  const [corteFecha, setCorteFecha] = useState(() => new Date().toISOString().slice(0,10));
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  const [corteOperador, setCorteOperador] = useState("");
  const [corteError, setCorteError] = useState("");
  const [corteTotalMes, setCorteTotalMes] = useState(0);
  const [corteLoading, setCorteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("trabajos");
  const [rollNumber, setRollNumber] = useState("");
  const [rollNumberSuggestion, setRollNumberSuggestion] = useState("");
  const [todayJobs, setTodayJobs] = useState([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [jobHistory, setJobHistory] = useState([]);
  const [isLoadingJobHistory, setIsLoadingJobHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("month");
  const [historyFolioSearch, setHistoryFolioSearch] = useState("");
  const [historyDateFrom, setHistoryDateFrom] = useState("");
  const [historyDateTo, setHistoryDateTo] = useState("");
  const [restockAmount, setRestockAmount] = useState("");
  const [currentRollAction, setCurrentRollAction] = useState(null); // null | 'return' | 'discard'
  const [currentActiveRoll, setCurrentActiveRoll] = useState(null);
  const [rollHistory, setRollHistory] = useState([]);
  const [isLoadingRolls, setIsLoadingRolls] = useState(false);
  const [inventoryItemsMap, setInventoryItemsMap] = useState({});
  const [activeRolls, setActiveRolls] = useState({});
  

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
  const [newMaterialName, setNewMaterialName] = useState("");
  const [newMaterialWidth, setNewMaterialWidth] = useState("");
  const [configMode, setConfigMode] = useState("existing");

  // Nuevo estado para editar registros de producción
  const [editRecordModalOpen, setEditRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editDate, setEditDate] = useState(getLocalDateString());
  const [editMeters, setEditMeters] = useState("");
  const [editRegisteredBy, setEditRegisteredBy] = useState("");
  const [editError, setEditError] = useState("");

  // Handlers para editar registros de producción
  const openEditRecord = (record) => {
    setEditingRecord(record);
    const dateStr = typeof record.date === "string" ? record.date.slice(0,10) : getLocalDateString(new Date(record.date));
    setEditDate(dateStr);
    setEditMeters(String(record.meters_printed ?? ""));
    setEditRegisteredBy(record.registered_by ?? (currentUser?.name || currentUser?.email || ""));
    setEditError("");
    setEditRecordModalOpen(true);
  };

  const closeEditRecordModal = () => {
    setEditRecordModalOpen(false);
    setEditingRecord(null);
    setEditDate(getLocalDateString());
    setEditMeters("");
    setEditRegisteredBy("");
    setEditError("");
  };

  const handleUpdateRecord = async () => {
    if (!editingRecord) return;
    if (!editDate) { setEditError("Selecciona una fecha."); return; }
    if (!editMeters || isNaN(Number(editMeters))) { setEditError("Ingresa metros válidos."); return; }

    try {
      const { error } = await supabase
        .from('machine_daily_prints')
        .update({
          date: editDate,
          meters_printed: Number(editMeters),
          registered_by: editRegisteredBy || null
        })
        .eq('id', editingRecord.id);

      if (error) { setEditError(error.message || "Error al actualizar"); return; }

      setProductionRecords(prev => prev.map(r => r.id === editingRecord.id ? { ...r, date: editDate, meters_printed: Number(editMeters), registered_by: editRegisteredBy } : r));
      closeEditRecordModal();
    } catch (err) {
      setEditError(err.message || "Error al actualizar");
    }
  };

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
      `)
      .eq('machine_id', id); // Solo los insumos de esta máquina

    if (error) {
      console.error('Error al cargar insumos:', error);
    } else {
      setMachineSupplies(data || []);
    }
  };

  const fetchAvailableInventory = async (supplyTypeId) => {
    console.log('fetchAvailableInventory called with supplyTypeId:', supplyTypeId);
    const isFilm = supplyTypeId === 7 || supplyTypeId === 15;
    
    const { data, error } = await supabase
      .from('inventory')
      .select('id, unit_id, quantity_remaining, quantity')
      .eq('supply_type_id', supplyTypeId)
      .in('status', isFilm ? ['in_stock'] : ['open', 'in_stock'])
      .order('received_at', { ascending: true });
    
    console.log('inventory result:', data, 'error:', error);
    if (!error) setInventoryItems(data || []);
  };

  const fetchActiveRolls = async () => {
    const { data } = await supabase
      .from('inventory')
      .select('id, unit_id, supply_type_id, quantity_remaining')
      .eq('machine_id', parseInt(id))
      .eq('status', 'in_machine')
      .in('supply_type_id', [7, 15]);
    
    if (!data) return;
    const map = {};
    data.forEach(r => { map[r.supply_type_id] = r; });
    setActiveRolls(map);
  };

  useEffect(() => {
    fetchProductionRecords();
    fetchTodayJobs();
    fetchActiveRolls();
  }, [id]);

  const fetchProductionRecords = async () => {
    setIsLoadingProduction(true);
    // Intentar leer desde ambas tablas (algunos lugares usan 'production_records')
    try {
      const [{ data: d1, error: e1 }, { data: d2, error: e2 }] = await Promise.all([
        supabase.from('machine_daily_prints').select('*').eq('machine_id', id).order('date', { ascending: false }).limit(31),
        supabase.from('production_records').select('*').eq('machine_id', id).order('date', { ascending: false }).limit(31)
      ]);

      if (e1 && e2) {
        console.error('Error fetching production records from both tables', e1, e2);
        setProductionRecords([]);
      } else {
        // Normalizar registros a { id, date, meters_printed, registered_by }
  const norm1 = (d1 || []).map(r => ({ id: r.id, date: r.date, meters_printed: (r.meters_printed ?? r.meters_produced ?? r.meters) || 0, registered_by: (r.registered_by || r.recorded_by) || null }));
  const norm2 = (d2 || []).map(r => ({ id: r.id, date: r.date, meters_printed: (r.meters_printed ?? r.meters_produced ?? r.meters) || 0, registered_by: (r.registered_by || r.recorded_by) || null }));

        // Combinar y ordenar por fecha descendente
        const combined = [...norm1, ...norm2].sort((a, b) => new Date(b.date) - new Date(a.date));
        setProductionRecords(combined);
      }
    } catch (err) {
      console.error('Unexpected error fetching production records', err);
      setProductionRecords([]);
    }
    // Debug: log the fetched records to inspect date formats and values
    // Debug: show a sample of normalized records
    try {
      console.debug('fetchProductionRecords -> records count:', productionRecords.length, 'sample:', productionRecords.slice(0,5));
    } catch (e) {
      console.debug('fetchProductionRecords -> debug error', e);
    }
    setIsLoadingProduction(false);
  };

  const fetchInventoryItems = async (jobs) => {
    const ids = jobs
      .filter(j => j.inventory_item_id)
      .map(j => j.inventory_item_id);
    if (ids.length === 0) return;

    const { data } = await supabase
      .from('inventory')
      .select('id, unit_id, display_name, plotter_catalog_id')
      .in('id', ids);

    if (!data) return;

    const { data: catalog } = await supabase
      .from('plotter_materials_catalog')
      .select('id, material_type_id, width_id');

    const { data: widths } = await supabase
      .from('plotter_material_widths')
      .select('id, label');

    const widthsById = {};
    (widths || []).forEach(w => { widthsById[w.id] = w; });

    const catalogById = {};
    (catalog || []).forEach(c => { catalogById[c.id] = c; });

    const map = {};
    (data || []).forEach(item => {
      const cat = catalogById[item.plotter_catalog_id];
      const widthLabel = cat ? widthsById[cat.width_id]?.label || '' : '';
      map[item.id] = `${item.display_name || ''} ${widthLabel}`.trim() || item.unit_id;
    });

    setInventoryItemsMap(map);
  };

  const fetchTodayJobs = async () => {
    setIsLoadingJobs(true);
    const today = getLocalDateString();
    const { data, error } = await supabase
      .from('machine_daily_prints')
      .select('id, folio, job_description, meters_printed, registered_by, created_at, inventory_item_id')
      .eq('machine_id', id)
      .eq('date', today)
      .order('created_at', { ascending: true });
    if (!error) {
      setTodayJobs(data || []);
      await fetchInventoryItems(data || []);
    }
    setIsLoadingJobs(false);
  };

  const fetchJobHistory = async (filter = historyFilter) => {
    setIsLoadingJobHistory(true);
    const today = new Date();
    let fromDate = null;

    if (filter === "week") {
      const d = new Date(today);
      d.setDate(today.getDate() - 7);
      fromDate = getLocalDateString(d);
    } else if (filter === "month") {
      const d = new Date(today);
      d.setMonth(today.getMonth() - 1);
      fromDate = getLocalDateString(d);
    } else if (filter === "custom") {
      fromDate = historyDateFrom || null;
    }

    let query = supabase
      .from('machine_daily_prints')
      .select('id, folio, job_description, meters_printed, registered_by, date, created_at, inventory_item_id')
      .eq('machine_id', id)
      .order('created_at', { ascending: false })
      .limit(500);

    if (fromDate) query = query.gte('date', fromDate);
    if (filter === "custom" && historyDateTo) query = query.lte('date', historyDateTo);
    if (historyFolioSearch.trim()) query = query.ilike('folio', `%${historyFolioSearch.trim()}%`);

    const { data, error } = await query;
    if (!error) {
      setJobHistory(data || []);
      await fetchInventoryItems(data || []);
    }
    setIsLoadingJobHistory(false);
  };

  const fetchRollHistory = async () => {
    setIsLoadingRolls(true);
    
    // Determinar pool de la máquina
    const poolMap = { 1: 'DTF Textil', 2: 'DTF Textil', 3: 'UV DTF', 4: 'Plotter' };
    const pool = poolMap[parseInt(id)] || 'DTF Textil';
    const isFilmMachine = parseInt(id) !== 4;

    // Traer film de esta máquina específica
    const { data: filmRolls } = await supabase
      .from('inventory')
      .select('*, supply_types(name, unit, category)')
      .eq('machine_id', parseInt(id))
      .in('supply_type_id', [7, 15])
      .order('received_at', { ascending: false });

    // Traer tintas del pool
    const { data: inkRolls } = await supabase
      .from('inventory')
      .select('*, supply_types(name, unit, category)')
      .eq('pool', pool)
      .not('supply_type_id', 'in', '(7,15)')
      .order('received_at', { ascending: false });

    // Hacer join manual con supply_types
    const supplyTypesMap = {};
    [...(filmRolls || []), ...(inkRolls || [])].forEach(item => {
      if (item.supply_types) supplyTypesMap[item.supply_type_id] = item.supply_types;
    });

    const combined = [
      ...(filmRolls || []).map(r => ({ ...r, source: 'film' })),
      ...(inkRolls || []).map(r => ({ ...r, source: 'ink' }))
    ].sort((a, b) => new Date(b.received_at) - new Date(a.received_at));

    setRollHistory(combined);
    setIsLoadingRolls(false);
  };

  // Calcular total del mes actual y guardar en state
  const calcularTotalMes = () => {
    try {
      const month = today.getMonth();
      const year = today.getFullYear();
      const total = productionRecords
        .filter(r => {
          const d = new Date(r.date);
          return d.getMonth() === month && d.getFullYear() === year;
        })
        .reduce((sum, r) => sum + Number(r.meters_printed || 0), 0);
      setCorteTotalMes(total);
      return total;
    } catch (e) {
      console.error('Error calcularTotalMes:', e);
      setCorteTotalMes(0);
      return 0;
    }
  };

  // Obtener insumos de la máquina activa
  const getCurrentMachineSupplies = () => {
    return machineSupplies
      .filter(supply => supply.machine_id.toString() === id.toString())
      .sort((a, b) => a.supply_types.name.localeCompare(b.supply_types.name));
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

  const generateRollNumber = async (supplyTypeId, machineId) => {
    const { count } = await supabase
      .from('supply_rolls')
      .select('*', { count: 'exact', head: true })
      .eq('machine_id', machineId)
      .eq('supply_type_id', supplyTypeId);
    const next = String((count || 0) + 1).padStart(3, '0');
    const machineName = machines.find(m => m.id === machineId)?.name || 'M';
    const prefix = machineName.replace(/\s+/g, '').slice(0, 4).toUpperCase();
    return `${prefix}-${supplyTypeId}-${next}`;
  };

  // Helper para determinar si un insumo es film
  const isFilmSupply = (supply) => {
    const name = supply?.supply_types?.name || "";
    return name.includes("Film");
  };

  // Abrir modal de reposición
  const openRestockModal = async (supply) => {
    setSelectedSupply(supply);
    setSelectedInventoryItem(null);
    setInventoryItems([]);
    setRestockAmount("");
    setRecordedBy(currentUser?.name || currentUser?.email || "Sistema");
    setNotes("");
    await fetchAvailableInventory(supply.supply_type_id);
    if (isFilmSupply(supply)) {
      const { data: activeRoll } = await supabase
        .from('inventory')
        .select('id, unit_id, quantity_remaining')
        .eq('supply_type_id', supply.supply_type_id)
        .eq('status', 'in_machine')
        .eq('machine_id', supply.machine_id)
        .maybeSingle();
      setCurrentActiveRoll(activeRoll || null);
      setCurrentRollAction(null);
    }
    setRestockModalOpen(true);
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
    setRollNumber("");
    setRollNumberSuggestion("");
    setCurrentActiveRoll(null);
    setCurrentRollAction(null);
  };

  const closeHistoryModal = () => {
  setHistoryModalOpen(false);
  setSelectedSupply(null);
  setSupplyHistory([]);
  };

  // Guardar reposición de stock
  const handleRestock = async () => {
    if (!selectedSupply) return;
    if (!recordedBy.trim()) {
      alert("Selecciona quién registra.");
      return;
    }

    const isFilm = isFilmSupply(selectedSupply);

    if (isFilm && !selectedInventoryItem) {
      alert("Selecciona el rollo del inventario.");
      return;
    }
    if (!isFilm && (!restockAmount || parseFloat(restockAmount) <= 0)) {
      alert("Ingresa la cantidad que agregas al tanque.");
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const quantityBefore = parseFloat(selectedSupply.current_stock);
      let quantityAdded = isFilm
        ? parseFloat(selectedInventoryItem.quantity_remaining)
        : 0;
      
      if (isFilm) {
        // Film: manejar rollo actual antes de montar el nuevo
        if (currentActiveRoll) {
          if (!currentRollAction) {
            alert("Indica qué hacer con el rollo actual antes de continuar.");
            return;
          }
          if (currentRollAction === 'return') {
            await supabase
              .from('inventory')
              .update({
                status: 'in_stock',
                location: 'bodega',
                machine_id: null
              })
              .eq('id', currentActiveRoll.id);
          } else if (currentRollAction === 'discard') {
            await supabase
              .from('inventory')
              .update({
                status: 'depleted',
                depleted_at: nowIso,
                notes: `Descartado con ${currentActiveRoll.quantity_remaining}m restantes al cambiar rollo`
              })
              .eq('id', currentActiveRoll.id);
          }
        }
        
        // Marcar unidad nueva como in_machine en inventory
        const { error: invError } = await supabase
          .from('inventory')
          .update({
            status: 'in_machine',
            location: 'maquina',
            assigned_at: nowIso,
            machine_id: selectedSupply.machine_id
          })
          .eq('id', selectedInventoryItem.id);
        if (invError) throw invError;
      } else {
        if (!selectedInventoryItem) {
          alert("Selecciona la botella de la que estás vertiendo.");
          return;
        }
        if (!restockAmount || parseFloat(restockAmount) <= 0) {
          alert("Ingresa la cantidad que agregas al tanque.");
          return;
        }
        
        const mlToAdd = parseFloat(restockAmount);
        const newRemaining = Number(
          (selectedInventoryItem.quantity_remaining - mlToAdd).toFixed(3)
        );
        const isDepleted = newRemaining <= 0;
        
        await supabase
          .from('inventory')
          .update({
            quantity_remaining: Math.max(0, newRemaining),
            status: isDepleted ? 'depleted' : 'open',
            depleted_at: isDepleted ? nowIso : null
          })
          .eq('id', selectedInventoryItem.id);
          
        quantityAdded = mlToAdd;
      }
      
      const quantityAfter = isFilm 
        ? quantityAdded  // Para film: stock = metros del nuevo rollo
        : quantityBefore + quantityAdded;  // Para tinta: stock = tanque + lo que se agrega

      // Actualizar stock en machine_supplies
      const { error: supplyError } = await supabase
        .from('machine_supplies')
        .update({
          current_stock: quantityAfter,
          last_updated: nowIso,
          updated_by: recordedBy.trim()
        })
        .eq('id', selectedSupply.id);
      if (supplyError) throw supplyError;

      // Registrar movimiento
      await supabase
        .from('supply_movements')
        .insert([{
          machine_id: selectedSupply.machine_id,
          supply_type_id: selectedSupply.supply_type_id,
          movement_type: isFilm ? 'transfer' : 'consumption',
          quantity_before: isFilm ? quantityBefore : Number(selectedInventoryItem.quantity_remaining),
          quantity_after: isFilm ? quantityAfter : Number((selectedInventoryItem.quantity_remaining - quantityAdded).toFixed(3)),
          quantity_changed: isFilm ? quantityAdded : -quantityAdded,
          recorded_by: recordedBy.trim(),
          inventory_item_id: selectedInventoryItem.id,
          tank_before: isFilm ? null : quantityBefore,
          tank_after: isFilm ? null : quantityAfter,
          notes: isFilm
            ? `Rollo ${selectedInventoryItem.unit_id} montado en máquina.${notes ? ' ' + notes : ''}`
            : `Vertido al tanque desde ${selectedInventoryItem.unit_id}.${notes ? ' ' + notes : ''}`,
          recorded_at: nowIso
        }]);

      if (!isFilm) {
        await supabase
          .from('supply_movements')
          .insert([{
            machine_id: selectedSupply.machine_id,
            supply_type_id: selectedSupply.supply_type_id,
            movement_type: 'restock',
            quantity_before: quantityBefore,
            quantity_after: quantityAfter,
            quantity_changed: quantityAdded,
            recorded_by: recordedBy.trim(),
            inventory_item_id: null,
            tank_before: quantityBefore,
            tank_after: quantityAfter,
            notes: `Reposición de tanque desde ${selectedInventoryItem.unit_id}.${notes ? ' ' + notes : ''}`,
            recorded_at: nowIso
          }]);
      }

      alert(`${selectedSupply.supply_types.name} actualizado. +${quantityAdded}`);
      setSelectedInventoryItem(null);
      setInventoryItems([]);
      setRestockAmount("");
      closeRestockModal();
      fetchMachineSupplies();

    } catch (error) {
      console.error('Error en restock:', error);
      alert('Error al reponer stock: ' + error.message);
    }
  };

  // Obtener historial de un insumo
  const fetchSupplyHistory = async (machineId, supplyTypeId) => {
    setIsLoadingHistory(true);
    
    const isFilm = supplyTypeId === 7 || supplyTypeId === 15;

    let query = supabase
      .from('supply_movements')
      .select('*')
      .eq('machine_id', machineId)
      .eq('supply_type_id', supplyTypeId)
      .order('recorded_at', { ascending: false })
      .limit(20);

    if (isFilm) {
      // Para film: mostrar todos los movimientos (consumo automático e inventory)
      // No filtrar por inventory_item_id
    } else {
      // Para tintas: solo movimientos del tanque (sin inventory_item_id)
      query = query.is('inventory_item_id', null);
    }

    const { data, error } = await query;

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
    const target = machines.find(m => m.id?.toString() === id?.toString()) || machines[0];
    setSelectedMachine(target);
    updateAvailableSupplyTypes(target);
    setConsumptionRatio("1");
    setAutoTrackConsumption(true);
    setConfigModalOpen(true);
  };

  // Actualizar tipos de insumos disponibles según la máquina
  const updateAvailableSupplyTypes = (machine) => {
    if (!machine) {
      setAvailableSupplyTypes([]);
      setSelectedSupplyType("");
      return;
    }
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
    setNewMaterialName("");
    setNewMaterialWidth("");
    setConfigMode("existing");
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

    try {
      const nowIso = new Date().toISOString();
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
            updated_by: currentUser?.name || currentUser?.email || "Admin",
            last_updated: nowIso,
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
            recorded_by: currentUser?.name || currentUser?.email || 'Admin',
            recorded_at: nowIso,
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
      minute: '2-digit',
      timeZone: 'America/Chihuahua'
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

  // --- CÁLCULOS PARA ESTADÍSTICAS SEMANALES Y MENSUALES ---
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);

const todayStr = getLocalDateString();
const yesterdayStr = getLocalDateString(new Date(Date.now() - 86400000));

  // Helper to consistently get YYYY-MM-DD from a record date (avoids timezone mismatches)
  const dateToISODate = (d) => {
    if (!d) return "";
    try {
      const dt = new Date(d);
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch (e) {
      return String(d).slice(0,10);
    }
  };

  const getMetersByDate = (dateStr) => {
    // debug: comprobar registros
    // console.debug('getMetersByDate called for', dateStr, 'records:', productionRecords.length);
    return productionRecords
      .filter(r => dateToISODate(r.date) === dateStr)
      .reduce((sum, r) => sum + Number(r.meters_printed || 0), 0);
  };

  const getMetersThisWeek = () => {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    return productionRecords
      .filter(r => new Date(dateToISODate(r.date)) >= new Date(dateToISODate(startOfWeek)))
      .reduce((sum, r) => sum + Number(r.meters_printed || 0), 0);
  };

  const getMetersThisMonth = () => {
    const month = today.getMonth();
    const year = today.getFullYear();
    return productionRecords
      .filter(r => {
        const d = new Date(r.date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((sum, r) => sum + Number(r.meters_printed || 0), 0);
  };

  const getMetersYesterday = () => getMetersByDate(dateToISODate(yesterday));
  const getMetersToday = () => getMetersByDate(dateToISODate(today));
  const getMetersTotal = () =>
    productionRecords.reduce((sum, r) => sum + Number(r.meters_printed || 0), 0);

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-center text-gray-500">Cargando sistema de insumos...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-600">{getMetersToday().toFixed(2)} m</p>
          <p className="text-sm text-gray-600">Metros Hoy</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-yellow-600">{getMetersYesterday().toFixed(2)} m</p>
          <p className="text-sm text-gray-600">Metros Ayer</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-600">{getMetersThisWeek().toFixed(2)} m</p>
          <p className="text-sm text-gray-600">Semana Actual</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-purple-600">{getMetersThisMonth().toFixed(2)} m</p>
          <p className="text-sm text-gray-600">Mes Actual</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {machines?.find(m => String(m.id) === String(id))?.name || "Detalle de Máquina"}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setCorteModalOpen(true);
              setCorteFecha(new Date().toISOString().slice(0,10));
              setCorteMetros("");
              setCorteOperador("");
              setCorteError("");
              calcularTotalMes();
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

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b overflow-x-auto">
        <button
          className={`pb-2 px-4 font-semibold border-b-2 whitespace-nowrap ${activeTab === "trabajos" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}
          onClick={() => { setActiveTab("trabajos"); fetchTodayJobs(); }}
        >
          Trabajos de Hoy
        </button>
        <button
          className={`pb-2 px-4 font-semibold border-b-2 whitespace-nowrap ${activeTab === "historial_trabajos" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}
          onClick={() => { setActiveTab("historial_trabajos"); fetchJobHistory(); }}
        >
          Historial de Trabajos
        </button>
        <button
          className={`pb-2 px-4 font-semibold border-b-2 whitespace-nowrap ${activeTab === "insumos" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}
          onClick={() => setActiveTab("insumos")}
        >
          Control de Insumos
        </button>
        <button
          className={`pb-2 px-4 font-semibold border-b-2 whitespace-nowrap 
            ${activeTab === "rollos" 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-gray-500"}`}
          onClick={() => { setActiveTab("rollos"); fetchRollHistory(); }}
        >
          Rollos e Insumos
        </button>
        <button
          className={`pb-2 px-4 font-semibold border-b-2 whitespace-nowrap ${activeTab === "historial" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}
          onClick={() => setActiveTab("historial")}
        >
          Historial de Metros
        </button>
      </div>

        {/* Contenido de la máquina seleccionada */}
        {activeTab === "trabajos" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Trabajos de hoy — {getLocalDateString()}
              </h2>
              <button
                onClick={fetchTodayJobs}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 
                  text-gray-700 rounded hover:bg-gray-200 text-sm"
              >
                <RefreshCw size={14} />
                Actualizar
              </button>
            </div>

            {isLoadingJobs ? (
              <p className="text-center text-gray-500 py-8">Cargando...</p>
            ) : todayJobs.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <p className="text-lg">Sin trabajos registrados hoy</p>
                <p className="text-sm mt-1">
                  Registra trabajos desde la pantalla principal
                </p>
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">
                          Folio
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">
                          Descripción
                        </th>
                        {parseInt(id) === 4 && (
                          <th className="px-4 py-3 text-left font-semibold text-gray-600">
                            Material
                          </th>
                        )}
                        <th className="px-4 py-3 text-right font-semibold text-gray-600">
                          Metros
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">
                          Hora
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">
                          Operador
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayJobs.map((job, idx) => (
                        <tr 
                          key={job.id} 
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        >
                          <td className="px-4 py-3 font-mono font-semibold text-blue-600">
                            {job.folio || '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {job.job_description || '—'}
                          </td>
                          {parseInt(id) === 4 && (
                            <td className="px-4 py-3 text-gray-600 text-xs">
                              {job.inventory_item_id 
                                ? inventoryItemsMap[job.inventory_item_id] || '—'
                                : '—'}
                            </td>
                          )}
                          <td className="px-4 py-3 text-right font-semibold">
                            {Number(job.meters_printed).toFixed(2)} m
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {new Date(job.created_at).toLocaleTimeString('es-MX', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {job.registered_by || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-300 bg-blue-50">
                        <td className="px-4 py-3 font-bold" colSpan={2}>
                          Total del día
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">
                          {todayJobs
                            .reduce((sum, j) => sum + Number(j.meters_printed), 0)
                            .toFixed(2)} m
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "historial_trabajos" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Historial de Trabajos</h2>
              <button
                onClick={() => fetchJobHistory()}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 
                  text-gray-700 rounded hover:bg-gray-200 text-sm"
              >
                <RefreshCw size={14} />
                Actualizar
              </button>
            </div>
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex gap-2">
                {["week", "month", "custom"].map(f => (
                  <button
                    key={f}
                    onClick={() => {
                      setHistoryFilter(f);
                      if (f !== "custom") fetchJobHistory(f);
                    }}
                    className={`px-3 py-1 rounded text-sm font-medium border
                      ${historyFilter === f
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}
                  >
                    {f === "week" ? "Última semana" : f === "month" ? "Último mes" : "Personalizado"}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Buscar folio..."
                value={historyFolioSearch}
                onChange={e => setHistoryFolioSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchJobHistory()}
                className="border rounded px-3 py-1 text-sm w-36"
              />
              {historyFilter === "custom" && (
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={historyDateFrom}
                    onChange={e => setHistoryDateFrom(e.target.value)}
                    className="border rounded px-3 py-1 text-sm"
                  />
                  <span className="text-gray-400 text-sm">a</span>
                  <input
                    type="date"
                    value={historyDateTo}
                    onChange={e => setHistoryDateTo(e.target.value)}
                    className="border rounded px-3 py-1 text-sm"
                  />
                  <button
                    onClick={() => fetchJobHistory("custom")}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Buscar
                  </button>
                </div>
              )}
            </div>
            {isLoadingJobHistory ? (
              <p className="text-center text-gray-500 py-8">Cargando...</p>
            ) : jobHistory.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <p className="text-lg">Sin registros en este período</p>
              </div>
            ) : (
              <div>
                <div className="text-sm text-gray-500 mb-3">
                  {jobHistory.length} trabajos · {jobHistory
                    .reduce((sum, j) => sum + Number(j.meters_printed), 0)
                    .toFixed(2)} m total
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Fecha</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Folio</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Descripción</th>
                        {parseInt(id) === 4 && (
                          <th className="px-4 py-3 text-left font-semibold text-gray-600">Material</th>
                        )}
                        <th className="px-4 py-3 text-right font-semibold text-gray-600">Metros</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Hora</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Operador</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobHistory.map((job, idx) => (
                        <tr key={job.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {String(job.date).slice(0, 10)}
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold text-blue-600">
                            {job.folio || '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{job.job_description || '—'}</td>
                          {parseInt(id) === 4 && (
                            <td className="px-4 py-3 text-gray-600 text-xs">
                              {job.inventory_item_id 
                                ? inventoryItemsMap[job.inventory_item_id] || '—'
                                : '—'}
                            </td>
                          )}
                          <td className="px-4 py-3 text-right font-semibold">
                            {Number(job.meters_printed).toFixed(2)} m
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {new Date(job.created_at).toLocaleTimeString('es-MX', {
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="px-4 py-3 text-gray-500">{job.registered_by || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-300 bg-blue-50">
                        <td className="px-4 py-3 font-bold" colSpan={3}>Total del período</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">
                          {jobHistory.reduce((sum, j) => 
                            sum + Number(j.meters_printed), 0).toFixed(2)} m
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "rollos" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Historial de Rollos e Insumos</h2>
              <button
                onClick={fetchRollHistory}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 
                  text-gray-700 rounded hover:bg-gray-200 text-sm"
              >
                <RefreshCw size={14} />
                Actualizar
              </button>
            </div>

            {isLoadingRolls ? (
              <p className="text-center text-gray-500 py-8">Cargando...</p>
            ) : rollHistory.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <p className="text-lg">Sin registros</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">ID</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Insumo</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">Inicial</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">Restante</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">Consumido</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Estado</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Entrada</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Agotado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rollHistory.map((roll, idx) => {
                      const consumed = Number(roll.quantity) - Number(roll.quantity_remaining);
                      const pct = roll.quantity > 0 
                        ? ((consumed / roll.quantity) * 100).toFixed(0) 
                        : 0;
                      const statusColors = {
                        in_stock:   'bg-green-100 text-green-700',
                        open:       'bg-yellow-100 text-yellow-700',
                        in_machine: 'bg-blue-100 text-blue-700',
                        depleted:   'bg-gray-100 text-gray-500',
                      };
                      const statusLabels = {
                        in_stock:   'En bodega',
                        open:       'Abierta',
                        in_machine: 'En máquina',
                        depleted:   'Agotada',
                      };
                      return (
                        <tr key={roll.id} 
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 font-mono font-semibold text-blue-600">
                            {roll.unit_id}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {roll.supply_types?.name || '—'}
                            {roll.source === 'ink' && (
                              <span className="ml-1 text-xs text-gray-400">(pool)</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {roll.quantity} {roll.supply_types?.unit}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {roll.quantity_remaining} {roll.supply_types?.unit}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="bg-blue-500 h-1.5 rounded-full"
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{pct}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium 
                              ${statusColors[roll.status] || 'bg-gray-100 text-gray-500'}`}>
                              {statusLabels[roll.status] || roll.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {new Date(roll.received_at).toLocaleDateString('es-MX')}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {roll.depleted_at 
                              ? new Date(roll.depleted_at).toLocaleDateString('es-MX')
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "insumos" && (
          <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Package className="text-blue-600" size={24} />
            Insumos de {selectedMachine?.name || ""}
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
                
                return (
                  <div key={supply.id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold">{supply.supply_types.name}</h4>
                      <span className={`text-sm px-2 py-1 rounded-full ${getStatusColor(status)}`}>
                        {getStatusText(status)}
                      </span>
                    </div>
                    
                    <p className={`text-2xl font-bold ${getStatusTextColor(status)} mb-1`}>
                      {supply.supply_types.name.includes('Film') && activeRolls[supply.supply_type_id]
                        ? activeRolls[supply.supply_type_id].quantity_remaining
                        : supply.current_stock
                      } {supply.supply_types.unit}
                    </p>
                    
                    {(supply.supply_types.name.includes('Film')) && 
                      activeRolls[supply.supply_type_id] && (
                      <div className="flex items-center gap-2 mt-1 mb-2">
                        <span className="text-xs text-gray-500">Rollo activo:</span>
                        <span className="text-xs font-mono font-semibold text-blue-600 
                          bg-blue-50 px-2 py-0.5 rounded">
                          {activeRolls[supply.supply_type_id].unit_id}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({activeRolls[supply.supply_type_id].quantity_remaining}m)
                        </span>
                      </div>
                    )}
                    
                    <div className="text-sm text-gray-600 mb-3">
                      <p>Mínimo: {supply.minimum_level} {supply.supply_types.unit}</p>
                      <p>Crítico: {supply.critical_level} {supply.supply_types.unit}</p>
                      {supply.supplier && <p>Proveedor: {supply.supplier}</p>}
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
        )}

        {activeTab === "historial" && (
          <div>
            <h2 className="text-xl font-bold mb-4">Historial de Metros Impresos</h2>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Metros impresos</th>
                  <th className="px-4 py-2 text-left">Registrado por</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productionRecords.map(r => (
                  <tr key={r.id} className="border-b">
                    <td className="px-4 py-2">{r.date.slice(0,10)}</td>
                    <td className="px-4 py-2">{Number(r.meters_printed).toFixed(2)} m</td>
                    <td className="px-4 py-2">{r.registered_by || '-'}</td>
                    <td className="px-4 py-2">
                      <button
                        className="text-blue-600 hover:underline"
                        onClick={() => openEditRecord(r)}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
              <p><strong>Stock actual:</strong> {selectedSupply.current_stock} {selectedSupply.supply_types.unit}</p>
            </div>

            <div className="flex flex-col gap-4">
              {isFilmSupply(selectedSupply) ? (
                <div>
                  <label className="block text-gray-700 font-bold mb-2">
                    Rollo disponible en bodega *
                  </label>
                  {inventoryItems.length === 0 ? (
                    <div className="bg-red-50 border border-red-200 text-red-700 
                      px-3 py-2 rounded text-sm">
                      No hay rollos en bodega. Registra una entrada en Inventario primero.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {inventoryItems.map(item => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedInventoryItem(item)}
                          className={`w-full text-left px-4 py-3 rounded border transition
                            ${selectedInventoryItem?.id === item.id
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'}`}
                        >
                          <div className="font-mono font-semibold text-blue-700">
                            {item.unit_id}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.quantity_remaining} / {item.quantity} metros disponibles
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-gray-700 font-bold mb-2">
                    Botella disponible *
                  </label>
                  {inventoryItems.length === 0 ? (
                    <div className="bg-red-50 border border-red-200 text-red-700 
                      px-3 py-2 rounded text-sm">
                      No hay botellas disponibles. Registra una entrada en Inventario primero.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {inventoryItems.map(item => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedInventoryItem(item)}
                          className={`w-full text-left px-4 py-3 rounded border transition
                            ${selectedInventoryItem?.id === item.id
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'}`}
                        >
                          <div className="font-mono font-semibold text-blue-700">
                            {item.unit_id}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.quantity_remaining} / {item.quantity} ml disponibles
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedInventoryItem && (
                    <div className="bg-blue-50 p-3 rounded text-sm mt-2">
                      <p><strong>Botella:</strong> {selectedInventoryItem.unit_id}</p>
                      <p><strong>Stock actual tanque:</strong> {selectedSupply.current_stock} ml</p>
                      <p><strong>Cantidad a agregar:</strong></p>
                      <input
                        type="number"
                        value={restockAmount}
                        onChange={e => setRestockAmount(e.target.value)}
                        className="border rounded px-3 py-2 w-full mt-1"
                        min="0"
                        step="0.01"
                        placeholder="ml que agregas al tanque"
                      />
                      {restockAmount && (
                        <p className="mt-1"><strong>Stock final tanque:</strong> {
                          (parseFloat(selectedSupply.current_stock) + 
                          parseFloat(restockAmount || 0)).toFixed(0)
                        } ml</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {selectedInventoryItem && currentActiveRoll && (
                <div className="bg-yellow-50 border border-yellow-300 rounded p-3">
                  <p className="text-sm font-semibold text-yellow-800 mb-2">
                    ⚠ Rollo actual: {currentActiveRoll.unit_id} 
                    ({currentActiveRoll.quantity_remaining}m restantes)
                  </p>
                  <p className="text-xs text-yellow-700 mb-3">
                    ¿Qué hacemos con este rollo?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentRollAction('return')}
                      className={`flex-1 px-3 py-2 rounded text-sm font-medium border
                        ${currentRollAction === 'return'
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'}`}
                    >
                      Regresar a bodega
                    </button>
                    <button
                      onClick={() => setCurrentRollAction('discard')}
                      className={`flex-1 px-3 py-2 rounded text-sm font-medium border
                        ${currentRollAction === 'discard'
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'}`}
                    >
                      Descartar
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-gray-700 font-bold mb-2">
                  Registrado por *
                </label>
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
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-2">Notas</label>
                <textarea
                  placeholder="Observaciones adicionales"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="border rounded px-3 py-2 w-full h-16 resize-none"
                />
              </div>

              <button
                onClick={handleRestock}
                disabled={!selectedInventoryItem || inventoryItems.length === 0}
                className={`px-4 py-2 rounded text-white
                  ${!selectedInventoryItem || inventoryItems.length === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'}`}
              >
                Confirmar reposición
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN DE REGISTRO DE METROS */}
      {editRecordModalOpen && editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg relative">
            <button
              onClick={closeEditRecordModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>

            <h2 className="text-xl font-semibold mb-4">Editar registro de {selectedMachine?.name || "máquina"}</h2>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Fecha</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Metros impresos</label>
                <input
                  type="number"
                  value={editMeters}
                  onChange={e => setEditMeters(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Registrado por</label>
                <input
                  type="text"
                  value={editRegisteredBy}
                  onChange={e => setEditRegisteredBy(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                />
              </div>

              {editError && <div className="text-red-600 text-sm">{editError}</div>}

              <div className="flex gap-2">
                <button
                  onClick={handleUpdateRecord}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex-1"
                >
                  Guardar cambios
                </button>
                <button
                  onClick={closeEditRecordModal}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
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
              Historial de {selectedSupply.supply_types.name} - {selectedMachine?.name || ""}
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
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeConfigModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>
            <h2 className="text-xl font-semibold mb-4">Configurar Insumo</h2>
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Máquina</label>
                <input
                  type="text"
                  value={selectedMachine?.name || ""}
                  disabled
                  className="border rounded px-3 py-2 w-full bg-gray-100 text-gray-500"
                />
              </div>

              {/* Si es Plotter, mostrar selector de modo */}
              {selectedMachine?.id?.toString() === "4" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfigMode("existing")}
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium border
                      ${configMode === "existing"
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300'}`}
                  >
                    Material existente
                  </button>
                  <button
                    onClick={() => setConfigMode("new")}
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium border
                      ${configMode === "new"
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300'}`}
                  >
                    Material nuevo
                  </button>
                </div>
              )}

              {/* Modo material nuevo (solo Plotter) */}
              {selectedMachine?.id?.toString() === "4" && configMode === "new" ? (
                <>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Tipo de material *
                    </label>
                    <select
                      value={newMaterialName}
                      onChange={e => setNewMaterialName(e.target.value)}
                      className="border rounded px-3 py-2 w-full"
                    >
                      <option value="">Selecciona...</option>
                      <option value="Vinil">Vinil</option>
                      <option value="Lona">Lona</option>
                      <option value="Canvas">Canvas</option>
                      <option value="Papel Blueback">Papel Blueback</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Ancho en metros *
                    </label>
                    <input
                      type="number"
                      placeholder="Ej: 1.52"
                      value={newMaterialWidth}
                      onChange={e => setNewMaterialWidth(e.target.value)}
                      className="border rounded px-3 py-2 w-full"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Stock inicial (metros) *
                    </label>
                    <input
                      type="number"
                      value={initialStock}
                      onChange={e => setInitialStock(e.target.value)}
                      className="border rounded px-3 py-2 w-full"
                      min="0"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      if (!newMaterialName || !newMaterialWidth || !initialStock) {
                        alert("Completa todos los campos.");
                        return;
                      }
                      const supplyName = `${newMaterialName} ${parseFloat(newMaterialWidth).toFixed(2)}m`;
                      
                      // Verificar si ya existe
                      const exists = supplyTypes.find(
                        st => st.name === supplyName && st.machine_compatibility === 'Plotter'
                      );
                      if (exists) {
                        alert(`${supplyName} ya existe. Selecciónalo en "Material existente".`);
                        return;
                      }

                      // Crear supply_type nuevo
                      const { data: newType, error: typeError } = await supabase
                        .from('supply_types')
                        .insert([{
                          name: supplyName,
                          category: 'Material',
                          unit: 'metros',
                          machine_compatibility: 'Plotter'
                        }])
                        .select()
                        .single();

                      if (typeError) {
                        alert("Error al crear material: " + typeError.message);
                        return;
                      }

                      // Agregar a machine_supplies
                      const nowIso = new Date().toISOString();
                      const { error: supplyError } = await supabase
                        .from('machine_supplies')
                        .insert([{
                          machine_id: 4,
                          supply_type_id: newType.id,
                          current_stock: parseFloat(initialStock),
                          minimum_level: 20,
                          critical_level: 10,
                          consumption_ratio: 1.0,
                          auto_track: false,
                          meters_accounted: 0,
                          updated_by: currentUser?.name || 'Admin',
                          last_updated: nowIso
                        }]);

                      if (supplyError) {
                        alert("Error al agregar insumo: " + supplyError.message);
                        return;
                      }

                      // Registrar en plotter_materials
                      await supabase
                        .from('plotter_materials')
                        .insert([{
                          name: newMaterialName,
                          width_m: parseFloat(newMaterialWidth)
                        }]);

                      alert(`${supplyName} agregado correctamente.`);
                      await fetchMachineSupplies();
                      closeConfigModal();
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Crear y agregar material
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Tipo de Insumo
                    </label>
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
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Stock inicial *
                    </label>
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
                          supplyTypes.find(st => 
                            st.id.toString() === selectedSupplyType
                          )?.unit || "la unidad correspondiente"
                        }
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Nivel mínimo *
                    </label>
                    <input
                      type="number"
                      value={minimumLevel}
                      onChange={e => setMinimumLevel(e.target.value)}
                      className="border rounded px-3 py-2 w-full"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Nivel crítico *
                    </label>
                    <input
                      type="number"
                      value={criticalLevel}
                      onChange={e => setCriticalLevel(e.target.value)}
                      className="border rounded px-3 py-2 w-full"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Ratio de consumo *
                    </label>
                    <input
                      type="number"
                      value={consumptionRatio}
                      onChange={e => setConsumptionRatio(e.target.value)}
                      className="border rounded px-3 py-2 w-full"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={autoTrackConsumption}
                      onChange={e => setAutoTrackConsumption(e.target.checked)}
                      className="h-4 w-4"
                    />
                    Activar descuento automático al registrar cortes
                  </label>
                  <button
                    onClick={handleAddSupplyToMachine}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Agregar Insumo
                  </button>
                </>
              )}
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
            <div className="grid grid-cols-2 gap-3">
              {!editingSupply?.supply_types?.name?.includes('Film') && (
                <div>
                  <label className="block text-gray-600 text-sm font-semibold mb-1">
                    Stock actual *
                  </label>
                  <input
                    type="number"
                    value={editingSupply.current_stock}
                    onChange={e => setEditingSupply({ ...editingSupply, current_stock: e.target.value })}
                    className="border rounded px-3 py-1.5 w-full text-sm"
                    min="0" step="0.01"
                  />
                </div>
              )}
              <div>
                <label className="block text-gray-600 text-sm font-semibold mb-1">
                  Consumo por metro ({editingSupply?.supply_types?.unit || 'u'}/m) *
                </label>
                <input
                  type="number"
                  value={editingSupply.consumption_ratio}
                  onChange={e => setEditingSupply({ ...editingSupply, consumption_ratio: e.target.value })}
                  className="border rounded px-3 py-1.5 w-full text-sm"
                  min="0" step="0.01"
                />
              </div>
              <div>
                <label className="block text-gray-600 text-sm font-semibold mb-1">
                  Stock mínimo
                </label>
                <input
                  type="number"
                  value={editingSupply.minimum_level}
                  onChange={e => setEditingSupply({ ...editingSupply, minimum_level: e.target.value })}
                  className="border rounded px-3 py-1.5 w-full text-sm"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-gray-600 text-sm font-semibold mb-1">
                  Stock crítico
                </label>
                <input
                  type="number"
                  value={editingSupply.critical_level}
                  onChange={e => setEditingSupply({ ...editingSupply, critical_level: e.target.value })}
                  className="border rounded px-3 py-1.5 w-full text-sm"
                  min="0"
                />
              </div>
              <div className="col-span-2">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={Boolean(editingSupply.auto_track)}
                    onChange={e => setEditingSupply({ ...editingSupply, auto_track: e.target.checked })}
                    className="h-4 w-4"
                  />
                  Descuento automático al registrar metros
                </label>
              </div>
              <div className="col-span-2">
                <label className="block text-gray-600 text-sm font-semibold mb-1">
                  Razón de edición *
                </label>
                <input
                  type="text"
                  value={editReason}
                  onChange={e => setEditReason(e.target.value)}
                  className="border rounded px-3 py-1.5 w-full text-sm"
                  placeholder="¿Por qué se edita este insumo?"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-gray-600 text-sm font-semibold mb-1">
                  Quién autoriza *
                </label>
                <input
                  type="text"
                  value={editAuthorizedBy}
                  onChange={e => setEditAuthorizedBy(e.target.value)}
                  className="border rounded px-3 py-1.5 w-full text-sm"
                  placeholder="Nombre de quien autoriza"
                />
              </div>
              <div className="col-span-2">
                <button
                  onClick={async () => {
                    if (!editReason.trim() || !editAuthorizedBy.trim()) {
                      alert("Completa la razón y quién autoriza.");
                      return;
                    }
                    const ratioValue = parseFloat(editingSupply.consumption_ratio);
                    if (!ratioValue || ratioValue <= 0) {
                      alert("Define un consumo por metro válido.");
                      return;
                    }
                    const { error } = await supabase
                      .from('machine_supplies')
                      .update({
                        current_stock: parseFloat(editingSupply.current_stock),
                        minimum_level: parseFloat(editingSupply.minimum_level),
                        critical_level: parseFloat(editingSupply.critical_level),
                        consumption_ratio: ratioValue,
                        auto_track: Boolean(editingSupply.auto_track),
                        edit_reason: editReason,
                        edit_authorized_by: editAuthorizedBy
                      })
                      .eq('id', editingSupply.id);
                    if (error) {
                      alert("Error al editar: " + error.message);
                    } else {
                      alert("Insumo actualizado.");
                      closeEditModal();
                      fetchMachineSupplies();
                    }
                  }}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded 
                    hover:bg-blue-700 text-sm font-medium"
                >
                  Guardar Cambios
                </button>
              </div>
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
                  alert("Error al guardar razón de eliminación: " + error.message); className="bg-red-600 text"
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
              Corte diario de {selectedMachine?.name || ""}
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
                  placeholder="Cantidad de metros impresos"
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
              
              {corteError && <div className="text-red-600 text-sm">{corteError}</div>}
              
              <button
                onClick={async () => {
                  if (!corteMetros || parseFloat(corteMetros) <= 0) {
                    setCorteError("Ingresa una cantidad válida de metros.");
                    return;
                  }
                  if (!corteOperador) {
                    setCorteError("Selecciona el operador.");
                    return;
                  }

                  setCorteLoading(true);
                  try {
                    // Inserta el corte
                    const { error } = await supabase
                      .from('machine_daily_prints')
                      .insert([{
                        machine_id: id,
                        date: corteFecha,
                        meters_printed: Number(corteMetros),
                        registered_by: corteOperador
                      }]);
                    if (error) {
                      setCorteError("Error al guardar el corte: " + error.message);
                      setCorteLoading(false);
                      return;
                    }
                    alert("¡Corte diario registrado correctamente!");
                    calcularTotalMes();
                    setCorteError("");
                    setCorteOperador("");
                    setCorteMetros("");
                    setCorteLoading(false);
                    setCorteModalOpen(false);
                  } catch (error) {
                    setCorteError("Error al guardar el corte: " + error.message);
                    setCorteLoading(false);
                  }
                }}
                disabled={corteLoading}
                className={`bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 ${corteLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {corteLoading ? "Guardando..." : "Guardar Corte Diario"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN DE REGISTROS */}
      {editRecordModalOpen && editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg relative">
            <button
              onClick={closeEditRecordModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>

            <h2 className="text-xl font-semibold mb-4">Editar registro de {selectedMachine?.name || "máquina"}</h2>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Fecha</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Metros impresos</label>
                <input
                  type="number"
                  value={editMeters}
                  onChange={e => setEditMeters(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Registrado por</label>
                <input
                  type="text"
                  value={editRegisteredBy}
                  onChange={e => setEditRegisteredBy(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                />
              </div>

              {editError && <div className="text-red-600 text-sm">{editError}</div>}

              <div className="flex gap-2">
                <button
                  onClick={handleUpdateRecord}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex-1"
                >
                  Guardar cambios
                </button>
                <button
                  onClick={closeEditRecordModal}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    {/* Cierre del contenido principal */}
    </div>
  );
}