-- =====================================================
-- ⚡ SCRIPT ÚNICO PARA SOLUCIONAR COTIZACIONES
-- Ejecuta SOLO este archivo en Supabase
-- =====================================================

-- ============================================================
-- PASO 1: Limpiar todas las políticas antiguas
-- ============================================================
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver cotizaciones" ON cotizaciones;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear cotizaciones" ON cotizaciones;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar cotizaciones" ON cotizaciones;
DROP POLICY IF EXISTS "Solo admins pueden eliminar cotizaciones" ON cotizaciones;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON cotizaciones;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON cotizaciones;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON cotizaciones;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON cotizaciones;
DROP POLICY IF EXISTS "allow_all_select_cotizaciones" ON cotizaciones;
DROP POLICY IF EXISTS "allow_all_insert_cotizaciones" ON cotizaciones;
DROP POLICY IF EXISTS "allow_all_update_cotizaciones" ON cotizaciones;
DROP POLICY IF EXISTS "allow_all_delete_cotizaciones" ON cotizaciones;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver items" ON cotizacion_items;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear items" ON cotizacion_items;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar items" ON cotizacion_items;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar items" ON cotizacion_items;
DROP POLICY IF EXISTS "Enable read access for authenticated users on items" ON cotizacion_items;
DROP POLICY IF EXISTS "Enable insert access for authenticated users on items" ON cotizacion_items;
DROP POLICY IF EXISTS "Enable update access for authenticated users on items" ON cotizacion_items;
DROP POLICY IF EXISTS "Enable delete access for authenticated users on items" ON cotizacion_items;
DROP POLICY IF EXISTS "allow_all_select_cotizacion_items" ON cotizacion_items;
DROP POLICY IF EXISTS "allow_all_insert_cotizacion_items" ON cotizacion_items;
DROP POLICY IF EXISTS "allow_all_update_cotizacion_items" ON cotizacion_items;
DROP POLICY IF EXISTS "allow_all_delete_cotizacion_items" ON cotizacion_items;

-- ============================================================
-- PASO 2: Crear políticas nuevas SUPER PERMISIVAS
-- ============================================================

-- COTIZACIONES: Acceso completo para todos
CREATE POLICY "cotizaciones_select_all" ON cotizaciones FOR SELECT USING (true);
CREATE POLICY "cotizaciones_insert_all" ON cotizaciones FOR INSERT WITH CHECK (true);
CREATE POLICY "cotizaciones_update_all" ON cotizaciones FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "cotizaciones_delete_all" ON cotizaciones FOR DELETE USING (true);

-- ITEMS: Acceso completo para todos
CREATE POLICY "items_select_all" ON cotizacion_items FOR SELECT USING (true);
CREATE POLICY "items_insert_all" ON cotizacion_items FOR INSERT WITH CHECK (true);
CREATE POLICY "items_update_all" ON cotizacion_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "items_delete_all" ON cotizacion_items FOR DELETE USING (true);

-- ============================================================
-- PASO 3: Agregar columnas de medidas (si no existen)
-- ============================================================
ALTER TABLE cotizacion_items 
ADD COLUMN IF NOT EXISTS usa_medidas BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ancho DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS alto DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS tipo_precio VARCHAR(20),
ADD COLUMN IF NOT EXISTS precio_por_medida DECIMAL(10,2);

-- Agregar constraints
DO $$ 
BEGIN
  -- Intentar agregar constraint, ignorar si ya existe
  BEGIN
    ALTER TABLE cotizacion_items
    ADD CONSTRAINT chk_tipo_precio 
      CHECK (tipo_precio IS NULL OR tipo_precio IN ('m2', 'metro_lineal'));
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE cotizacion_items
    ADD CONSTRAINT chk_medidas_positivas
      CHECK (
        (ancho IS NULL OR ancho > 0) AND 
        (alto IS NULL OR alto > 0) AND 
        (precio_por_medida IS NULL OR precio_por_medida >= 0)
      );
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ============================================================
-- PASO 4: Verificación final
-- ============================================================
DO $$
DECLARE
  cotizaciones_rls BOOLEAN;
  items_rls BOOLEAN;
  columna_count INTEGER;
  politica_count INTEGER;
BEGIN
  -- Verificar RLS
  SELECT relrowsecurity INTO cotizaciones_rls 
  FROM pg_class WHERE relname = 'cotizaciones';
  
  SELECT relrowsecurity INTO items_rls 
  FROM pg_class WHERE relname = 'cotizacion_items';
  
  -- Contar columnas de medidas
  SELECT COUNT(*) INTO columna_count
  FROM information_schema.columns
  WHERE table_name = 'cotizacion_items'
  AND column_name IN ('usa_medidas', 'ancho', 'alto', 'tipo_precio', 'precio_por_medida');
  
  -- Contar políticas
  SELECT COUNT(*) INTO politica_count
  FROM pg_policies
  WHERE tablename IN ('cotizaciones', 'cotizacion_items');
  
  -- Mostrar resultados
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ SCRIPT EJECUTADO EXITOSAMENTE';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS en cotizaciones: %', CASE WHEN cotizaciones_rls THEN 'HABILITADO ✅' ELSE 'DESHABILITADO ⚠️' END;
  RAISE NOTICE '🔒 RLS en cotizacion_items: %', CASE WHEN items_rls THEN 'HABILITADO ✅' ELSE 'DESHABILITADO ⚠️' END;
  RAISE NOTICE '📊 Columnas de medidas agregadas: %/5', columna_count;
  RAISE NOTICE '🛡️  Políticas RLS creadas: %', politica_count;
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
  IF columna_count = 5 AND politica_count >= 8 THEN
    RAISE NOTICE '🎉 TODO CONFIGURADO CORRECTAMENTE';
    RAISE NOTICE '✅ Ahora puedes crear cotizaciones sin problemas';
  ELSE
    RAISE NOTICE '⚠️  Verifica que todo esté correcto';
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
