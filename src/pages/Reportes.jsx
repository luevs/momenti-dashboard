import React, { useState, useMemo, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import { 
  Calendar, TrendingUp, DollarSign, ShoppingCart, Users, 
  CreditCard, Award, RefreshCw, Download, Filter
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { VentasService } from '../services/ventasService';

// Datos de ejemplo basados en tu negocio de imprenta
const generateSampleData = () => {
  const data = [];
  const today = new Date();
  
  // Generar datos de los últimos 30 días
  for (let i = 29; i >= 0; i--) {
    const date = subDays(today, i);
    const dayOfWeek = date.getDay();
    
    // Simular patrones reales: menos ventas en domingo, más en viernes/sábado
    let baseAmount = dayOfWeek === 0 ? 2000 : dayOfWeek >= 5 ? 8000 : 5000;
    baseAmount += Math.random() * 3000;
    
    const orders = Math.floor(baseAmount / 150) + Math.floor(Math.random() * 10);
    
    data.push({
      fecha: format(date, 'MM/dd'),
      fechaCompleta: format(date, 'yyyy-MM-dd'),
      ventas: Math.round(baseAmount),
      ordenes: orders,
      clientes: Math.floor(orders * 0.8) + Math.floor(Math.random() * 5)
    });
  }
  return data;
};

// Top clientes de ejemplo
const topClientes = [
  { nombre: 'DANIELA BUSTILLOS', ventas: 45780, ordenes: 12, tipo: 'Premium' },
  { nombre: 'JUAN PÉREZ TEXTILES', ventas: 38920, ordenes: 15, tipo: 'Regular' },
  { nombre: 'MARÍA GARCÍA DESIGN', ventas: 32150, ordenes: 8, tipo: 'Premium' },
  { nombre: 'ROBERTO HERRERA', ventas: 28640, ordenes: 18, tipo: 'Regular' },
  { nombre: 'SOFIA TEXTIL S.A.', ventas: 24350, ordenes: 6, tipo: 'Premium' }
];

// Top productos/servicios
const topProductos = [
  { nombre: 'DTF Textil', ventas: 89750, color: '#3B82F6' },
  { nombre: 'UV DTF', ventas: 67820, color: '#8B5CF6' },
  { nombre: 'Impresión Digital', ventas: 45630, color: '#10B981' },
  { nombre: 'Sublimación', ventas: 32180, color: '#F59E0B' },
  { nombre: 'Vinil Textil', ventas: 28940, color: '#EF4444' }
];

// Métodos de pago
const metodosPago = [
  { name: 'Efectivo', value: 45, color: '#10B981' },
  { name: 'Transferencia', value: 35, color: '#3B82F6' },
  { name: 'Tarjeta', value: 20, color: '#8B5CF6' }
];

export default function Reportes() {
  const [dateRange, setDateRange] = useState('30d');
  const [isLoading, setIsLoading] = useState(false);

  // Data from service
  const [salesData, setSalesData] = useState([]);
  const [kpis, setKpis] = useState({ totalVentas: 0, totalOrdenes: 0, clientesUnicos: 0, ticketPromedio: 0, crecimiento: 0 });
  const [topClientesState, setTopClientesState] = useState([]);
  const [topProductosState, setTopProductosState] = useState([]);
  const [metodosPagoState, setMetodosPagoState] = useState([]);

  const formatCurrency = (value) => VentasService.formatCurrency(value);

  const loadDashboard = async (range) => {
    setIsLoading(true);
    try {
      const data = await VentasService.getDashboardData(range);

      // If no ventas returned, fall back to generated sample data to keep visuals
      if (!data || !data.ventas || data.ventas.length === 0) {
        const sample = generateSampleData();
        setSalesData(sample);
        // compute KPIs from sample
        const sampleKpis = {
          totalVentas: sample.reduce((s, d) => s + d.ventas, 0),
          totalOrdenes: sample.reduce((s, d) => s + d.ordenes, 0),
          clientesUnicos: Math.floor(sample.reduce((s, d) => s + d.clientes, 0) / 30 * 7),
          ticketPromedio: sample.reduce((s, d) => s + d.ventas, 0) / Math.max(1, sample.reduce((s, d) => s + d.ordenes, 0)),
          crecimiento: 0
        };
        setKpis(sampleKpis);
        setTopClientesState(topClientes);
        setTopProductosState(topProductos);
        setMetodosPagoState(metodosPago);
      } else {
        setSalesData(data.salesData);
        setKpis(data.kpis);
        setTopClientesState(data.topClientes);
        setTopProductosState(data.topProductos);
        setMetodosPagoState(data.metodosPago);

        // get growth comparison (adds crecimiento)
        const withGrowth = await VentasService.getGrowthComparison({ ...data });
        setKpis(prev => ({ ...prev, crecimiento: withGrowth.crecimiento || 0 }));
      }
    } catch (err) {
      console.error('Error cargando dashboard:', err);
      // fallback to sample
      setSalesData(generateSampleData());
      setTopClientesState(topClientes);
      setTopProductosState(topProductos);
      setMetodosPagoState(metodosPago);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard(dateRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard de Ventas</h1>
          <p className="text-gray-600">Análisis y KPIs de rendimiento comercial</p>
        </div>
        
        <div className="flex gap-3 mt-4 sm:mt-0">
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 3 meses</option>
            <option value="custom">Rango personalizado</option>
          </select>
          
          <button 
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Ventas */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <span className={`text-sm font-medium px-2 py-1 rounded-full ${
              kpis.crecimiento > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {kpis.crecimiento > 0 ? '+' : ''}{kpis.crecimiento.toFixed(1)}%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">
            {formatCurrency(kpis.totalVentas)}
          </h3>
          <p className="text-gray-600 text-sm">Total de Ventas</p>
        </div>

        {/* Total Órdenes */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">
            {kpis.totalOrdenes.toLocaleString()}
          </h3>
          <p className="text-gray-600 text-sm">Órdenes Completadas</p>
        </div>

        {/* Clientes Únicos */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <Award className="w-4 h-4 text-yellow-500" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">
            {kpis.clientesUnicos}
          </h3>
          <p className="text-gray-600 text-sm">Clientes Únicos</p>
        </div>

        {/* Ticket Promedio */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <CreditCard className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-sm text-gray-500">AVG</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">
            {formatCurrency(kpis.ticketPromedio)}
          </h3>
          <p className="text-gray-600 text-sm">Ticket Promedio</p>
        </div>
      </div>

      {/* Gráficos Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Gráfico de Ventas por Día */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencia de Ventas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="fecha" stroke="#6b7280" />
              <YAxis stroke="#6b7280" tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
              <Tooltip 
                formatter={(value) => [formatCurrency(value), 'Ventas']}
                labelStyle={{ color: '#374151' }}
              />
              <Area 
                type="monotone" 
                dataKey="ventas" 
                stroke="#3B82F6" 
                fill="#3B82F6" 
                fillOpacity={0.1}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Productos */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Productos Más Vendidos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProductos} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" stroke="#6b7280" tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
              <YAxis dataKey="nombre" type="category" stroke="#6b7280" width={100} />
              <Tooltip formatter={(value) => [formatCurrency(value), 'Ventas']} />
              <Bar dataKey="ventas" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sección Inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Clientes */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Clientes</h3>
          <div className="space-y-4">
            {topClientes.map((cliente, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{cliente.nombre}</p>
                    <p className="text-xs text-gray-500">{cliente.ordenes} órdenes</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(cliente.ventas)}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    cliente.tipo === 'Premium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {cliente.tipo}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Métodos de Pago */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Métodos de Pago</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={metodosPago}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                dataKey="value"
                label={({name, value}) => `${name}: ${value}%`}
              >
                {metodosPago.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Resumen del Período */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen del Período</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Mejor día de ventas</span>
              <span className="font-semibold">
                {formatCurrency(Math.max(...salesData.map(d => d.ventas)))}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Promedio diario</span>
              <span className="font-semibold">
                {formatCurrency(kpis.totalVentas / 30)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Total productos vendidos</span>
              <span className="font-semibold">
                {topProductos.reduce((sum, p) => sum + p.ventas, 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Crecimiento vs anterior</span>
              <span className={`font-semibold ${kpis.crecimiento > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {kpis.crecimiento > 0 ? '+' : ''}{kpis.crecimiento.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
