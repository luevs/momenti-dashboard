import React from "react";

const statusStyles = {
  ok: {
    container: "bg-emerald-50 border-emerald-200",
    indicator: "text-emerald-600",
    label: "Óptimo",
  },
  warn: {
    container: "bg-amber-50 border-amber-200",
    indicator: "text-amber-600",
    label: "Atención",
  },
  critical: {
    container: "bg-rose-50 border-rose-200",
    indicator: "text-rose-600",
    label: "Crítico",
  },
  pending: {
    container: "bg-slate-50 border-slate-200",
    indicator: "text-slate-500",
    label: "Pendiente",
  },
};

export default function EfficiencyCard({
  title,
  value,
  unit,
  trendLabel,
  trendValue,
  status = "pending",
  helper,
}) {
  const palette = statusStyles[status] || statusStyles.pending;
  const showTrend = trendLabel && trendValue !== undefined;
  const showUnit = value !== undefined && value !== null && unit;

  return (
    <div
      className={`border rounded-lg p-4 flex flex-col gap-3 shadow-sm ${palette.container}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-medium text-slate-700">{title}</h4>
        <span className={`text-xs font-semibold uppercase tracking-wide ${palette.indicator}`}>
          {palette.label}
        </span>
      </div>
      <div className="text-2xl font-semibold text-slate-900">
        {value !== undefined && value !== null ? (
          <>
            {value}
            {showUnit ? (
              <span className="ml-1 text-base font-normal text-slate-500">{unit}</span>
            ) : null}
          </>
        ) : (
          "—"
        )}
      </div>
      {showTrend ? (
        <div className="text-xs text-slate-500">
          {trendLabel}: <span className="font-medium text-slate-700">{trendValue}</span>
        </div>
      ) : null}
      {helper ? (
        <p className="text-xs text-slate-500 leading-snug">{helper}</p>
      ) : null}
    </div>
  );
}
