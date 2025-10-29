# 🗄️ SCRIPTS SQL PARA MÓDULO DE CAJA

## 📋 PASO 1: CREAR TABLAS

### 1. Tabla de Categorías de Caja
```sql
CREATE TABLE categorias_caja (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(10) CHECK (tipo IN ('ingreso', 'gasto', 'ambos')),
  es_sistema BOOLEAN DEFAULT false,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Tabla de Movimientos de Caja
```sql
CREATE TABLE movimientos_caja (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha TIMESTAMP DEFAULT NOW(),
  tipo VARCHAR(10) CHECK (tipo IN ('ingreso', 'gasto')),
  monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
  categoria_id UUID REFERENCES categorias_caja(id),
  metodo_pago VARCHAR(20) CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia')),
  descripcion TEXT,
  usuario_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Tabla de Cortes de Caja
```sql
CREATE TABLE cortes_caja (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha_inicio TIMESTAMP NOT NULL,
  fecha_fin TIMESTAMP NOT NULL,
  saldo_inicial DECIMAL(10,2) DEFAULT 0,
  total_ingresos DECIMAL(10,2) DEFAULT 0,
  total_gastos DECIMAL(10,2) DEFAULT 0,
  saldo_calculado DECIMAL(10,2) GENERATED ALWAYS AS (saldo_inicial + total_ingresos - total_gastos) STORED,
  efectivo_contado DECIMAL(10,2),
  diferencia DECIMAL(10,2),
  desglose_billetes JSONB,
  observaciones TEXT,
  usuario_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 📋 PASO 2: INSERTAR CATEGORÍAS PREDETERMINADAS

```sql
INSERT INTO categorias_caja (nombre, tipo, es_sistema) VALUES
  ('Ventas', 'ingreso', true),
  ('Cobros', 'ingreso', true),
  ('Otros Ingresos', 'ingreso', true),
  ('Materiales', 'gasto', true),
  ('Servicios', 'gasto', true),
  ('Nómina', 'gasto', true),
  ('Otros Gastos', 'gasto', true);
```

## 📋 PASO 3: CONFIGURAR ROW LEVEL SECURITY (RLS)

### Habilitar RLS
```sql
ALTER TABLE movimientos_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortes_caja ENABLE ROW LEVEL SECURITY;
```

### Políticas para Movimientos de Caja
```sql
CREATE POLICY "auth_select_movimientos" ON movimientos_caja 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_insert_movimientos" ON movimientos_caja 
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_movimientos" ON movimientos_caja 
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "auth_delete_movimientos" ON movimientos_caja 
  FOR DELETE TO authenticated USING (true);
```

### Políticas para Categorías de Caja
```sql
CREATE POLICY "auth_select_categorias" ON categorias_caja 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_insert_categorias" ON categorias_caja 
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_categorias" ON categorias_caja 
  FOR UPDATE TO authenticated USING (true);
```

### Políticas para Cortes de Caja
```sql
CREATE POLICY "auth_select_cortes" ON cortes_caja 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_insert_cortes" ON cortes_caja 
  FOR INSERT TO authenticated WITH CHECK (true);
```

## 📋 PASO 4: ÍNDICES PARA PERFORMANCE (OPCIONAL)

```sql
-- Índices para mejorar consultas
CREATE INDEX idx_movimientos_fecha ON movimientos_caja(fecha);
CREATE INDEX idx_movimientos_tipo ON movimientos_caja(tipo);
CREATE INDEX idx_movimientos_categoria ON movimientos_caja(categoria_id);
CREATE INDEX idx_cortes_fecha ON cortes_caja(fecha_inicio, fecha_fin);
```

## 🎯 INSTRUCCIONES DE EJECUCIÓN

### En Supabase Dashboard:
1. Ve a tu proyecto en **https://supabase.com**
2. Click en **"SQL Editor"** en el sidebar izquierdo
3. **Copia y pega cada script** uno por uno
4. **Ejecuta cada script** presionando el botón "RUN"

### Orden de Ejecución:
1. ✅ **Crear tablas** (3 scripts)
2. ✅ **Insertar categorías** (1 script)
3. ✅ **Habilitar RLS** (1 script) 
4. ✅ **Crear políticas** (6 scripts)
5. ✅ **Crear índices** (4 scripts - opcional)

## ⚠️ VERIFICACIÓN

Después de ejecutar todos los scripts, verifica que todo esté correcto:

```sql
-- Verificar que las tablas se crearon
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('categorias_caja', 'movimientos_caja', 'cortes_caja');

-- Verificar que las categorías se insertaron
SELECT * FROM categorias_caja;

-- Verificar que RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('categorias_caja', 'movimientos_caja', 'cortes_caja');
```

## 🚨 NOTAS IMPORTANTES

- ⚠️ **Ejecuta los scripts en orden** - algunos dependen de otros
- ⚠️ **No ejecutes el mismo script dos veces** - puede causar errores
- ⚠️ **Verifica tu conexión** a Supabase antes de empezar
- ⚠️ **Haz backup** de tu base de datos si ya tienes datos importantes

¡Una vez ejecutados todos estos scripts, tu módulo de Caja estará completamente funcional! 🎉