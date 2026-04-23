import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient"; // ajusta la ruta si tu cliente está en otro sitio
import { Printer, Calendar, X } from "lucide-react";
import AlertsPanel from "../components/AlertsPanel";
import EfficiencyCard from "../components/EfficiencyCard";
import "chart.js/auto";
import { Line, Bar } from "react-chartjs-2";

function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseLocalDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const [yearStr, monthStr, dayStr] = parts;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if ([year, month, day].some((value) => Number.isNaN(value))) return null;
  return new Date(year, month - 1, day);
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
  const [weeklyTrend, setWeeklyTrend] = useState({ labels: [], values: [] });
  const [monthlyTrend, setMonthlyTrend] = useState({ labels: [], values: [] });
  const [shiftBreakdown, setShiftBreakdown] = useState(null);
  const [isTrendLoading, setIsTrendLoading] = useState(false);
  const [trendRange, setTrendRange] = useState(() => {
    const end = getLocalDateString();
    const start = getLocalDateString(new Date(Date.now() - 6 * 86400000));
    return { start, end };
  });
  const [machineTypes, setMachineTypes] = useState({});
  const [trendRecords, setTrendRecords] = useState([]);
  const [trendTech, setTrendTech] = useState("all");
  const [supplyAlerts, setSupplyAlerts] = useState([]);
  const [alertsDismissed, setAlertsDismissed] = useState(false);
  const [machineStatus, setMachineStatus] = useState([]);
  const [loyaltyInsights, setLoyaltyInsights] = useState(null);

  const aggregateTotalsByDate = (records = [], startDate, endDate) => {
    const totals = new Map();
    (records || []).forEach((record) => {
      const key = record.date;
      if (!key) return;
      const current = totals.get(key) || 0;
      totals.set(key, current + Number(record.meters_printed || 0));
    });
    const sorted = Array.from(totals.entries()).sort((a, b) => {
      const dateA = parseLocalDate(a[0]);
      const dateB = parseLocalDate(b[0]);
      if (dateA && dateB) return dateA.getTime() - dateB.getTime();
      if (dateA) return -1;
      if (dateB) return 1;
      return String(a[0]).localeCompare(String(b[0]));
    });
    if (sorted.length === 0 && !startDate && !endDate) {
      return { labels: [], values: [] };
    }

    let rangeStart = startDate ? parseLocalDate(startDate) : sorted.length ? parseLocalDate(sorted[0][0]) : null;
    let rangeEnd = endDate ? parseLocalDate(endDate) : sorted.length ? parseLocalDate(sorted[sorted.length - 1][0]) : rangeStart;

    if (!rangeStart || Number.isNaN(rangeStart.valueOf())) {
      rangeStart = rangeEnd;
    }
    if (!rangeEnd || Number.isNaN(rangeEnd.valueOf())) {
      rangeEnd = rangeStart;
    }
    if (!rangeStart || !rangeEnd || rangeStart > rangeEnd) {
      return {
        labels: sorted.map(([label]) => label),
        values: sorted.map(([, total]) => Number(total.toFixed(2))),
      };
    }

    const labels = [];
    const values = [];
    const totalsFixed = new Map(Array.from(totals.entries()).map(([k, v]) => [k, Number(v.toFixed(2))]));
    const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
    const endCursor = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate());

    while (cursor <= endCursor) {
      const key = getLocalDateString(cursor);
      labels.push(key);
      values.push(totalsFixed.get(key) || 0);
      cursor.setDate(cursor.getDate() + 1);
    }

    return { labels, values };
  };

  const filterRecordsByTech = (records = [], technology = "all", typeMap = {}) => {
    if (technology === "all") return records;
    return (records || []).filter((record) => {
      const typeLabel = typeMap[record.machine_id];
      if (!typeLabel) return false;
      return typeLabel === technology;
    });
  };

  const formatMetersValue = (value) =>
    Number(value ?? 0).toLocaleString("es-MX", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });

  const formatMetersWithUnit = (value) => `${formatMetersValue(value)} m`;

  const getDeltaStatus = (delta) => {
    if (delta === null) return "pending";
    if (delta >= 5) return "ok";
    if (delta <= -5) return "critical";
    return "warn";
  };

  const deltaPalette = {
    ok: "text-emerald-300",
    warn: "text-amber-300",
    critical: "text-rose-300",
    pending: "text-slate-300",
  };

  const fetchSupplyAlerts = async () => {
    const { data, error } = await supabase
      .from('machine_supplies')
      .select(`
        id, current_stock, minimum_level, critical_level, machine_id,
        supply_types (name, unit),
        machines (name)
      `);
    if (error || !data) return;
    const alerts = data
      .filter(s => Number(s.current_stock) <= Number(s.minimum_level))
      .map(s => ({
        id: s.id,
        machineName: s.machines?.name || '',
        supplyName: s.supply_types?.name || '',
        currentStock: Number(s.current_stock),
        unit: s.supply_types?.unit || '',
        level: Number(s.current_stock) <= Number(s.critical_level) ? 'critical' : 'low'
      }));
    setSupplyAlerts(alerts);
  };

  const fetchMachineStatus = async () => {
    const todayStr = getLocalDateString();
    
    const { data: machines } = await supabase
      .from('machines')
      .select('id, name')
      .order('name');

    const { data: todayJobs } = await supabase
      .from('machine_daily_prints')
      .select('machine_id, meters_printed, folio, created_at')
      .eq('date', todayStr)
      .order('created_at', { ascending: false });

    const { data: activeRolls } = await supabase
      .from('inventory')
      .select('machine_id, unit_id, quantity_remaining, supply_type_id')
      .eq('status', 'in_machine')
      .in('supply_type_id', [7, 15]);

    const rollsByMachine = {};
    (activeRolls || []).forEach(r => { rollsByMachine[r.machine_id] = r; });

    const jobsByMachine = {};
    (todayJobs || []).forEach(job => {
      if (!jobsByMachine[job.machine_id]) {
        jobsByMachine[job.machine_id] = { total: 0, lastFolio: null };
      }
      jobsByMachine[job.machine_id].total += Number(job.meters_printed || 0);
      if (!jobsByMachine[job.machine_id].lastFolio && job.folio) {
        jobsByMachine[job.machine_id].lastFolio = job.folio;
      }
    });

    const status = (machines || []).map(m => ({
      id: m.id,
      name: m.name,
      metersToday: jobsByMachine[m.id]?.total || 0,
      lastFolio: jobsByMachine[m.id]?.lastFolio || null,
      registeredToday: !!jobsByMachine[m.id],
      activeRoll: rollsByMachine[m.id] || null
    }));

    setMachineStatus(status);
  };

  const fetchLoyaltyInsights = async () => {
    const startOfMonth = getLocalDateString(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    );

    const { data: programs } = await supabase
      .from('loyalty_programs')
      .select('remaining_meters, total_meters, status, type')
      .eq('status', 'activo');

    const { data: orders } = await supabase
      .from('order_history')
      .select('meters_consumed, type, client_name, customer_id')
      .gte('recorded_at', startOfMonth);

    if (!programs) return;

    const activeClients = new Set();
    let dtfAvailable = 0;
    let uvAvailable = 0;

    programs.forEach(p => {
      if (Number(p.remaining_meters) > 0) {
        if (p.type === 'DTF Textil') dtfAvailable += Number(p.remaining_meters);
        if (p.type === 'UV DTF') uvAvailable += Number(p.remaining_meters);
      }
    });

    let monthlyConsumed = 0;
    const clientConsumed = {};

    (orders || []).forEach(o => {
      const consumed = Number(o.meters_consumed || 0);
      monthlyConsumed += consumed;
      const key = o.client_name || o.customer_id;
      if (!clientConsumed[key]) clientConsumed[key] = 0;
      clientConsumed[key] += consumed;
    });

    const topClients = Object.entries(clientConsumed)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, meters]) => ({ name, meters }));

    setLoyaltyInsights({
      activePrograms: programs.filter(p => Number(p.remaining_meters) > 0).length,
      dtfAvailable: Math.round(dtfAvailable),
      uvAvailable: Math.round(uvAvailable),
      monthlyConsumed: Math.round(monthlyConsumed),
      topClients
    });
  };

  useEffect(() => {
    fetchAll();
    // optionally add interval or realtime subscription
  }, []);

  useEffect(() => {
    fetchTrendData(trendRange.start, trendRange.end);
  }, [trendRange.start, trendRange.end]);

  useEffect(() => {
    if (trendTech !== "all" && Object.keys(machineTypes).length === 0) {
      return;
    }
    const filtered = filterRecordsByTech(trendRecords, trendTech, machineTypes);
    setWeeklyTrend(aggregateTotalsByDate(filtered, trendRange.start, trendRange.end));
  }, [trendRecords, trendTech, machineTypes, trendRange.start, trendRange.end]);

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
        .select("date, machine_id, meters_printed")
        .eq("date", todayStr);
      if (todayError) throw todayError;

      // fetch yesterday
      const { data: yesterdayData, error: yesterdayError } = await supabase
        .from("machine_daily_prints")
        .select("date, machine_id, meters_printed")
        .eq("date", yesterdayStr);
      if (yesterdayError) throw yesterdayError;

      // fetch week range
      const { data: weekData, error: weekError } = await supabase
        .from("machine_daily_prints")
        .select("date, machine_id, meters_printed")
        .gte("date", startOfWeekStr)
        .lte("date", todayStr);
      if (weekError) throw weekError;

      // fetch month range
      const { data: monthData, error: monthError } = await supabase
        .from("machine_daily_prints")
        .select("date, machine_id, meters_printed")
        .gte("date", startOfMonthStr)
        .lte("date", todayStr);
      if (monthError) throw monthError;

      const sumMeters = (arr) =>
        (arr || []).reduce((s, r) => s + Number(r.meters_printed || 0), 0);

      setTodayTotal(sumMeters(todayData));
      setYesterdayTotal(sumMeters(yesterdayData));
      setWeekTotal(sumMeters(weekData));
      setMonthTotal(sumMeters(monthData));

      const monthlyAggregated = aggregateTotalsByDate(monthData);
      const trimmedMonthly = {
        labels: monthlyAggregated.labels.slice(-10),
        values: monthlyAggregated.values.slice(-10),
      };
      setMonthlyTrend(trimmedMonthly);

      setShiftBreakdown(null);

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
      setMachineTypes(typeForMachine);

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

      await fetchMachineStatus();
      await fetchSupplyAlerts();
      await fetchLoyaltyInsights();
    } catch (err) {
      console.error("Dashboard fetch error", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrendData = async (startDate, endDate) => {
    if (!startDate || !endDate) return;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || start > end) {
      return;
    }

    setIsTrendLoading(true);
    try {
      const { data, error } = await supabase
        .from("machine_daily_prints")
        .select("date, machine_id, meters_printed")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;

      setTrendRecords(data || []);
    } catch (err) {
      console.error("Trend fetch error", err);
      setTrendRecords([]);
    } finally {
      setIsTrendLoading(false);
    }
  };

  const handleTrendRangeChange = (key) => (event) => {
    const value = event.target.value;
    if (!value) return;
    setTrendRange((prev) => {
      const next = { ...prev, [key]: value };
      if (next.start && next.end) {
        const start = new Date(next.start);
        const end = new Date(next.end);
        if (start > end) {
          if (key === "start") {
            next.end = value;
          } else {
            next.start = value;
          }
        }
      }
      return next;
    });
  };

  const setTrendPreset = (days) => {
    const endDate = getLocalDateString();
    const startDate = getLocalDateString(new Date(Date.now() - (days - 1) * 86400000));
    setTrendRange({ start: startDate, end: endDate });
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">Cargando datos del dashboard...</div>;
  }

  const todayDelta =
    yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 : null;
  const productionStatus = getDeltaStatus(todayDelta);
  const deltaLabel =
    todayDelta !== null ? `${todayDelta >= 0 ? "+" : ""}${todayDelta.toFixed(1)}%` : "Sin referencia";
  const deltaColor = deltaPalette[productionStatus] || deltaPalette.pending;

  const totalMachines = machines.length;
  const machinesWithCut = totalMachines - machinesMissingToday.length;
  const availabilityRate =
    totalMachines > 0 ? (machinesWithCut / totalMachines) * 100 : null;
  const availabilityStatus = (() => {
    if (availabilityRate === null) return "pending";
    if (availabilityRate >= 90) return "ok";
    if (availabilityRate >= 75) return "warn";
    return "critical";
  })();

  const futureMetrics = [
    {
      id: "availability",
      title: "Disponibilidad operativa",
      value: availabilityRate !== null ? availabilityRate.toFixed(0) : undefined,
      unit: availabilityRate !== null ? "%" : undefined,
      trendLabel: "Máquinas con corte",
      trendValue:
        availabilityRate !== null ? `${machinesWithCut}/${totalMachines}` : "Datos pendientes",
      status: availabilityStatus,
      helper: "Calculado a partir de cortes registrados hoy vs. parque activo.",
    },
    {
      id: "cycle-time",
      title: "Tiempo promedio por tarea",
      status: "pending",
      helper: "Requerirá capturar inicio y fin por trabajo en machine_job_queue.",
    },
    {
      id: "rejection-rate",
      title: "Tasa de rechazo",
      status: "pending",
      helper: "Integra registros de reimpresión o desperdicio para mostrar semáforo.",
    },
  ];

  const technologyTotals = [
    {
      id: "dtf-textil",
      label: "DTF Textil",
      totals: dtfTextilTotals,
      accent: "border-l-4 border-blue-400",
    },
    {
      id: "uv-dtf",
      label: "UV DTF",
      totals: uvDtfTotals,
      accent: "border-l-4 border-purple-400",
    },
  ];

  const todayPrettyDate = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const todayISO = getLocalDateString();

  const formatChartDate = (dateStr) => {
    const parsed = parseLocalDate(dateStr);
    if (!parsed) return dateStr;
    return parsed.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
    });
  };

  const weeklyLineData = {
    labels: weeklyTrend.labels.map(formatChartDate),
    datasets: [
      {
        label: "Metros impresos",
        data: weeklyTrend.values,
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56, 189, 248, 0.15)",
        tension: 0.35,
        fill: true,
        pointRadius: 3,
      },
    ],
  };

  const weeklyLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#64748b" },
      },
      y: {
        grid: { color: "rgba(148, 163, 184, 0.2)" },
        ticks: { color: "#475569" },
      },
    },
  };

  const monthlySparklineData = {
    labels: monthlyTrend.labels.map(formatChartDate),
    datasets: [
      {
        data: monthlyTrend.values,
        borderColor: "#22c55e",
        backgroundColor: "rgba(34, 197, 94, 0.15)",
        tension: 0.35,
        fill: true,
        pointRadius: 0,
      },
    ],
  };

  const monthlySparklineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: {
      x: { display: false },
      y: { display: false },
    },
  };

  const hasWeeklyData = weeklyTrend.labels.length > 0;
  const hasMonthlyData = monthlyTrend.labels.length > 1;

  const shiftBarData = shiftBreakdown
    ? {
        labels: shiftBreakdown.labels,
        datasets: shiftBreakdown.datasets,
      }
    : null;

  const shiftBarOptions = {
    responsive: true,
    plugins: { legend: { position: "bottom" } },
    scales: {
      x: { stacked: true },
      y: { stacked: true },
    },
  };

  const trendTechOptions = [
    { id: "all", label: "Todo el parque" },
    { id: "DTF Textil", label: "DTF Textil" },
    { id: "UV DTF", label: "UV DTF" },
  ];

  return (
    <div className="p-6 space-y-8">
      {!alertsDismissed && supplyAlerts.length > 0 && (
        <div className={`mb-6 rounded-xl border px-4 py-3 flex items-start justify-between gap-4
          ${supplyAlerts.some(a => a.level === 'critical') 
            ? 'bg-rose-50 border-rose-200' 
            : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800 mb-1">
              {supplyAlerts.filter(a => a.level === 'critical').length > 0
                ? `⚠ ${supplyAlerts.filter(a => a.level === 'critical').length} insumo(s) en nivel crítico`
                : `↓ ${supplyAlerts.length} insumo(s) por debajo del mínimo`}
            </p>
            <div className="flex flex-wrap gap-2">
              {supplyAlerts.map(alert => (
                <span key={alert.id} className={`text-xs px-2 py-1 rounded-full font-medium
                  ${alert.level === 'critical' 
                    ? 'bg-rose-100 text-rose-700' 
                    : 'bg-amber-100 text-amber-700'}`}>
                  {alert.supplyName} — {alert.machineName}: {alert.currentStock}{alert.unit}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => setAlertsDismissed(true)}
            className="text-slate-400 hover:text-slate-600 shrink-0 mt-0.5"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Metraje impreso</h1>
            <p className="text-sm text-slate-500">Seguimiento diario del MI acumulado por todas las tecnologías.</p>
          </div>
          <div className="text-xs text-slate-400">
            {todayPrettyDate} · Actualizado {new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 rounded-xl bg-slate-900 text-white p-6 shadow-lg flex flex-col gap-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Total de hoy</p>
                <p className="text-4xl font-semibold">
                  {formatMetersValue(todayTotal)}
                  <span className="ml-1 text-lg font-normal text-slate-300">m</span>
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${deltaColor}`}>{deltaLabel}</p>
                <p className="text-xs text-slate-400">Comparado con ayer</p>
              </div>
            </div>
            {hasMonthlyData ? (
              <div className="h-24">
                <Line data={monthlySparklineData} options={monthlySparklineOptions} />
              </div>
            ) : (
              <div className="h-24 flex items-center text-sm text-slate-400">
                Añade más días de captura para visualizar la tendencia mensual.
              </div>
            )}
            <div className="grid grid-cols-3 gap-3 text-xs sm:text-sm text-slate-200">
              <div>
                <p className="uppercase tracking-wide text-slate-400">Ayer</p>
                <p className="font-semibold text-white">{formatMetersWithUnit(yesterdayTotal)}</p>
              </div>
              <div>
                <p className="uppercase tracking-wide text-slate-400">Semana</p>
                <p className="font-semibold text-white">{formatMetersWithUnit(weekTotal)}</p>
              </div>
              <div>
                <p className="uppercase tracking-wide text-slate-400">Mes</p>
                <p className="font-semibold text-white">{formatMetersWithUnit(monthTotal)}</p>
              </div>
            </div>
          </div>

          <EfficiencyCard
            title="Productividad diaria"
            value={formatMetersValue(todayTotal)}
            unit="m"
            trendLabel="Rendimiento vs. ayer"
            trendValue={deltaLabel}
            status={productionStatus}
            helper="Usa el delta como semáforo rápido mientras definimos objetivos oficiales."
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">Estado de máquinas hoy</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {machineStatus.map(m => (
            <div
              key={m.id}
              onClick={() => navigate(`/maquinas/${m.id}`)}
              className="bg-white border rounded-xl p-4 shadow-sm cursor-pointer 
                hover:shadow-md transition hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Printer size={16} className="text-blue-600" />
                  <span className="text-sm font-semibold text-slate-800 truncate">
                    {m.name}
                  </span>
                </div>
                <span className={`w-2.5 h-2.5 rounded-full shrink-0
                  ${m.registeredToday ? 'bg-emerald-500' : 'bg-rose-400'}`}
                />
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {m.metersToday.toFixed(2)}
                <span className="text-sm font-normal text-slate-500 ml-1">m hoy</span>
              </div>
              {m.activeRoll && (
                <div className="text-xs text-slate-500 truncate">
                  Rollo: <span className="font-mono text-blue-600">{m.activeRoll.unit_id}</span>
                  <span className="ml-1">({m.activeRoll.quantity_remaining}m)</span>
                </div>
              )}
              {m.lastFolio && (
                <div className="text-xs text-slate-400 mt-0.5">
                  Último: <span className="font-mono">{m.lastFolio}</span>
                </div>
              )}
              {!m.registeredToday && (
                <div className="text-xs text-rose-500 mt-1 font-medium">
                  Sin registro hoy
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {loyaltyInsights && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Programas de Lealtad</h3>
            <button
              onClick={() => navigate('/clientes-lealtad')}
              className="text-xs text-sky-600 hover:underline"
            >
              Ver todos →
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm">
              <p className="text-xs uppercase text-slate-400 tracking-wide mb-1">
                Programas activos
              </p>
              <p className="text-3xl font-bold text-slate-900">
                {loyaltyInsights.activePrograms}
              </p>
            </div>
            <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm">
              <p className="text-xs uppercase text-slate-400 tracking-wide mb-1">
                DTF disponible
              </p>
              <p className="text-3xl font-bold text-blue-600">
                {loyaltyInsights.dtfAvailable}
                <span className="text-sm font-normal text-slate-400 ml-1">m</span>
              </p>
            </div>
            <div className="bg-white border border-purple-100 rounded-xl p-4 shadow-sm">
              <p className="text-xs uppercase text-slate-400 tracking-wide mb-1">
                UV disponible
              </p>
              <p className="text-3xl font-bold text-purple-600">
                {loyaltyInsights.uvAvailable}
                <span className="text-sm font-normal text-slate-400 ml-1">m</span>
              </p>
            </div>
            <div className="bg-white border border-amber-100 rounded-xl p-4 shadow-sm">
              <p className="text-xs uppercase text-slate-400 tracking-wide mb-1">
                Consumido este mes
              </p>
              <p className="text-3xl font-bold text-amber-600">
                {loyaltyInsights.monthlyConsumed}
                <span className="text-sm font-normal text-slate-400 ml-1">m</span>
              </p>
            </div>
          </div>
          {loyaltyInsights.topClients.length > 0 && (
            <div className="bg-white border rounded-xl p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-700 mb-3">
                Top clientes este mes
              </p>
              <div className="space-y-2">
                {loyaltyInsights.topClients.map((client, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 w-4">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-slate-700 truncate max-w-[200px]">
                        {client.name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                      {client.meters.toFixed(1)}m
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
