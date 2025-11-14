# 📊 DASHBOARD DE VENTAS - PLAN COMPLETO

## 🗄️ FASE 1: ESTRUCTURA DE DATOS

### Tablas necesarias en Supabase:

```sql
-- 1. Tabla de Ventas Principal
CREATE TABLE ventas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folio VARCHAR(50) UNIQUE NOT NULL,
  fecha_venta TIMESTAMP NOT NULL,
  cliente_id UUID REFERENCES customers_(id),
  total DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2),
  iva DECIMAL(10,2),
  descuento DECIMAL(10,2) DEFAULT 0,
  metodo_pago VARCHAR(20) CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia', 'credito')),
  status VARCHAR(20) CHECK (status IN ('pendiente', 'pagado', 'cancelado')),
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Detalle de Ventas (productos/servicios vendidos)
CREATE TABLE ventas_detalle (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE,
  producto_servicio VARCHAR(100) NOT NULL, -- 'DTF Textil', 'UV DTF', 'Impresión', etc.
  cantidad DECIMAL(10,3) NOT NULL, -- metros, piezas, etc.
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  unidad VARCHAR(10) DEFAULT 'pcs' -- 'metros', 'piezas', 'hojas'
);

-- 3. Productos/Servicios Catálogo
CREATE TABLE productos_servicios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  categoria VARCHAR(50), -- 'DTF', 'UV', 'Digital', 'Offset'
  precio_base DECIMAL(10,2),
  unidad VARCHAR(10) DEFAULT 'pcs',
  activo BOOLEAN DEFAULT true
);
```

## 📊 FASE 2: KPIs Y MÉTRICAS

### KPIs Principales:
1. **💰 Total Ventas** (día/semana/mes/rango)
2. **📋 Número de Órdenes** (cantidad de ventas)
3. **🏆 Top Clientes** (por monto)
4. **📈 Tendencias** (comparativa períodos)
5. **🎯 Productos Más Vendidos**
6. **💳 Métodos de Pago** (distribución)

## 🎨 FASE 3: DISEÑO DEL DASHBOARD

### Layout Propuesto:
```
┌─────────────────────────────────────────────┐
│  📅 FILTRO DE FECHAS    🔄 REFRESH          │
├─────────────────────────────────────────────┤
│  💰 Total    📋 Órdenes   👥 Clientes       │
│  $125,450    87 ventas    45 únicos         │
├─────────────────────────────────────────────┤
│  📈 GRÁFICO VENTAS POR DÍA (Line Chart)    │
├─────────────────────────────────────────────┤
│  🏆 TOP CLIENTES  │  🎯 TOP PRODUCTOS      │
│  1. Juan Pérez    │  1. DTF Textil         │
│  2. María López   │  2. UV DTF             │
├─────────────────────────────────────────────┤
│  💳 MÉTODOS PAGO  │  📊 COMPARATIVA        │
│  [Pie Chart]      │  Este mes vs anterior  │
└─────────────────────────────────────────────┘
```

## 🚀 FASE 4: IMPLEMENTACIÓN

### Tecnologías:
- **Recharts** - Gráficos (más fácil que Chart.js)
- **Date Range Picker** - Filtros de fecha
- **React Query** - Cache y optimización
- **Supabase Views** - Consultas optimizadas

## 📈 FASE 5: MIGRACIÓN DE DATOS

### Opciones para traer datos de AdmiPrint:
1. **Export CSV** → Import a Supabase
2. **API Integration** (si AdmiPrint lo permite)
3. **Entrada manual** de datos históricos importantes

## ⏱️ CRONOGRAMA:

1. **Día 1**: Crear tablas en Supabase ✅
2. **Día 2**: KPI Cards básicos 
3. **Día 3**: Gráfico principal de ventas
4. **Día 4**: Top clientes y productos
5. **Día 5**: Filtros y comparativas
6. **Día 6**: Migración de datos históricos