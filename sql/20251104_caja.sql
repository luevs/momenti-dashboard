-- SQL: Implementación de módulo Caja
-- Fecha: 2025-11-04
-- Instrucciones: Ejecute este script en el SQL Editor de Supabase (Project > SQL Editor > New query). 

-- 1) Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2) Tabla: categorias_caja
CREATE TABLE IF NOT EXISTS public.categorias_caja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(10) CHECK (tipo IN ('ingreso', 'gasto', 'ambos')) DEFAULT 'ambos',
  es_sistema BOOLEAN DEFAULT false,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3) Tabla: movimientos_caja
CREATE TABLE IF NOT EXISTS public.movimientos_caja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha TIMESTAMP WITH TIME ZONE DEFAULT now(),
  tipo VARCHAR(10) CHECK (tipo IN ('ingreso', 'gasto')) NOT NULL,
  monto NUMERIC(12,2) NOT NULL CHECK (monto >= 0),
  categoria_id UUID REFERENCES public.categorias_caja(id) ON DELETE SET NULL,
  metodo_pago VARCHAR(20) CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia', 'cheque', 'otro')) DEFAULT 'efectivo',
  descripcion TEXT,
  usuario_id UUID, -- opcional: referenciar auth.users(id) si usas supabase auth
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4) Tabla: cortes_caja
CREATE TABLE IF NOT EXISTS public.cortes_caja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  fecha_fin TIMESTAMP WITH TIME ZONE NOT NULL,
  saldo_inicial NUMERIC(12,2) DEFAULT 0,
  total_ingresos NUMERIC(12,2) DEFAULT 0,
  total_gastos NUMERIC(12,2) DEFAULT 0,
  saldo_calculado NUMERIC(12,2) GENERATED ALWAYS AS (saldo_inicial + total_ingresos - total_gastos) STORED,
  efectivo_contado NUMERIC(12,2),
  diferencia NUMERIC(12,2),
  desglose_billetes JSONB,
  observaciones TEXT,
  usuario_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5) Insertar categorías predeterminadas (ignorar si ya existen)
INSERT INTO public.categorias_caja (id, nombre, tipo, es_sistema, activa)
SELECT gen_random_uuid(), v.nombre, v.tipo, true, true
FROM (VALUES
  ('Ventas', 'ingreso'),
  ('Cobros', 'ingreso'),
  ('Otros Ingresos', 'ingreso'),
  ('Materiales', 'gasto'),
  ('Servicios', 'gasto'),
  ('Nómina', 'gasto'),
  ('Otros Gastos', 'gasto')
) AS v(nombre, tipo)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categorias_caja c WHERE c.nombre = v.nombre
);

-- 6) Habilitar RLS en las tablas (si usas autenticación) - opcional pero recomendado
ALTER TABLE public.movimientos_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cortes_caja ENABLE ROW LEVEL SECURITY;

-- 7) Políticas básicas: permitir SELECT/INSERT/UPDATE a role 'authenticated'
-- Ajusta las políticas a tu modelo de permisos si necesitas restricciones por usuario

-- Movimientos
-- DROP & CREATE patrón (Postgres no soporta IF NOT EXISTS en CREATE POLICY)
DROP POLICY IF EXISTS "auth_select_movimientos" ON public.movimientos_caja;
CREATE POLICY "auth_select_movimientos" ON public.movimientos_caja
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_movimientos" ON public.movimientos_caja;
CREATE POLICY "auth_insert_movimientos" ON public.movimientos_caja
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_movimientos" ON public.movimientos_caja;
CREATE POLICY "auth_update_movimientos" ON public.movimientos_caja
  FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_delete_movimientos" ON public.movimientos_caja;
CREATE POLICY "auth_delete_movimientos" ON public.movimientos_caja
  FOR DELETE TO authenticated USING (true);

-- Categorías
DROP POLICY IF EXISTS "auth_select_categorias" ON public.categorias_caja;
CREATE POLICY "auth_select_categorias" ON public.categorias_caja
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_categorias" ON public.categorias_caja;
CREATE POLICY "auth_insert_categorias" ON public.categorias_caja
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_categorias" ON public.categorias_caja;
CREATE POLICY "auth_update_categorias" ON public.categorias_caja
  FOR UPDATE TO authenticated USING (true);

-- Cortes
DROP POLICY IF EXISTS "auth_select_cortes" ON public.cortes_caja;
CREATE POLICY "auth_select_cortes" ON public.cortes_caja
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_cortes" ON public.cortes_caja;
CREATE POLICY "auth_insert_cortes" ON public.cortes_caja
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_cortes" ON public.cortes_caja;
CREATE POLICY "auth_update_cortes" ON public.cortes_caja
  FOR UPDATE TO authenticated USING (true);

-- 8) Índices para performance
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON public.movimientos_caja(fecha);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON public.movimientos_caja(tipo);
CREATE INDEX IF NOT EXISTS idx_movimientos_categoria ON public.movimientos_caja(categoria_id);
CREATE INDEX IF NOT EXISTS idx_cortes_fecha ON public.cortes_caja(fecha_inicio, fecha_fin);

-- 9) Trigger opcional: validar formato de desglose_billetes (ejemplo)
CREATE OR REPLACE FUNCTION validate_desglose_billetes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.desglose_billetes IS NOT NULL THEN
    -- ejemplo simple: asegurar que sea JSON object
    IF jsonb_typeof(NEW.desglose_billetes) <> 'object' THEN
      RAISE EXCEPTION 'desglose_billetes debe ser un JSON object';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_desglose ON public.cortes_caja;
CREATE TRIGGER trg_validate_desglose
  BEFORE INSERT OR UPDATE ON public.cortes_caja
  FOR EACH ROW EXECUTE FUNCTION validate_desglose_billetes();

-- 10) Ejemplo de inserción de movimiento y corte para probar
-- INSERT INTO public.movimientos_caja (tipo, monto, categoria_id, metodo_pago, descripcion, usuario_id)
-- VALUES ('ingreso', 1200.00, (SELECT id FROM public.categorias_caja WHERE nombre='Ventas' LIMIT 1), 'efectivo', 'Venta mostrador', NULL);

-- INSERT INTO public.cortes_caja (fecha_inicio, fecha_fin, saldo_inicial, total_ingresos, total_gastos, efectivo_contado, diferencia, desglose_billetes, usuario_id)
-- VALUES (now() - INTERVAL '8 hours', now(), 1000, 5000, 200, 5800, 0, '{"500":4, "200":1}', NULL);

-- 11) Consultas útiles de verificación
-- SELECT table_name, rowsecurity FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('categorias_caja','movimientos_caja','cortes_caja');
-- SELECT * FROM public.categorias_caja LIMIT 20;
-- SELECT * FROM public.movimientos_caja ORDER BY created_at DESC LIMIT 20;
-- SELECT * FROM public.cortes_caja ORDER BY created_at DESC LIMIT 20;

-- Fin del script

-- ==================================================
-- BLOQUE DE DIAGNÓSTICO (COPIAR/PEGAR EN SQL EDITOR PARA DEBBUG)
-- ==================================================
-- 1) Verificar filas y columna 'activa'
-- SELECT id, nombre, tipo, activa FROM public.categorias_caja ORDER BY nombre;

-- 2) Verificar si RLS está activo en la tabla
-- SELECT table_name, rowsecurity
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name = 'categorias_caja';

-- 3) Verificar políticas aplicadas a la tabla
-- SELECT polname, polcmd, polroles, polqual, polwithcheck
-- FROM pg_policies
-- WHERE tablename = 'categorias_caja';

-- 4) POLÍTICA TEMPORAL PARA PRUEBAS (DESCOMENTAR SOLO PARA DIAGNÓSTICO)
-- Esta política permite SELECT público. Úsala únicamente para confirmar si RLS es la causa.
-- Luego de verificar, elimina la política con DROP POLICY y vuelve a la configuración segura.
-- DROP POLICY IF EXISTS anon_select_categorias ON public.categorias_caja;
-- CREATE POLICY anon_select_categorias ON public.categorias_caja
--   FOR SELECT TO public USING (true);

-- 5) REVERTIR POLÍTICA TEMPORAL (si la usaste)
-- DROP POLICY IF EXISTS anon_select_categorias ON public.categorias_caja;

-- NOTAS:
-- - Si al descomentar la política temporal y actualizar la app las categorías aparecen, entonces
--   el origen del problema es RLS / autenticación del cliente.
-- - Si las categorías siguen sin aparecer pese a tener filas y a la política pública, revisa la
--   columna 'activa' (debe ser TRUE) y revisa la consola del navegador para errores de red.

