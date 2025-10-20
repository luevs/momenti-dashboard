import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Phone, Mail, Clock, Plus, History } from 'lucide-react';

const formatDate = (dateString) => {
  if (!dateString) {
    return 'Sin registro';
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'Fecha inválida';
  }

  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const buildTypeSummaries = (programs = {}) => {
  return Object.entries(programs).map(([type, lists]) => {
    const activePrograms = lists?.active || [];
    const historicalPrograms = lists?.historical || [];
    const allPrograms = [...activePrograms, ...historicalPrograms];

    const activeMeters = activePrograms.reduce((sum, program) => sum + (Number(program?.remaining_meters) || 0), 0);
    const totalMeters = allPrograms.reduce((sum, program) => sum + (Number(program?.total_meters) || 0), 0);

    return {
      type,
      activePrograms,
      activeCount: activePrograms.length,
      historicalCount: historicalPrograms.length,
      totalCount: activePrograms.length + historicalPrograms.length,
      activeMeters,
      totalMeters
    };
  });
};

const CustomerLoyaltyTable = ({
  customers,
  onAddProgram,
  onRegisterMeters,
  onOpenHistory,
  onOpenProgramHistory
}) => {
  const [expandedRow, setExpandedRow] = useState(null);

  const tableRows = useMemo(() => {
    return customers.map((customer) => {
      const typeSummaries = buildTypeSummaries(customer.programs);
      const totalActiveMeters = typeSummaries.reduce((sum, summary) => sum + summary.activeMeters, 0);

      return {
        ...customer,
        typeSummaries,
        totalActiveMeters
      };
    });
  }, [customers]);

  const toggleRow = (customerId) => {
    setExpandedRow((current) => (current === customerId ? null : customerId));
  };

  if (!tableRows.length) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-700 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Cliente</th>
              <th className="px-4 py-3 text-left">Contacto</th>
              <th className="px-4 py-3 text-left">Programas</th>
              <th className="px-4 py-3 text-left">Metros activos</th>
              <th className="px-4 py-3 text-left">Último registro</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => {
              const isExpanded = expandedRow === row.id;
              return (
                <React.Fragment key={row.id}>
                  <tr className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{row.razon_social || row.alias || 'Sin nombre'}</div>
                      <div className="text-xs text-gray-500">ID: {row.id}</div>
                    </td>
                    <td className="px-4 py-3 space-y-1 text-sm text-gray-700">
                      {row.celular && (
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-gray-400" />
                          <span>{row.celular}</span>
                        </div>
                      )}
                      {row.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-gray-400" />
                          <span>{row.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-800 font-medium">
                        {row.activePrograms} activos / {row.totalPrograms} totales
                      </div>
                      <button
                        onClick={() => toggleRow(row.id)}
                        className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        Detalle por tipo
                      </button>
                    </td>
                    <td className="px-4 py-3 font-semibold text-blue-600">
                      {row.totalActiveMeters.toFixed(2)}m
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatDate(row.lastMetersRegistry)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => onOpenHistory(row)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                        >
                          <History size={14} />
                          Historial
                        </button>
                        <button
                          onClick={() => onAddProgram(row.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          <Plus size={14} />
                          Programa
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-gray-50 border-b">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          {row.typeSummaries.map((summary) => (
                            <div key={summary.type} className="border border-gray-200 rounded-lg p-4 bg-white">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-semibold text-gray-800">{summary.type}</div>
                                  <div className="text-xs text-gray-500">
                                    {summary.activeCount} activos • {summary.totalCount} total(es)
                                  </div>
                                </div>
                                <div className="text-lg font-bold text-blue-600">
                                  {summary.activeMeters.toFixed(2)}m
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                                <span className="px-2 py-1 bg-blue-50 rounded">
                                  Total: {summary.totalMeters.toFixed(2)}m
                                </span>
                                {summary.historicalCount > 0 && (
                                  <span className="px-2 py-1 bg-gray-100 rounded">
                                    Históricos: {summary.historicalCount}
                                  </span>
                                )}
                              </div>
                              {summary.activeCount > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    onClick={() => onRegisterMeters(row, summary.type, summary.activePrograms)}
                                    className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                  >
                                    Registrar metros
                                  </button>
                                  <button
                                    onClick={() => onOpenProgramHistory(row, summary.activePrograms[0] || null)}
                                    className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                  >
                                    Programas
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                          {row.typeSummaries.length === 0 && (
                            <div className="text-sm text-gray-500">Este cliente no tiene programas registrados.</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerLoyaltyTable;
