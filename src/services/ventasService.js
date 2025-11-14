import { supabase } from '../supabaseClient';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';

export class VentasService {
  
  // Formatear moneda mexicana
  static formatCurrency(value) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  }

  // Obtener ventas por rango de fechas
  static async getVentasByDateRange(startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('venta_id, cliente, fecha, venta_de, importe, pagos, saldo, atendio, formas_de_pago')
        .gte('fecha', format(startDate, 'yyyy-MM-dd'))
        .lte('fecha', format(endDate, 'yyyy-MM-dd'))
        .order('fecha', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching ventas:', error);
      return [];
    }
  }

  // Calcular KPIs principales
  static calculateKPIs(ventas) {
    const totalVentas = ventas.reduce((sum, venta) => sum + (venta.importe || 0), 0);
    const totalOrdenes = ventas.length;
    const clientesUnicos = new Set(ventas.map(v => v.cliente)).size;
    const ticketPromedio = totalOrdenes > 0 ? totalVentas / totalOrdenes : 0;

    return {
      totalVentas,
      totalOrdenes,
      clientesUnicos,
      ticketPromedio
    };
  }

  // Agrupar ventas por día para gráficos
  static groupVentasByDay(ventas) {
    const grouped = ventas.reduce((acc, venta) => {
      const fecha = format(new Date(venta.fecha), 'MM/dd');
      const fechaCompleta = format(new Date(venta.fecha), 'yyyy-MM-dd');
      
      if (!acc[fechaCompleta]) {
        acc[fechaCompleta] = {
          fecha,
          fechaCompleta,
          ventas: 0,
          ordenes: 0,
          clientes: new Set()
        };
      }

      acc[fechaCompleta].ventas += venta.importe || 0;
      acc[fechaCompleta].ordenes += 1;
      acc[fechaCompleta].clientes.add(venta.cliente);

      return acc;
    }, {});

    // Convertir a array y procesar clientes únicos
    return Object.values(grouped).map(day => ({
      ...day,
      clientes: day.clientes.size
    }));
  }

  // Top clientes por monto total
  static getTopClientes(ventas, limit = 5) {
    const clienteStats = ventas.reduce((acc, venta) => {
      const cliente = venta.cliente;
      if (!acc[cliente]) {
        acc[cliente] = {
          nombre: cliente,
          ventas: 0,
          ordenes: 0
        };
      }

      acc[cliente].ventas += venta.importe || 0;
      acc[cliente].ordenes += 1;
      
      return acc;
    }, {});

    return Object.values(clienteStats)
      .sort((a, b) => b.ventas - a.ventas)
      .slice(0, limit)
      .map(cliente => ({
        ...cliente,
        tipo: cliente.ventas > 30000 ? 'Premium' : cliente.ventas > 15000 ? 'Regular' : 'Nuevo'
      }));
  }

  // Top productos/servicios
  static getTopProductos(ventas, limit = 5) {
    const productoStats = ventas.reduce((acc, venta) => {
      const producto = venta.venta_de || 'Sin especificar';
      if (!acc[producto]) {
        acc[producto] = {
          nombre: producto,
          ventas: 0,
          ordenes: 0
        };
      }

      acc[producto].ventas += venta.importe || 0;
      acc[producto].ordenes += 1;
      
      return acc;
    }, {});

    const colores = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899'];

    return Object.values(productoStats)
      .sort((a, b) => b.ventas - a.ventas)
      .slice(0, limit)
      .map((producto, index) => ({
        ...producto,
        color: colores[index % colores.length]
      }));
  }

  // Distribución de métodos de pago
  static getMetodosPago(ventas) {
    const metodos = ventas.reduce((acc, venta) => {
      const metodo = venta.formas_de_pago || 'Sin especificar';
      acc[metodo] = (acc[metodo] || 0) + 1;
      return acc;
    }, {});

    const total = Object.values(metodos).reduce((sum, count) => sum + count, 0);
    const colores = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

    return Object.entries(metodos)
      .map(([name, count], index) => ({
        name,
        value: Math.round((count / total) * 100),
        color: colores[index % colores.length]
      }))
      .sort((a, b) => b.value - a.value);
  }

  // Obtener datos para período específico
  static async getDashboardData(dateRange = '30d') {
    const now = new Date();
    let startDate, endDate;

    switch (dateRange) {
      case '7d':
        startDate = subDays(now, 7);
        endDate = now;
        break;
      case '30d':
        startDate = subDays(now, 30);
        endDate = now;
        break;
      case '90d':
        startDate = subDays(now, 90);
        endDate = now;
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      default:
        startDate = subDays(now, 30);
        endDate = now;
    }

    const ventas = await this.getVentasByDateRange(startDate, endDate);
    
    return {
      ventas,
      kpis: this.calculateKPIs(ventas),
      salesData: this.groupVentasByDay(ventas),
      topClientes: this.getTopClientes(ventas),
      topProductos: this.getTopProductos(ventas),
      metodosPago: this.getMetodosPago(ventas),
      period: { startDate, endDate }
    };
  }

  // Calcular crecimiento vs período anterior
  static async getGrowthComparison(currentData, dateRange = '30d') {
    const { period } = currentData;
    const daysDiff = Math.ceil((period.endDate - period.startDate) / (1000 * 60 * 60 * 24));
    
    const prevStartDate = subDays(period.startDate, daysDiff);
    const prevEndDate = subDays(period.endDate, daysDiff);
    
    const ventasAnterior = await this.getVentasByDateRange(prevStartDate, prevEndDate);
    const kpisAnterior = this.calculateKPIs(ventasAnterior);
    
    const crecimiento = kpisAnterior.totalVentas > 0 
      ? ((currentData.kpis.totalVentas - kpisAnterior.totalVentas) / kpisAnterior.totalVentas) * 100
      : 0;

    return {
      ...currentData,
      crecimiento,
      periodoAnterior: {
        kpis: kpisAnterior,
        period: { startDate: prevStartDate, endDate: prevEndDate }
      }
    };
  }
}