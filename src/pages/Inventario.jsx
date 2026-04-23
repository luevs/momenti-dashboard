import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import useCurrentUser from '../utils/useCurrentUser';
import { Package, Plus, X, RefreshCw, Archive, Cpu } from "lucide-react";

export default function Inventario() {
  const currentUser = useCurrentUser();
  const [inventory, setInventory] = useState([]);
  const [supplyTypes, setSupplyTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activePool, setActivePool] = useState("DTF Textil");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  // Estados del modal de entrada
  const [selectedSupplyType, setSelectedSupplyType] = useState("");
  const [entryQuantity, setEntryQuantity] = useState("");
  const [entryUnitId, setEntryUnitId] = useState("");
  const [entryCost, setEntryCost] = useState("");
  const [entrySupplier, setEntrySupplier] = useState("");
  const [entryNotes, setEntryNotes] = useState("");
  const [plotterTypes, setPlotterTypes] = useState([]);
  const [plotterWidths, setPlotterWidths] = useState([]);
  const [selectedPlotterType, setSelectedPlotterType] = useState("");
  const [selectedPlotterWidth, setSelectedPlotterWidth] = useState("");
  const [selectedCatalogId, setSelectedCatalogId] = useState(null);
  const [catalogMap, setCatalogMap] = useState({});
  const [activeTab, setActiveTab] = useState("inventario");
  const [movements, setMovements] = useState([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);
  const [movFilter, setMovFilter] = useState({
    machine: "",
    supplyType: "",
    movType: "",
    dateFrom: "",
    dateTo: ""
  });
  const [machines, setMachines] = useState([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [itemMovements, setItemMovements] = useState([]);
  const [isLoadingItemHistory, setIsLoadingItemHistory] = useState(false);

  const pools = ["DTF Textil", "UV DTF", "Plotter"];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);

    const [{ data: inv, error: invError }, { data: types }, { data: catalog }, 
           { data: pTypes }, { data: pWidths }, { data: mach }] = 
      await Promise.all([
        supabase.from('inventory').select('*').order('received_at', { ascending: false }),
        supabase.from('supply_types').select('*').order('name'),
        supabase
          .from('plotter_materials_catalog')
          .select('id, material_type_id, width_id'),
        supabase.from('plotter_material_types').select('id, name').order('name'),
        supabase.from('plotter_material_widths').select('id, label, width_m').order('width_m'),
        supabase.from('machines').select('id, name').order('name')
      ]);

    if (types) setSupplyTypes(types);
    if (pTypes) setPlotterTypes(pTypes);
    if (pWidths) setPlotterWidths(pWidths);
    if (mach) setMachines(mach);

    const typesMap = {};
    (types || []).forEach(t => { typesMap[t.id] = t; });

    // Traer tipos y anchos por separado
    const { data: matTypes } = await supabase
      .from('plotter_material_types')
      .select('id, name');

    const { data: matWidths } = await supabase
      .from('plotter_material_widths')
      .select('id, label, width_m');

    const typesById = {};
    (matTypes || []).forEach(t => { typesById[t.id] = t; });

    const widthsById = {};
    (matWidths || []).forEach(w => { widthsById[w.id] = w; });

    const catalogMap = {};
    (catalog || []).forEach(c => {
      const typeName = typesById[c.material_type_id]?.name || 'Material';
      const widthLabel = widthsById[c.width_id]?.label || '';
      catalogMap[c.id] = {
        id: c.id,
        name: `${typeName} ${widthLabel}`.trim(),
        category: typeName,
        unit: 'metros'
      };
    });
    setCatalogMap(catalogMap);

    if (!invError && inv) {
      const enriched = inv.map(item => ({
        ...item,
        supply_types: item.plotter_catalog_id
          ? { 
              name: item.display_name || 'Material',
              category: item.display_name || 'Material',
              unit: 'metros'
            }
          : typesMap[item.supply_type_id] || null
      }));
      setInventory(enriched);
    } else {
      setInventory([]);
    }

    setIsLoading(false);
  };

  const fetchMovements = async () => {
    setIsLoadingMovements(true);
    let query = supabase
      .from('supply_movements')
      .select(`
        id, machine_id, supply_type_id, movement_type,
        quantity_before, quantity_after, quantity_changed,
        recorded_by, recorded_at, notes
      `)
      .order('recorded_at', { ascending: false })
      .limit(200)
      .not('inventory_item_id', 'is', null);

    if (movFilter.machine) query = query.eq('machine_id', parseInt(movFilter.machine));
    if (movFilter.supplyType) query = query.eq('supply_type_id', parseInt(movFilter.supplyType));
    if (movFilter.movType) query = query.eq('movement_type', movFilter.movType);
    if (movFilter.dateFrom) query = query.gte('recorded_at', movFilter.dateFrom);
    if (movFilter.dateTo) query = query.lte('recorded_at', movFilter.dateTo + 'T23:59:59');

    const { data, error } = await query;
    if (!error && data) {
      const typesMap = {};
      supplyTypes.forEach(t => { typesMap[t.id] = t.name; });
      const machinesMap = {};
      machines.forEach(m => { machinesMap[m.id] = m.name; });
      const enriched = data.map(mov => ({
        ...mov,
        maquina: machinesMap[mov.machine_id] || `Máquina ${mov.machine_id}`,
        insumo: typesMap[mov.supply_type_id] || `Insumo ${mov.supply_type_id}`
      }));
      setMovements(enriched);
    }
    setIsLoadingMovements(false);
  };

  const fetchItemMovements = async (item) => {
    setIsLoadingItemHistory(true);
    setHistoryItem(item);
    setHistoryModalOpen(true);

    const { data, error } = await supabase
      .from('supply_movements')
      .select('*')
      .eq('inventory_item_id', item.id)
      .lt('quantity_changed', 0)
      .order('recorded_at', { ascending: false })
      .limit(50);

    if (!error) setItemMovements(data || []);
    setIsLoadingItemHistory(false);
  };

  const getFilteredInventory = () =>
    inventory.filter(i => i.pool === activePool);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'in_stock':   return 'bg-green-100 text-green-700';
      case 'in_machine': return 'bg-blue-100 text-blue-700';
      case 'depleted':   return 'bg-gray-100 text-gray-500';
      case 'open':       return 'bg-yellow-100 text-yellow-700';
      default:           return 'bg-gray-100 text-gray-500';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'in_stock':   return 'En bodega';
      case 'in_machine': return 'En máquina';
      case 'depleted':   return 'Agotado';
      case 'open':       return 'Abierta';
      default:           return status;
    }
  };

  const getPoolCounts = (pool) => {
    const items = inventory.filter(i => i.pool === pool);
    return {
      total: items.length,
      inStock: items.filter(i => i.status === 'in_stock').length,
      open: items.filter(i => i.status === 'open').length,
      inMachine: items.filter(i => i.status === 'in_machine').length,
      depleted: items.filter(i => i.status === 'depleted').length,
    };
  };

  const generateUnitId = (supplyTypeId, pool) => {
    const type = supplyTypes.find(t => t.id === parseInt(supplyTypeId));
    if (!type) return '';

    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yy = String(today.getFullYear()).slice(2);
    const dateStr = `${dd}${mm}${yy}`;

    const prefix = pool === 'DTF Textil' ? 'DTF' 
      : pool === 'UV DTF' ? 'UV' 
      : 'PLT';

    const typeCode = type.name
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '')
      .slice(0, 8)
      .toUpperCase();

    const existing = inventory.filter(i => 
      i.supply_type_id === parseInt(supplyTypeId) &&
      i.unit_id.includes(dateStr)
    ).length;

    const next = String(existing + 1).padStart(3, '0');
    return `${prefix}-${typeCode}-${dateStr}-${next}`;
  };

  const openAddModal = () => {
    setSelectedSupplyType("");
    setEntryQuantity("");
    setEntryUnitId("");
    setEntryCost("");
    setEntrySupplier("");
    setEntryNotes("");
    setSelectedPlotterType("");
    setSelectedPlotterWidth("");
    setSelectedCatalogId(null);
    setAddModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem({ ...item });
    setDeleteConfirm(false);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setEditLoading(true);
    try {
      const { error } = await supabase
        .from('inventory')
        .update({
          unit_id: editingItem.unit_id,
          quantity: parseFloat(editingItem.quantity),
          quantity_remaining: parseFloat(editingItem.quantity_remaining),
          status: editingItem.status,
          cost: editingItem.cost ? parseFloat(editingItem.cost) : null,
          supplier: editingItem.supplier || null,
          notes: editingItem.notes || null,
        })
        .eq('id', editingItem.id);
      if (error) throw error;
      alert("Unidad actualizada correctamente.");
      setEditModalOpen(false);
      fetchData();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingItem) return;
    setEditLoading(true);
    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', editingItem.id);
      
      if (error) {
        if (error.message.includes('foreign key') || 
            error.message.includes('violates')) {
          alert(
            `No se puede eliminar "${editingItem.unit_id}" porque está ` +
            `asociado a trabajos registrados en producción.\n\n` +
            `Para eliminar este insumo primero debes borrar los trabajos ` +
            `que lo usaron desde el Historial de Trabajos de la máquina.\n\n` +
            `Si solo quieres ocultarlo, cambia su estado a "Agotada" y guarda.`
          );
        } else {
          alert("Error al eliminar: " + error.message);
        }
        setDeleteConfirm(false);
        return;
      }
      
      alert("Unidad eliminada correctamente.");
      setEditModalOpen(false);
      fetchData();
    } catch (err) {
      alert("Error inesperado: " + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleAddEntry = async () => {
    if (activePool === 'Plotter') {
      if (!selectedCatalogId || !entryQuantity || !entryUnitId) {
        alert("Selecciona tipo, ancho e ingresa la cantidad.");
        return;
      }
    } else {
      if (!selectedSupplyType || !entryQuantity || !entryUnitId) {
        alert("Completa tipo de insumo, cantidad e ID de unidad.");
        return;
      }
    }

    setAddLoading(true);
    try {
      const nowIso = new Date().toISOString();
      
      if (activePool === 'Plotter') {
        const typeName = plotterTypes.find(
          t => t.id === parseInt(selectedPlotterType)
        )?.name || '';

        const { error } = await supabase
          .from('inventory')
          .insert([{
            plotter_catalog_id: selectedCatalogId,
            supply_type_id: null,
            unit_id: entryUnitId.trim(),
            quantity: parseFloat(entryQuantity),
            quantity_remaining: parseFloat(entryQuantity),
            status: 'in_stock',
            location: 'bodega',
            pool: 'Plotter',
            display_name: typeName,
            cost: entryCost ? parseFloat(entryCost) : null,
            supplier: entrySupplier || null,
            notes: entryNotes || null,
            created_by: currentUser?.name || currentUser?.email || 'Sistema'
          }]);

        if (error) throw error;
      } else {
        const type = supplyTypes.find(t => t.id === parseInt(selectedSupplyType));
        const pool = type?.machine_compatibility || activePool;

        const { error } = await supabase
          .from('inventory')
          .insert([{
            supply_type_id: parseInt(selectedSupplyType),
            unit_id: entryUnitId.trim(),
            quantity: parseFloat(entryQuantity),
            quantity_remaining: parseFloat(entryQuantity),
            status: 'in_stock',
            location: 'bodega',
            pool,
            cost: entryCost ? parseFloat(entryCost) : null,
            supplier: entrySupplier || null,
            notes: entryNotes || null,
            created_by: currentUser?.name || currentUser?.email || 'Sistema'
          }]);

        if (error) throw error;
      }

      alert("Entrada registrada correctamente.");
      setAddModalOpen(false);
      setSelectedPlotterType("");
      setSelectedPlotterWidth("");
      setSelectedCatalogId(null);
      fetchData();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setAddLoading(false);
    }
  };

  if (isLoading) return (
    <div className="p-6 text-center text-gray-500">Cargando inventario...</div>
  );

  const filteredInventory = getFilteredInventory();
  console.log('filtered inventory plotter:', 
    filteredInventory.map(i => ({ 
      unit_id: i.unit_id, 
      supply_types: i.supply_types 
    }))
  );
  const grouped = filteredInventory.reduce((acc, item) => {
    const name = activePool === 'Plotter'
      ? (item.supply_types?.category || 'Material')
      : (item.supply_types?.name || 'Sin nombre');
    if (!acc[name]) acc[name] = [];
    acc[name].push(item);
    return acc;
  }, {});

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Inventario de Insumos</h1>
          <p className="text-gray-500 text-sm mt-1">
            Registro de unidades físicas por pool de máquinas
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 
              text-gray-700 rounded hover:bg-gray-200 text-sm"
          >
            <RefreshCw size={14} />
            Actualizar
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 
              text-white rounded hover:bg-blue-700"
          >
            <Plus size={18} />
            Registrar entrada
          </button>
        </div>
      </div>

      {/* Tabs principales */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab("inventario")}
          className={`pb-2 px-4 font-semibold border-b-2 whitespace-nowrap
            ${activeTab === "inventario"
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500'}`}
        >
          Inventario
        </button>
        <button
          onClick={() => { setActiveTab("movimientos"); fetchMovements(); }}
          className={`pb-2 px-4 font-semibold border-b-2 whitespace-nowrap
            ${activeTab === "movimientos"
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500'}`}
        >
          Movimientos
        </button>
      </div>

      {activeTab === "inventario" && (
        <div>
          {/* Tabs por pool */}
          <div className="flex gap-4 mb-6 border-b">
            {pools.map(pool => {
              const counts = getPoolCounts(pool);
              return (
                <button
                  key={pool}
                  onClick={() => setActivePool(pool)}
                  className={`pb-2 px-4 font-semibold border-b-2 whitespace-nowrap
                    ${activePool === pool
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500'}`}
                >
                  {pool}
                  {counts.inStock > 0 && (
                    <span className="ml-2 text-xs bg-green-100 text-green-700 
                      px-1.5 py-0.5 rounded-full">
                      {counts.inStock} en bodega
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Resumen del pool */}
          {(() => {
            const counts = getPoolCounts(activePool);
            return (
              <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">{counts.inStock}</p>
              <p className="text-sm text-gray-600">En bodega</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-yellow-600">{counts.open}</p>
              <p className="text-sm text-gray-600">Abiertas</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">{counts.inMachine}</p>
              <p className="text-sm text-gray-600">En máquina</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-500">{counts.depleted}</p>
              <p className="text-sm text-gray-600">Agotadas</p>
            </div>
          </div>
        );
      })()}

      {/* Tabla agrupada por insumo */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <Archive size={48} className="mx-auto mb-3 opacity-30" />
          <p>Sin registros en este pool</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([supplyName, items]) => (
            <div key={supplyName}>
              <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Package size={16} className="text-blue-500" />
                {supplyName}
                <span className="text-xs text-gray-400 font-normal">
                  {items.filter(i => i.status === 'in_stock').length} en bodega · 
                  {items.filter(i => i.status === 'in_machine').length} en máquina
                </span>
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">ID</th>
                      {activePool === 'Plotter' && (
                        <th className="px-4 py-2 text-left font-semibold text-gray-600">
                          Ancho
                        </th>
                      )}
                      <th className="px-4 py-2 text-right font-semibold text-gray-600">Cantidad</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-600">Restante</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Estado</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Entrada</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Proveedor</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Historial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.id} 
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => openEditModal(item)}
                            className="font-mono font-semibold text-blue-600 hover:text-blue-800 
                              hover:underline cursor-pointer"
                          >
                            {item.unit_id}
                          </button>
                        </td>
                        {activePool === 'Plotter' && (
                          <td className="px-4 py-2 text-gray-700">
                            {item.plotter_catalog_id && catalogMap[item.plotter_catalog_id]
                              ? catalogMap[item.plotter_catalog_id].name.split(' ').slice(1).join(' ')
                              : '—'}
                          </td>
                        )}
                        <td className="px-4 py-2 text-right">
                          {item.quantity} {item.supply_types?.unit}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold">
                          {item.quantity_remaining} {item.supply_types?.unit}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium 
                            ${getStatusBadge(item.status)}`}>
                            {getStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-500 text-xs">
                          {new Date(item.received_at).toLocaleDateString('es-MX')}
                        </td>
                        <td className="px-4 py-2 text-gray-500">
                          {item.supplier || '—'}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => fetchItemMovements(item)}
                            className="text-blue-500 hover:text-blue-700 text-xs 
                              flex items-center gap-1"
                            title="Ver historial de movimientos"
                          >
                            <RefreshCw size={12} />
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
        </div>
      )}

      {activeTab === "movimientos" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Historial de Movimientos</h2>
            <button
              onClick={fetchMovements}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 
                text-gray-700 rounded hover:bg-gray-200 text-sm"
            >
              <RefreshCw size={14} />
              Actualizar
            </button>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3 mb-4">
            <select
              value={movFilter.machine}
              onChange={e => setMovFilter(prev => ({ ...prev, machine: e.target.value }))}
              className="border rounded px-3 py-1.5 text-sm"
            >
              <option value="">Todas las máquinas</option>
              {machines.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>

            <select
              value={movFilter.supplyType}
              onChange={e => setMovFilter(prev => ({ ...prev, supplyType: e.target.value }))}
              className="border rounded px-3 py-1.5 text-sm"
            >
              <option value="">Todos los insumos</option>
              {supplyTypes.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <select
              value={movFilter.movType}
              onChange={e => setMovFilter(prev => ({ ...prev, movType: e.target.value }))}
              className="border rounded px-3 py-1.5 text-sm"
            >
              <option value="">Todos los tipos</option>
              <option value="restock">Reposición</option>
              <option value="consumption">Consumo</option>
              <option value="adjustment">Ajuste</option>
              <option value="transfer">Transferencia</option>
            </select>

            <input
              type="date"
              value={movFilter.dateFrom}
              onChange={e => setMovFilter(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="border rounded px-3 py-1.5 text-sm"
            />
            <span className="text-gray-400 text-sm self-center">a</span>
            <input
              type="date"
              value={movFilter.dateTo}
              onChange={e => setMovFilter(prev => ({ ...prev, dateTo: e.target.value }))}
              className="border rounded px-3 py-1.5 text-sm"
            />

            <button
              onClick={fetchMovements}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Filtrar
            </button>

            <button
              onClick={() => {
                setMovFilter({ machine: "", supplyType: "", movType: "", dateFrom: "", dateTo: "" });
                setTimeout(fetchMovements, 100);
              }}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
            >
              Limpiar
            </button>
          </div>

          {isLoadingMovements ? (
            <p className="text-center text-gray-500 py-8">Cargando...</p>
          ) : movements.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <p>Sin movimientos con los filtros seleccionados</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-3">
                {movements.length} movimientos
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Fecha</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Máquina</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Insumo</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Tipo</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">Antes</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">Después</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">Cambio</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Operador</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((mov, idx) => {
                      const typeColors = {
                        restock:     'bg-green-100 text-green-700',
                        consumption: 'bg-blue-100 text-blue-700',
                        adjustment:  'bg-yellow-100 text-yellow-700',
                        transfer:    'bg-purple-100 text-purple-700',
                      };
                      const typeLabels = {
                        restock:     'Reposición',
                        consumption: 'Consumo',
                        adjustment:  'Ajuste',
                        transfer:    'Transferencia',
                      };
                      return (
                        <tr key={mov.id}
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                            {new Date(mov.recorded_at).toLocaleString('es-MX', {
                              day: '2-digit', month: 'short',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{mov.maquina}</td>
                          <td className="px-4 py-3 text-gray-700">{mov.insumo}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium
                              ${typeColors[mov.movement_type] || 'bg-gray-100 text-gray-500'}`}>
                              {typeLabels[mov.movement_type] || mov.movement_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            {Number(mov.quantity_before).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            {Number(mov.quantity_after).toFixed(2)}
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold
                            ${Number(mov.quantity_changed) >= 0 
                              ? 'text-green-600' : 'text-red-600'}`}>
                            {Number(mov.quantity_changed) >= 0 ? '+' : ''}
                            {Number(mov.quantity_changed).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-gray-500">{mov.recorded_by || '—'}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">
                            {mov.notes || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {historyModalOpen && historyItem && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex 
          justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-2xl 
            shadow-lg relative max-h-[80vh] overflow-y-auto">
            <button
              onClick={() => setHistoryModalOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>
            <h2 className="text-xl font-semibold mb-1">
              Historial — {historyItem.unit_id}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {historyItem.supply_types?.name}
            </p>

            {isLoadingItemHistory ? (
              <p className="text-center text-gray-500 py-8">Cargando...</p>
            ) : itemMovements.length === 0 ? (
              <p className="text-center text-gray-400 py-8">
                Sin movimientos registrados
              </p>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Fecha</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Tipo</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-600">Antes</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-600">Después</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-600">Cambio</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-600">Tanque antes</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-600">Tanque después</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Operador</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {itemMovements.map((mov, idx) => {
                    const typeColors = {
                      restock:     'bg-green-100 text-green-700',
                      consumption: 'bg-blue-100 text-blue-700',
                      adjustment:  'bg-yellow-100 text-yellow-700',
                      transfer:    'bg-purple-100 text-purple-700',
                    };
                    const typeLabels = {
                      restock:     'Reposición',
                      consumption: 'Consumo',
                      adjustment:  'Ajuste',
                      transfer:    'Transferencia',
                    };
                    return (
                      <tr key={mov.id}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 text-gray-500 text-xs whitespace-nowrap">
                          {new Date(mov.recorded_at).toLocaleString('es-MX', {
                            day: '2-digit', month: 'short',
                            hour: '2-digit', minute: '2-digit',
                            timeZone: 'America/Chihuahua'
                          })}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium
                            ${typeColors[mov.movement_type] || 'bg-gray-100 text-gray-500'}`}>
                            {typeLabels[mov.movement_type] || mov.movement_type}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-gray-600">
                          {Number(mov.quantity_before).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-600">
                          {Number(mov.quantity_after).toFixed(2)}
                        </td>
                        <td className={`px-4 py-2 text-right font-semibold
                          ${Number(mov.quantity_changed) >= 0 
                            ? 'text-green-600' : 'text-red-600'}`}>
                          {Number(mov.quantity_changed) >= 0 ? '+' : ''}
                          {Number(mov.quantity_changed).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-500 text-xs">
                          {mov.tank_before != null ? Number(mov.tank_before).toFixed(2) : '—'}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-500 text-xs">
                          {mov.tank_after != null ? Number(mov.tank_after).toFixed(2) : '—'}
                        </td>
                        <td className="px-4 py-2 text-gray-500 text-xs">
                          {mov.recorded_by || '—'}
                        </td>
                        <td className="px-4 py-2 text-gray-400 text-xs max-w-xs truncate">
                          {mov.notes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {editModalOpen && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex 
          justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md 
            shadow-lg relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditModalOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>
            <h2 className="text-xl font-semibold mb-4">
              Editar unidad
            </h2>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-gray-700 font-bold mb-1">ID de unidad</label>
                <input
                  type="text"
                  value={editingItem.unit_id}
                  onChange={e => setEditingItem({ ...editingItem, unit_id: e.target.value })}
                  className="border rounded px-3 py-2 w-full font-mono"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Cantidad inicial</label>
                <input
                  type="number"
                  value={editingItem.quantity}
                  onChange={e => setEditingItem({ ...editingItem, quantity: e.target.value })}
                  className="border rounded px-3 py-2 w-full"
                  min="0" step="0.01"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Cantidad restante</label>
                <input
                  type="number"
                  value={editingItem.quantity_remaining}
                  onChange={e => setEditingItem({ ...editingItem, quantity_remaining: e.target.value })}
                  className="border rounded px-3 py-2 w-full"
                  min="0" step="0.01"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Estado</label>
                <select
                  value={editingItem.status}
                  onChange={e => setEditingItem({ ...editingItem, status: e.target.value })}
                  className="border rounded px-3 py-2 w-full"
                >
                  <option value="in_stock">En bodega</option>
                  <option value="open">Abierta</option>
                  <option value="in_machine">En máquina</option>
                  <option value="depleted">Agotada</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Costo</label>
                <input
                  type="number"
                  value={editingItem.cost || ""}
                  onChange={e => setEditingItem({ ...editingItem, cost: e.target.value })}
                  className="border rounded px-3 py-2 w-full"
                  min="0" step="0.01"
                  placeholder="Costo de la unidad"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Proveedor</label>
                <input
                  type="text"
                  value={editingItem.supplier || ""}
                  onChange={e => setEditingItem({ ...editingItem, supplier: e.target.value })}
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Nombre del proveedor"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Notas</label>
                <textarea
                  value={editingItem.notes || ""}
                  onChange={e => setEditingItem({ ...editingItem, notes: e.target.value })}
                  className="border rounded px-3 py-2 w-full h-16 resize-none"
                />
              </div>

              <button
                onClick={handleSaveEdit}
                disabled={editLoading}
                className={`px-4 py-2 rounded text-white
                  ${editLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {editLoading ? "Guardando..." : "Guardar cambios"}
              </button>

              <div className="border-t pt-4">
                {!deleteConfirm ? (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="w-full px-4 py-2 rounded text-red-600 border border-red-300 
                      hover:bg-red-50 text-sm"
                  >
                    Eliminar esta unidad
                  </button>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm text-red-700 font-semibold mb-3">
                      ¿Confirmas eliminar {editingItem.unit_id}? Esta acción no se puede deshacer.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDelete}
                        disabled={editLoading}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded 
                          hover:bg-red-700 text-sm"
                      >
                        Sí, eliminar
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(false)}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded 
                          hover:bg-gray-300 text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR ENTRADA */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex 
          justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md 
            shadow-lg relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X />
            </button>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Plus className="text-blue-600" size={24} />
              Registrar entrada
            </h2>
            <div className="flex flex-col gap-4">

              {activePool === 'Plotter' ? (
                <>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Tipo de material *
                    </label>
                    <select
                      value={selectedPlotterType}
                      onChange={e => {
                        setSelectedPlotterType(e.target.value);
                        setSelectedPlotterWidth("");
                        setSelectedCatalogId(null);
                        setEntryUnitId("");
                      }}
                      className="border rounded px-3 py-2 w-full"
                    >
                      <option value="">Selecciona...</option>
                      {plotterTypes.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  {selectedPlotterType && (
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">
                        Ancho *
                      </label>
                      <select
                        value={selectedPlotterWidth}
                        onChange={async e => {
                          const widthId = e.target.value;
                          setSelectedPlotterWidth(widthId);
                          if (widthId && selectedPlotterType) {
                            const { data: cat } = await supabase
                              .from('plotter_materials_catalog')
                              .select('id')
                              .eq('material_type_id', parseInt(selectedPlotterType))
                              .eq('width_id', parseInt(widthId))
                              .maybeSingle();
                            
                            if (cat) {
                              setSelectedCatalogId(cat.id);
                              const typeName = plotterTypes.find(
                                t => t.id === parseInt(selectedPlotterType)
                              )?.name || 'PLT';
                              const widthLabel = plotterWidths.find(
                                w => w.id === parseInt(widthId)
                              )?.label || '';
                              const today = new Date();
                              const dd = String(today.getDate()).padStart(2, '0');
                              const mm = String(today.getMonth() + 1).padStart(2, '0');
                              const yy = String(today.getFullYear()).slice(2);
                              const dateStr = `${dd}${mm}${yy}`;
                              const prefix = typeName.slice(0,3).toUpperCase();
                              const widthCode = widthLabel.replace('.', '').replace('m', '');
                              const existing = inventory.filter(
                                i => i.plotter_catalog_id === cat.id &&
                                i.unit_id.includes(dateStr)
                              ).length;
                              const next = String(existing + 1).padStart(3, '0');
                              setEntryUnitId(`PLT-${prefix}${widthCode}-${dateStr}-${next}`);
                            } else {
                              alert("Esta combinación no existe en el catálogo. Agrégala primero desde Configurar Insumos.");
                              setSelectedPlotterWidth("");
                            }
                          }
                        }}
                        className="border rounded px-3 py-2 w-full"
                      >
                        <option value="">Selecciona ancho...</option>
                        {plotterWidths.map(w => (
                          <option key={w.id} value={w.id}>{w.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Tipo de insumo *
                  </label>
                  <select
                    value={selectedSupplyType}
                    onChange={e => {
                      setSelectedSupplyType(e.target.value);
                      if (e.target.value) {
                        const type = supplyTypes.find(
                          t => t.id === parseInt(e.target.value)
                        );
                        const pool = type?.machine_compatibility || activePool;
                        setEntryUnitId(generateUnitId(e.target.value, pool));
                        const defaults = { 'Film DTF': '100', 'Film UV': '100' };
                        setEntryQuantity(defaults[type?.name] || '');
                      }
                    }}
                    className="border rounded px-3 py-2 w-full"
                  >
                    <option value="">Selecciona...</option>
                    {supplyTypes
                      .filter(t => t.machine_compatibility === activePool)
                      .map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))
                    }
                  </select>
                </div>
              )}

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  ID de unidad *
                </label>
                <input
                  type="text"
                  value={entryUnitId}
                  onChange={e => setEntryUnitId(e.target.value)}
                  className="border rounded px-3 py-2 w-full font-mono"
                  placeholder="Generado automáticamente"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Puedes modificarlo si el insumo tiene número propio
                </p>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Cantidad ({(() => {
                    if (activePool === 'Plotter') return 'metros';
                    const type = supplyTypes.find(t => t.id === parseInt(selectedSupplyType));
                    return type?.unit || 'unidad';
                  })()}) *
                </label>
                <input
                  type="number"
                  value={entryQuantity}
                  onChange={e => setEntryQuantity(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  min="0"
                  step="0.01"
                  placeholder={(() => {
                    if (activePool === 'Plotter') return 'Metros del rollo';
                    const type = supplyTypes.find(t => t.id === parseInt(selectedSupplyType));
                    const unit = type?.unit || 'unidad';
                    if (unit === 'metros') return 'Metros del rollo';
                    if (unit === 'ml') return 'Mililitros de la botella';
                    if (unit === 'kg') return 'Kilogramos';
                    return 'Cantidad';
                  })()}
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Costo</label>
                <input
                  type="number"
                  value={entryCost}
                  onChange={e => setEntryCost(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  min="0"
                  step="0.01"
                  placeholder="Costo del rollo"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Proveedor</label>
                <input
                  type="text"
                  value={entrySupplier}
                  onChange={e => setEntrySupplier(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Nombre del proveedor"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Notas</label>
                <textarea
                  value={entryNotes}
                  onChange={e => setEntryNotes(e.target.value)}
                  className="border rounded px-3 py-2 w-full h-16 resize-none"
                  placeholder="Observaciones"
                />
              </div>

              <button
                onClick={handleAddEntry}
                disabled={addLoading}
                className={`px-4 py-2 rounded text-white
                  ${addLoading
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {addLoading ? "Guardando..." : "Registrar entrada"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
