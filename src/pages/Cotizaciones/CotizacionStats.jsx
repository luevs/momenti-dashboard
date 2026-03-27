import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, DollarSign, Users, Package } from 'lucide-react';
import { obtenerEstadisticas, obtenerServiciosMasCotizados, obtenerTopClientes } from '../../services/cotizacionesService';

export default function CotizacionStats() {
  const [stats, setStats] = useState({});
  const [servicios, setServicios] = useState([]);
  const [topClientes, setTopClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [statsData, serviciosData, clientesData] = await Promise.all([
        obtenerEstadisticas(),
        obtenerServiciosMasCotizados(),
        obtenerTopClientes(10)
      ]);
      setStats(statsData);
      setServicios(serviciosData);
      setTopClientes(clientesData);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
      alert('Error al cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Colores para el pie chart
  const COLORS = ['#00B8E6', '#FF0090', '#FFD700', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  // Datos para gráfica de conversión
  const dataConversion = [
    { name: 'Cotizadas', value: stats.cotizadas || 0 },
    { name: 'En Proceso', value: stats.enProceso || 0 },
    { name: 'Cerradas', value: stats.cerradas || 0 },
    { name: 'Perdidas', value: stats.perdidas || 0 }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white p-12 rounded-xl shadow-sm text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          <p className="mt-4 text-slate-600">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <TrendingUp className="text-cyan-500" size={32} />
          Estadísticas de Cotizaciones
        </h1>
        <p className="text-slate-600 mt-1">Análisis y métricas de rendimiento</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Total Cotizaciones</p>
              <p className="text-3xl font-bold">{stats.total || 0}</p>
            </div>
            <Package className="text-blue-200" size={40} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm mb-1">Tasa de Conversión</p>
              <p className="text-3xl font-bold">{stats.tasaConversion?.toFixed(1) || 0}%</p>
            </div>
            <TrendingUp className="text-green-200" size={40} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cyan-100 text-sm mb-1">Valor Total</p>
              <p className="text-3xl font-bold">{formatCurrency(stats.valorTotal || 0)}</p>
            </div>
            <DollarSign className="text-cyan-200" size={40} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm mb-1">Valor Promedio</p>
              <p className="text-3xl font-bold">{formatCurrency(stats.valorPromedio || 0)}</p>
            </div>
            <DollarSign className="text-purple-200" size={40} />
          </div>
        </div>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfica de conversión */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Estado de Cotizaciones</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dataConversion}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {dataConversion.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top servicios */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Servicios Más Cotizados</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={servicios.slice(0, 6)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tipo" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip formatter={(value) => `${value} cotizaciones`} />
              <Bar dataKey="cantidad" fill="#00B8E6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Clientes */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Users className="text-cyan-500" size={24} />
          Top 10 Clientes por Valor
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">#</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Cliente</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Total Cotizaciones</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Cerradas</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Valor Total</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Tasa Cierre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topClientes.map((cliente, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  <td className="py-3 px-4 text-slate-600">{index + 1}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{cliente.nombre}</td>
                  <td className="py-3 px-4 text-center text-slate-600">{cliente.totalCotizaciones}</td>
                  <td className="py-3 px-4 text-center text-green-600 font-semibold">{cliente.cerradas}</td>
                  <td className="py-3 px-4 text-right font-semibold text-cyan-600">
                    {formatCurrency(cliente.valorTotal)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      {cliente.totalCotizaciones > 0 
                        ? ((cliente.cerradas / cliente.totalCotizaciones) * 100).toFixed(0)
                        : 0}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Servicios Detalle */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Package className="text-cyan-500" size={24} />
          Análisis por Tipo de Servicio
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {servicios.map((servicio, index) => (
            <div key={index} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-slate-800">{servicio.tipo?.replace('_', ' ')}</h3>
                <div 
                  className="w-8 h-8 rounded-full" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Cotizaciones:</span>
                  <span className="font-semibold text-slate-800">{servicio.cantidad}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Valor Total:</span>
                  <span className="font-semibold text-cyan-600">
                    {formatCurrency(servicio.valorTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Promedio:</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(servicio.valorTotal / servicio.cantidad)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
