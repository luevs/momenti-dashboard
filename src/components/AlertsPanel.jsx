import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Printer, Box, RefreshCcw, AlertCircle } from "lucide-react";

function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function AlertsPanel({ onReponer, onRegister, pollInterval = 0 }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [insumosCriticos, setInsumosCriticos] = useState([]);
  const [machinesMissingToday, setMachinesMissingToday] = useState([]);
  const [error, setError] = useState(null);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const today = getLocalDateString();

      // 1) insumos críticos
      const { data: insumos, error: insError } = await supabase
        .from("machine_supplies")
        .select(`
          id,
          current_stock,
          minimum_stock,
          supply_types (
            name,
            unit
          )
        `)
        .lte("current_stock", "minimum_stock");
      if (insError) throw insError;
      
      // Map the results to match expected structure
      const mappedInsumos = (insumos || []).map(item => ({
        id: item.id,
        nombre: item.supply_types?.name || 'Sin nombre',
        stock_actual: item.current_stock,
        minimo: item.minimum_stock,
        unidad: item.supply_types?.unit || ''
      }));
      setInsumosCriticos(mappedInsumos);

      // 2) máquinas sin corte hoy
      const { data: todayRecords, error: recError } = await supabase
        .from("machine_daily_prints")
        .select("machine_id")
        .eq("date", today);
      if (recError) throw recError;
      const presentIds = new Set((todayRecords || []).map(r => String(r.machine_id)));

      const { data: machines, error: machinesError } = await supabase
        .from("machines")
        .select("id, nombre, status");
      if (machinesError) throw machinesError;

      const missing = (machines || []).filter(m => !presentIds.has(String(m.id)));
      setMachinesMissingToday(missing || []);
    } catch (err) {
      console.error("AlertsPanel fetch error", err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    if (pollInterval && pollInterval > 0) {
      const t = setInterval(fetchAlerts, pollInterval);
      return () => clearInterval(t);
    }
  }, []);

  const handleReponer = (insumo) => {
    if (onReponer) return onReponer(insumo);
    // default: navigate to insumo detail (if exists)
    navigate(`/insumos/${insumo.id}`);
  };

  const handleRegister = (machine) => {
    if (onRegister) return onRegister(machine);
    navigate(`/maquinas/${machine.id}`);
  };

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AlertCircle size={18} /> Alertas
        </h3>
        <div className="flex items-center gap-2">
          <button
            className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2"
            onClick={fetchAlerts}
            aria-label="Refrescar alertas"
          >
            <RefreshCcw size={16} /> Refrescar
          </button>
        </div>
      </div>

      {loading && <div className="text-sm text-gray-500">Cargando alertas...</div>}
      {error && <div className="text-sm text-red-600">Error: {error}</div>}

      {/* Insumos críticos */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-2">Insumos críticos</div>
        {insumosCriticos.length === 0 ? (
          <div className="text-sm text-gray-500">No hay insumos en estado crítico.</div>
        ) : (
          <ul className="space-y-2">
            {insumosCriticos.map(i => (
              <li key={i.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <div>
                  <div className="text-sm font-medium">{i.nombre}</div>
                  <div className="text-xs text-gray-500">
                    {i.stock_actual} {i.unidad || ''} — mínimo {i.minimo}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-2 py-1 text-sm bg-green-50 text-green-700 rounded"
                    onClick={() => handleReponer(i)}
                  >
                    Reponer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Máquinas sin corte hoy */}
      <div>
        <div className="text-sm font-medium text-gray-700 mb-2">Máquinas sin corte hoy</div>
        {machinesMissingToday.length === 0 ? (
          <div className="text-sm text-gray-500">Todas las máquinas registraron hoy.</div>
        ) : (
          <ul className="space-y-2">
            {machinesMissingToday.map(m => (
              <li key={m.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <div className="flex items-center gap-3">
                  <Printer className="text-blue-600" size={18} />
                  <div>
                    <div className="text-sm font-medium">{m.nombre || `Máquina ${m.id}`}</div>
                    <div className="text-xs text-gray-500">Estado: {m.status || "—"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-2 py-1 text-sm bg-blue-600 text-white rounded"
                    onClick={() => handleRegister(m)}
                  >
                    Registrar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}