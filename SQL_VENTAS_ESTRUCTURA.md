# 🗄️ TABLAS PARA DASHBOARD VENTAS

## Estructura basada en tu tabla actual de Excel

```sql
-- 1. Tabla de ventas (compatible con tu Excel)
CREATE TABLE ventas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venta_id VARCHAR(50) UNIQUE NOT NULL, -- Tu campo venta_id original
  cliente VARCHAR(255), -- Como string por ahora, después lo linkearemos
  fecha DATE NOT NULL,
  venta_de TEXT, -- Descripción del producto/servicio
  importe DECIMAL(10,2) NOT NULL,
  pagos DECIMAL(10,2) DEFAULT 0,
  saldo DECIMAL(10,2) DEFAULT 0,
  atendio VARCHAR(100),
  comentarios TEXT,
  formas_de_pago VARCHAR(100),
  referencias VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  imported_at TIMESTAMP DEFAULT NOW() -- Para saber cuándo se importó
);

-- 2. Índices para performance
CREATE INDEX idx_ventas_fecha ON ventas(fecha);
CREATE INDEX idx_ventas_cliente ON ventas(cliente);
CREATE INDEX idx_ventas_venta_id ON ventas(venta_id);

-- 3. RLS Policies
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_ventas" ON ventas 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_insert_ventas" ON ventas 
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_ventas" ON ventas 
  FOR UPDATE TO authenticated USING (true);

-- 4. Vista para KPIs rápidos
CREATE VIEW ventas_kpis AS
SELECT 
  DATE_TRUNC('day', fecha) as dia,
  DATE_TRUNC('week', fecha) as semana,
  DATE_TRUNC('month', fecha) as mes,
  COUNT(*) as total_ordenes,
  SUM(importe) as total_ventas,
  COUNT(DISTINCT cliente) as clientes_unicos,
  AVG(importe) as ticket_promedio
FROM ventas 
GROUP BY DATE_TRUNC('day', fecha), DATE_TRUNC('week', fecha), DATE_TRUNC('month', fecha);
```

## 📊 KPIs que podemos calcular inmediatamente:

### Con estos datos podrás ver:
- 💰 **Total de ventas** por día/semana/mes
- 📋 **Número de órdenes** 
- 👥 **Clientes únicos** por período
- 🎯 **Top clientes** por monto total
- 📈 **Tendencias** de ventas en el tiempo
- 💳 **Formas de pago** más usadas
- 🏆 **Productos más vendidos** (campo venta_de)
- 💵 **Ticket promedio**
- 👨‍💼 **Vendedor más efectivo** (campo atendio)