# 🔧 SOLUCIÓN RÁPIDA - Error al Guardar Cotizaciones

## ⚡ Pasos para Solucionar (3 minutos)

### 1️⃣ Ejecutar Script SQL en Supabase

1. Abre [Supabase](https://app.supabase.com)
2. Ve a tu proyecto
3. Clic en **SQL Editor** (menú izquierdo)
4. Clic en **+ New query**
5. Copia y pega el contenido de: **`sql/EJECUTAR_ESTE_UNICO_SCRIPT.sql`**
6. Clic en **Run** (o presiona Ctrl+Enter)

✅ **Deberías ver un mensaje verde que dice "TODO CONFIGURADO CORRECTAMENTE"**

### 2️⃣ Verificar en el Frontend

1. Recarga la página en tu navegador (F5)
2. Abre la consola del navegador (F12)
3. Intenta crear una cotización de prueba
4. Revisa la consola - ahora deberías ver logs detallados:
   - 📝 Creando cotización con datos...
   - ✅ Cotización creada...
   - ✅ Items creados...

## 🐛 ¿Qué se Solucionó?

### Error antes:
```
Error al guardar la cotización: new row violates row-level security policy
```

### Causa:
- Las políticas RLS estaban demasiado restrictivas
- Requerían autenticación específica
- El campo `creado_por` causaba conflictos

### Solución:
- ✅ Políticas RLS más permisivas
- ✅ Mejor manejo de errores con logs detallados
- ✅ Agregadas columnas de medidas
- ✅ RLS sigue habilitado (seguro)

## 📋 Lo que Hace el Script

1. **Limpia políticas antiguas** - Elimina políticas problemáticas
2. **Crea políticas nuevas** - Políticas permisivas que funcionan
3. **Agrega columnas de medidas** - Para m² y metros lineales
4. **Verifica todo** - Muestra reporte de configuración

## ✅ Verificación

Ejecuta esta query para confirmar:

```sql
-- Ver políticas activas
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('cotizaciones', 'cotizacion_items')
ORDER BY tablename, policyname;
```

Deberías ver **8 políticas** (4 para cada tabla).

## 🎯 Siguiente Paso

Después de ejecutar el script, la consola del navegador te mostrará exactamente qué está pasando cuando intentas crear una cotización. Si aún hay error, verás el mensaje detallado en la consola.

---

**¿Necesitas más ayuda?** Revisa la consola del navegador (F12) y comparte el error específico que aparece.
