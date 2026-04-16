# Migración de Precios a Supabase

## Pasos para Aplicar la Migración

### 1. Acceder al Editor SQL de Supabase
1. Ve a tu proyecto en https://app.supabase.com
2. En el menú lateral, selecciona **SQL Editor**
3. Haz clic en **New Query**

### 2. Ejecutar la Migración
1. Abre el archivo `20250408_pricing_settings.sql`
2. Copia TODO el contenido del archivo
3. Pégalo en el editor SQL de Supabase
4. Haz clic en **Run** (o presiona `Ctrl + Enter`)

### 3. Verificar la Creación
Después de ejecutar la migración, deberías ver:
- ✅ Tabla `pricing_settings` creada
- ✅ Índices creados
- ✅ RLS policies habilitadas
- ✅ Trigger de actualización automática
- ✅ Función helper `get_active_pricing_config()`
- ✅ Configuración global por defecto insertada

Puedes verificar ejecutando esta query:
```sql
SELECT * FROM pricing_settings WHERE user_id IS NULL;
```

Deberías ver 1 registro con:
- `config_name`: "Configuración Global (Por Defecto)"
- `is_active`: true
- `price_config`: objeto JSON con todos los precios

### 4. Estructura de Datos

La tabla `pricing_settings` tiene:
- `id` (UUID): Identificador único
- `user_id` (UUID, nullable): NULL para config global, UUID para config personal
- `config_name` (VARCHAR): Nombre descriptivo
- `price_config` (JSONB): Estructura completa de precios
- `is_active` (BOOLEAN): Solo una config activa por usuario
- `created_at`, `updated_at`, `created_by`: Timestamps

### 5. Cómo Funciona en el Cotizador

1. **Carga Inicial**: Al entrar al cotizador, el hook `usePricingSettings` carga automáticamente:
   - Primero busca configuración personal del usuario autenticado
   - Si no existe, carga la configuración global (user_id = NULL)
   
2. **Modificación de Precios**: Al editar precios en la tabla de referencia:
   - Los cambios se guardan automáticamente en Supabase
   - Se crea una configuración personal (user_id = current_user)
   - Configura `is_active = true`

3. **Persistencia**: Los precios se mantienen entre:
   - Refrescos de página
   - Diferentes dispositivos del mismo usuario
   - Sesiones diferentes

### 6. Próximos Pasos

Después de aplicar esta migración:
- [ ] Verificar que el cotizador carga sin errores
- [ ] Editar un precio en la tabla de referencia
- [ ] Refrescar la página y confirmar que el precio editado persiste
- [ ] Verificar en Supabase que se creó un nuevo registro con `user_id` del usuario actual

### 7. Rollback (En caso de problemas)

Si necesitas revertir la migración:
```sql
DROP TABLE IF EXISTS pricing_settings CASCADE;
DROP FUNCTION IF EXISTS get_active_pricing_config(UUID);
```

**ADVERTENCIA**: Esto borrará todas las configuraciones de precios guardadas.
