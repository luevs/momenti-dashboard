import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Download } from 'lucide-react';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Componente reutilizable para mostrar movimientos de programas de lealtad
 * con filtros por período y estadísticas
 */
export default function LoyaltyMovementsPanel({ 
  formatDate,
  initialPeriod = 'hoy',
  showExport = true,
  className = ''
}) {
  const [periodFilter, setPeriodFilter] = useState(initialPeriod);
  const [movementsData, setMovementsData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Función para obtener movimientos filtrados por período
  const fetchMovementsByPeriod = async (period = 'hoy') => {
    setIsLoading(true);
    
    const now = new Date();
    let startDate = new Date();
    
    switch(period) {
      case 'hoy':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'ayer':
        startDate.setDate(now.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'semana':
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'mes':
        startDate.setMonth(now.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'todo':
        startDate = new Date('2020-01-01');
        break;
    }

    let query = supabase
      .from('order_history')
      .select('*')
      .order('recorded_at', { ascending: false });

    if (period === 'ayer') {
      const endYesterday = new Date(startDate);
      endYesterday.setDate(startDate.getDate() + 1);
      endYesterday.setHours(0, 0, 0, 0);
      query = query
        .gte('recorded_at', startDate.toISOString())
        .lt('recorded_at', endYesterday.toISOString());
    } else if (period !== 'todo') {
      query = query.gte('recorded_at', startDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener movimientos:', error);
      setMovementsData([]);
    } else {
      setMovementsData(data || []);
    }
    
    setIsLoading(false);
  };

  // Calcular estadísticas de movimientos
  const movementsStats = useMemo(() => {
    if (!movementsData || movementsData.length === 0) {
      return {
        totalMovements: 0,
        totalMetersConsumed: 0,
        dtfMetersConsumed: 0,
        uvMetersConsumed: 0,
        uniqueClients: 0
      };
    }

    const uniqueClients = new Set(movementsData.map(m => m.customer_id)).size;
    const totalMetersConsumed = movementsData.reduce((sum, m) => sum + (Number(m.meters_consumed) || 0), 0);
    const dtfMetersConsumed = movementsData
      .filter(m => m.type === 'DTF Textil')
      .reduce((sum, m) => sum + (Number(m.meters_consumed) || 0), 0);
    const uvMetersConsumed = movementsData
      .filter(m => m.type === 'UV DTF')
      .reduce((sum, m) => sum + (Number(m.meters_consumed) || 0), 0);

    return {
      totalMovements: movementsData.length,
      totalMetersConsumed: Math.round(totalMetersConsumed * 100) / 100,
      dtfMetersConsumed: Math.round(dtfMetersConsumed * 100) / 100,
      uvMetersConsumed: Math.round(uvMetersConsumed * 100) / 100,
      uniqueClients
    };
  }, [movementsData]);

  // Exportar movimientos a Excel
  const exportMovementsToExcel = () => {
    if (!movementsData || movementsData.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const exportData = movementsData.map(movement => ({
      'Fecha': formatDate ? formatDate(movement.recorded_at, { useUTC: true }) : movement.recorded_at,
      'Cliente': movement.client_name || '',
      'Tipo': movement.type || '',
      'Folio Programa': movement.program_folio || '',
      'Metros Consumidos': movement.meters_consumed || 0,
      'Metros Restantes': movement.remaining_meters || 0,
      'Registrado Por': movement.recorded_by || '',
      'Observaciones': movement.observaciones || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Movimientos_${periodFilter}`);
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const today = new Date().toISOString().split('T')[0];
    saveAs(blob, `movimientos_lealtad_${periodFilter}_${today}.xlsx`);
  };

  // Cargar movimientos cuando cambia el período
  useEffect(() => {
    fetchMovementsByPeriod(periodFilter);
  }, [periodFilter]);

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6 shadow-lg ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Clock className="text-blue-600" size={24} />
          Movimientos de Lealtad
        </h2>
        
        <div className="flex items-center gap-2">
          {/* Filtros de período */}
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'hoy', label: 'Hoy' },
              { value: 'ayer', label: 'Ayer' },
              { value: 'semana', label: 'Semana' },
              { value: 'mes', label: 'Mes' },
              { value: 'todo', label: 'Todo' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setPeriodFilter(option.value)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                  periodFilter === option.value
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-blue-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Botón exportar */}
          {showExport && (
            <button
              onClick={exportMovementsToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              title="Exportar movimientos a Excel"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          )}
        </div>
      </div>

      {/* Estadísticas del período */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-5">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
              <div className="text-xs text-gray-500 mb-1">Total Movimientos</div>
              <div className="text-2xl font-bold text-blue-600">{movementsStats.totalMovements}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-100">
              <div className="text-xs text-gray-500 mb-1">Metros Totales</div>
              <div className="text-2xl font-bold text-purple-600">{movementsStats.totalMetersConsumed}m</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-cyan-100">
              <div className="text-xs text-gray-500 mb-1">DTF Textil</div>
              <div className="text-2xl font-bold text-cyan-600">{movementsStats.dtfMetersConsumed}m</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-indigo-100">
              <div className="text-xs text-gray-500 mb-1">UV DTF</div>
              <div className="text-2xl font-bold text-indigo-600">{movementsStats.uvMetersConsumed}m</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100">
              <div className="text-xs text-gray-500 mb-1">Clientes únicos</div>
              <div className="text-2xl font-bold text-green-600">{movementsStats.uniqueClients}</div>
            </div>
          </div>

          {/* Lista de movimientos */}
          {movementsData.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-gray-600">No hay movimientos en este período</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha/Hora</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Folio</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Metros</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Registrado por</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {movementsData.map((movement) => (
                      <tr key={movement.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                          {formatDate ? formatDate(movement.recorded_at, { useUTC: true }) : new Date(movement.recorded_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{movement.client_name}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            movement.type === 'DTF Textil' 
                              ? 'bg-cyan-100 text-cyan-800' 
                              : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {movement.type || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{movement.program_folio || '—'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-right text-gray-900">
                          {Number(movement.meters_consumed || 0).toFixed(2)}m
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{movement.recorded_by || 'Sistema'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
