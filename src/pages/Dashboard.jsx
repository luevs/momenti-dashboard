import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient"; // ajusta la ruta si tu cliente está en otro sitio
import { Printer, Calendar } from "lucide-react";
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

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Tendencia por rango</h3>
            <p className="text-xs text-slate-500">Visualiza el MI diario dentro del periodo seleccionado.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-500">
              Desde
              <input
                type="date"
                value={trendRange.start}
                max={trendRange.end || todayISO}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none"
                onChange={handleTrendRangeChange("start")}
              />
            </label>
            <span className="text-slate-400">→</span>
            <label className="flex items-center gap-2 text-xs text-slate-500">
              Hasta
              <input
                type="date"
                value={trendRange.end}
                min={trendRange.start}
                max={todayISO}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none"
                onChange={handleTrendRangeChange("end")}
              />
            </label>
            <div className="flex items-center gap-2 text-xs">
              {trendTechOptions.map((option) => {
                const isActive = trendTech === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setTrendTech(option.id)}
                    className={`rounded-full border px-3 py-1 transition ${
                      isActive
                        ? "border-sky-500 bg-sky-500 text-white shadow"
                        : "border-slate-200 text-slate-600 hover:border-sky-300 hover:text-sky-500"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setTrendPreset(7)}
                className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 hover:border-sky-300 hover:text-sky-500"
              >
                Últimos 7 días
              </button>
              <button
                type="button"
                onClick={() => setTrendPreset(14)}
                className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 hover:border-sky-300 hover:text-sky-500"
              >
                14 días
              </button>
              <button
                type="button"
                onClick={() => setTrendPreset(30)}
                className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 hover:border-sky-300 hover:text-sky-500"
              >
                30 días
              </button>
            </div>
          </div>
        </div>
        <div className="bg-white border rounded-lg p-5 shadow-sm">
          <div className="mb-3 text-xs text-slate-500">
            Rango activo: {trendRange.start} → {trendRange.end}
          </div>
          {isTrendLoading ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-500">
              Cargando datos de tendencia...
            </div>
          ) : hasWeeklyData ? (
            <div className="h-64">
              <Line data={weeklyLineData} options={weeklyLineOptions} />
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center text-sm text-slate-500">
              No hay registros en el rango seleccionado.
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">Indicadores de eficiencia (en preparación)</h3>
        <p className="text-sm text-slate-500">
          Estos slots quedan listos para conectar nuevas fuentes. Las tarjetas muestran "Pendiente" hasta recibir datos.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {futureMetrics.map((metric) => (
            <EfficiencyCard key={metric.id} {...metric} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">Detalle por tecnología</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {technologyTotals.map(({ id, label, totals, accent }) => (
            <div key={id} className={`bg-white border rounded-lg p-5 shadow-sm ${accent}`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-semibold text-slate-900">{label}</h4>
                <span className="text-xs font-medium text-slate-500">Hoy: {formatMetersWithUnit(totals.today)}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs uppercase text-slate-400">Ayer</p>
                  <p className="font-semibold text-slate-800">{formatMetersWithUnit(totals.yesterday)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Semana</p>
                  <p className="font-semibold text-slate-800">{formatMetersWithUnit(totals.week)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Mes</p>
                  <p className="font-semibold text-slate-800">{formatMetersWithUnit(totals.month)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="grid gap-6 lg:grid-cols-3 items-start">
          <div className="bg-white border rounded-lg p-5 shadow-sm lg:col-span-1">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Máquinas sin corte hoy</h2>
                <p className="text-sm text-slate-500">Acciona antes de que impacte el MI del turno.</p>
              </div>
              <button
                onClick={() => navigate("/maquinas")}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition"
              >
                <Calendar size={16} />
                Registrar Corte
              </button>
            </div>

            {machinesMissingToday.length === 0 ? (
              <p className="text-sm text-slate-500">Todas las máquinas registraron corte hoy.</p>
            ) : (
              <ul className="space-y-3">
                {machinesMissingToday.map((m) => (
                  <li key={m.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                    <div className="flex items-center gap-3">
                      <Printer className="text-blue-600" size={20} />
                      <div>
                        <div className="font-medium text-slate-800">{m.name || m.nombre || `Máquina ${m.id}`}</div>
                        <div className="text-xs text-slate-500">Estado: {m.status || "—"}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/maquinas/${m.id}`)}
                      className="text-sm px-3 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                    >
                      Registrar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white border rounded-lg p-5 shadow-sm lg:col-span-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Alertas críticas</h3>
            <AlertsPanel
              pollInterval={60000}
              onReponer={(insumo) => {
                window.location.href = `/insumos/${insumo.id}`;
              }}
              onRegister={(machine) => {
                window.location.href = `/maquinas/${machine.id}`;
              }}
            />
          </div>

          <div className="bg-white border rounded-lg p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-900">Breakdown por turnos</h3>
              <span className="text-xs text-slate-500">Barras apiladas por turno / operador</span>
            </div>
            {shiftBarData ? (
              <div className="h-64">
                <Bar data={shiftBarData} options={shiftBarOptions} />
              </div>
            ) : (
              <div className="h-32 flex flex-col items-center justify-center gap-2 text-sm text-slate-500">
                <span>Sin datos de turnos aún.</span>
                <span>Registra inicio/fin por turno para activar esta visualización.</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
