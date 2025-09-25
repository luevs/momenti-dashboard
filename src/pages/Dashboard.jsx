import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient"; // ajusta la ruta si tu cliente está en otro sitio
import { Printer, Calendar } from 'lucide-react';
import AlertsPanel from "../components/AlertsPanel";

function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  const [machines, setMachines] = useState([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [yesterdayTotal, setYesterdayTotal] = useState(0);
  const [weekTotal, setWeekTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [machinesMissingToday, setMachinesMissingToday] = useState([]);
  const [dtfTextilTotals, setDtfTextilTotals] = useState({ today: 0, yesterday: 0, week: 0, month: 0 });
  const [uvDtfTotals, setUvDtfTotals] = useState({ today: 0, yesterday: 0, week: 0, month: 0 });

  useEffect(() => {
    fetchAll();
    // optionally add interval or realtime subscription
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const todayStr = getLocalDateString();
      const yesterdayStr = getLocalDateString(new Date(Date.now() - 86400000));
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const startOfWeekStr = getLocalDateString(startOfWeek);
      const startOfMonthStr = getLocalDateString(startOfMonth);

      // fetch machines
      const { data: machinesData, error: machinesError } = await supabase
        .from("machines")
        .select("id, name, status");
      if (machinesError) throw machinesError;
      setMachines(machinesData || []);

      // fetch today's records
      const { data: todayData, error: todayError } = await supabase
        .from("machine_daily_prints")
        .select("machine_id, meters_printed")
        .eq("date", todayStr);
      if (todayError) throw todayError;

      // fetch yesterday
      const { data: yesterdayData, error: yesterdayError } = await supabase
        .from("machine_daily_prints")
        .select("meters_printed")
        .eq("date", yesterdayStr);
      if (yesterdayError) throw yesterdayError;

      // fetch week range
      const { data: weekData, error: weekError } = await supabase
        .from("machine_daily_prints")
        .select("meters_printed")
        .gte("date", startOfWeekStr)
        .lte("date", todayStr);
      if (weekError) throw weekError;

      // fetch month range
      const { data: monthData, error: monthError } = await supabase
        .from("machine_daily_prints")
        .select("meters_printed")
        .gte("date", startOfMonthStr)
        .lte("date", todayStr);
      if (monthError) throw monthError;

      const sumMeters = (arr) =>
        (arr || []).reduce((s, r) => s + Number(r.meters_printed || 0), 0);

      setTodayTotal(sumMeters(todayData));
      setYesterdayTotal(sumMeters(yesterdayData));
      setWeekTotal(sumMeters(weekData));
      setMonthTotal(sumMeters(monthData));

      // determine machines missing today's record
      const presentMachineIds = new Set((todayData || []).map(r => String(r.machine_id)));
      const missing = (machinesData || []).filter(m => !presentMachineIds.has(String(m.id)));
      setMachinesMissingToday(missing);

      // agrega esto para calcular totales por tipo
      const typeForMachine = {};
      (machinesData || []).forEach(m => {
        const t = m.product_type || m.type || (m.name && /uv/i.test(m.name) ? 'UV DTF' : 'DTF Textil');
        typeForMachine[m.id] = t;
      });

      const sumByType = (records = [], targetType) =>
        (records || [])
          .filter(r => (typeForMachine[r.machine_id] || 'Unknown') === targetType)
          .reduce((s, r) => s + Number(r.meters_printed || 0), 0);

      setDtfTextilTotals({
        today: sumByType(todayData, 'DTF Textil'),
        yesterday: sumByType(yesterdayData, 'DTF Textil'),
        week: sumByType(weekData, 'DTF Textil'),
        month: sumByType(monthData, 'DTF Textil'),
      });

      setUvDtfTotals({
        today: sumByType(todayData, 'UV DTF'),
        yesterday: sumByType(yesterdayData, 'UV DTF'),
        week: sumByType(weekData, 'UV DTF'),
        month: sumByType(monthData, 'UV DTF'),
      });
    } catch (err) {
      console.error("Dashboard fetch error", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">Cargando datos del dashboard...</div>;
  }

  return (
    <div className="p-6">
      {/* Producción DTF Textil */}
      <h3 className="text-lg font-semibold mb-3">Producción — DTF Textil</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-600">{dtfTextilTotals.today.toFixed(2)} m</p>
          <p className="text-sm text-gray-600">Metros Hoy (DTF Textil)</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-yellow-600">{dtfTextilTotals.yesterday.toFixed(2)} m</p>
          <p className="text-sm text-gray-600">Metros Ayer (DTF Textil)</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-600">{dtfTextilTotals.week.toFixed(2)} m</p>
          <p className="text-sm text-gray-600">Semana Actual (DTF Textil)</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-purple-600">{dtfTextilTotals.month.toFixed(2)} m</p>
          <p className="text-sm text-gray-600">Mes Actual (DTF Textil)</p>
        </div>
      </div>

      {/* Producción UV DTF */}
      <h3 className="text-lg font-semibold mb-3">Producción — UV DTF</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-600">{uvDtfTotals.today.toFixed(2)} m</p>
          <p className="text-sm text-gray-600">Metros Hoy (UV DTF)</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-yellow-600">{uvDtfTotals.yesterday.toFixed(2)} m</p>
          <p className="text-sm text-gray-600">Metros Ayer (UV DTF)</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-600">{uvDtfTotals.week.toFixed(2)} m</p>
          <p className="text-sm text-gray-600">Semana Actual (UV DTF)</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-purple-600">{uvDtfTotals.month.toFixed(2)} m</p>
          <p className="text-sm text-gray-600">Mes Actual (UV DTF)</p>
        </div>
      </div>

      {/* Máquinas sin corte hoy */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Máquinas sin corte hoy</h2>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/maquinas")}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
          >
            <Calendar size={16} />
            Registrar Corte
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4">
        {machinesMissingToday.length === 0 ? (
          <p className="text-sm text-gray-500">Todas las máquinas tienen corte hoy.</p>
        ) : (
          <ul className="space-y-3">
            {machinesMissingToday.map((m) => (
              <li key={m.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Printer className="text-blue-600" size={20} />
                  <div>
                    <div className="font-medium">{m.name || m.nombre || `Máquina ${m.id}`}</div>
                    <div className="text-xs text-gray-500">Estado: {m.status || "—"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/maquinas/${m.id}`)}
                    className="text-sm px-3 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                  >
                    Registrar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div> {/* cierra el contenedor de máquinas missing */}

      {/* Alerts panel alineado a la izquierda */}
      <div className="mt-6 w-full max-w-md">
        <AlertsPanel
          pollInterval={60000}
          onReponer={(insumo) => { window.location.href = `/insumos/${insumo.id}`; }}
          onRegister={(machine) => { window.location.href = `/maquinas/${machine.id}`; }}
        />
      </div>
    </div>
  );
}
