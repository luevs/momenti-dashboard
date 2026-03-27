import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, Download, Eye, Edit2, Copy, Trash2, TrendingUp, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { obtenerCotizaciones, eliminarCotizacion, duplicarCotizacion, obtenerEstadisticas } from '../../services/cotizacionesService';
import * as XLSX from 'xlsx';

export default function CotizacionesList() {
  const navigate = useNavigate();
  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({});
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    cargarDatos();
  }, [statusFilter]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [cotizacionesData, statsData] = await Promise.all([
        obtenerCotizaciones({ status: statusFilter }),
        obtenerEstadisticas()
      ]);
      setCotizaciones(cotizacionesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error al cargar cotizaciones:', error);
      alert('Error al cargar las cotizaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, folio) => {
    if (!window.confirm(`¿Estás seguro de eliminar la cotización ${folio}?`)) {
      return;
    }

    try {
      await eliminarCotizacion(id);
      alert('Cotización eliminada correctamente');
      cargarDatos();
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('Error al eliminar la cotización');
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const nuevaCotizacion = await duplicarCotizacion(id);
      alert(`Cotización duplicada: ${nuevaCotizacion.folio}`);
      cargarDatos();
    } catch (error) {
      console.error('Error al duplicar:', error);
      alert('Error al duplicar la cotización');
    }
  };

  const handleExportExcel = () => {
    const dataToExport = cotizacionesFiltradas.map(c => ({
      'Folio': c.folio,
      'Fecha': new Date(c.fecha_creacion).toLocaleDateString('es-MX'),
      'Cliente': c.cliente_nombre,
      'Teléfono': c.cliente_telefono || '',
      'Email': c.cliente_email || '',
      'Total': c.total,
      'Status': c.status,
      'Score': c.score,
      'Tipo Cliente': c.tipo_cliente
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cotizaciones');
    XLSX.writeFile(wb, `cotizaciones_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Filtrado
  const cotizacionesFiltradas = cotizaciones.filter(c => {
    const matchSearch = searchTerm === '' || 
      c.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.folio.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = cotizacionesFiltradas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(cotizacionesFiltradas.length / itemsPerPage);

  const getStatusBadge = (status) => {
    const badges = {
      'COTIZADO': 'bg-blue-100 text-blue-700 border-blue-200',
      'EN_PROCESO': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'CERRADO': 'bg-green-100 text-green-700 border-green-200',
      'PERDIDO': 'bg-red-100 text-red-700 border-red-200'
    };
    return badges[status] || badges['COTIZADO'];
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-gray-500';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <FileText className="text-cyan-500" size={32} />
            Cotizaciones
          </h1>
          <p className="text-slate-600 mt-1">Gestión y seguimiento de cotizaciones</p>
        </div>
        <button
          onClick={() => navigate('/cotizaciones/nueva')}
          className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <Plus size={20} />
          Nueva Cotización
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total del Mes</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{stats.total || 0}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <FileText className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Tasa de Conversión</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {stats.tasaConversion ? stats.tasaConversion.toFixed(1) : 0}%
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Valor Promedio</p>
              <p className="text-2xl font-bold text-cyan-600 mt-1">
                {formatCurrency(stats.valorPromedio || 0)}
              </p>
            </div>
            <div className="bg-cyan-100 p-3 rounded-lg">
              <DollarSign className="text-cyan-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Pendientes Seguimiento</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {stats.pendientesSeguimiento || 0}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <Clock className="text-orange-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por cliente o folio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setStatusFilter('COTIZADO')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'COTIZADO'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              Cotizadas
            </button>
            <button
              onClick={() => setStatusFilter('EN_PROCESO')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'EN_PROCESO'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              }`}
            >
              En Proceso
            </button>
            <button
              onClick={() => setStatusFilter('CERRADO')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'CERRADO'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              Cerradas
            </button>
            <button
              onClick={() => setStatusFilter('PERDIDO')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'PERDIDO'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              Perdidas
            </button>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Download size={20} />
            Exportar
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            <p className="mt-4 text-slate-600">Cargando cotizaciones...</p>
          </div>
        ) : currentItems.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto text-slate-300" size={64} />
            <p className="mt-4 text-slate-600">No se encontraron cotizaciones</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Folio</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Fecha</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Cliente</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Total</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Status</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Score</th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-slate-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentItems.map((cotizacion) => (
                    <tr key={cotizacion.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-mono font-semibold text-slate-800">
                          {cotizacion.folio}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        {new Date(cotizacion.fecha_creacion).toLocaleDateString('es-MX')}
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <div className="font-medium text-slate-800">{cotizacion.cliente_nombre}</div>
                          {cotizacion.cliente_telefono && (
                            <div className="text-sm text-slate-500">{cotizacion.cliente_telefono}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-semibold text-slate-800">
                          {formatCurrency(cotizacion.total)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(cotizacion.status)}`}>
                          {cotizacion.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-lg ${getScoreColor(cotizacion.score)}`}>
                            {cotizacion.score}
                          </span>
                          {cotizacion.score >= 90 && <span>⭐</span>}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/cotizaciones/${cotizacion.id}`)}
                            className="p-2 text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                            title="Ver detalle"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => navigate(`/cotizaciones/${cotizacion.id}/editar`)}
                            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDuplicate(cotizacion.id)}
                            className="p-2 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Duplicar"
                          >
                            <Copy size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(cotizacion.id, cotizacion.folio)}
                            className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
                <div className="text-sm text-slate-600">
                  Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, cotizacionesFiltradas.length)} de {cotizacionesFiltradas.length} cotizaciones
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Anterior
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          currentPage === page
                            ? 'bg-cyan-500 text-white'
                            : 'border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
