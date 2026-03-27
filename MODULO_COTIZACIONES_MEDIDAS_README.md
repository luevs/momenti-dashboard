# Actualización: Sistema de Medidas para Cotizaciones

## Fecha: 16 de Febrero, 2025

## Descripción
Se agregaron campos de medidas para productos de impresión en el módulo de cotizaciones. Ahora es posible cotizar servicios de impresión como Vinil Impreso, Lona y Vinil Microperforado usando:
- **Metro cuadrado (m²)**: Ancho × Alto
- **Metro lineal**: Solo ancho

## ✨ Cambios Implementados

### Frontend (React)

#### 1. **NuevaCotizacion.jsx**
- ✅ Agregados campos en el estado de items:
  - `usa_medidas`: Boolean que indica si el item usa medidas
  - `ancho`: Ancho en metros
  - `alto`: Alto en metros (para m²)
  - `tipo_precio`: 'm2' o 'metro_lineal'
  - `precio_por_medida`: Precio por m² o metro lineal

- ✅ Lógica automática:
  - Al seleccionar servicios de impresión (VINIL_IMPRESO, LONA, VINIL_MICROPERFORADO), se activan automáticamente los campos de medidas
  - Cálculo automático del total según:
    - **m²**: cantidad × (ancho × alto) × precio_por_medida
    - **Metro lineal**: cantidad × ancho × precio_por_medida

- ✅ UI/UX mejorado:
  - Sección especial con fondo cyan cuando se usan medidas
  - Selector para escoger entre m² o metro lineal
  - Campos que se muestran/ocultan dinámicamente
  - Preview del cálculo en tiempo real

#### 2. **CotizacionDetail.jsx**
- ✅ Vista de detalle actualizada
- ✅ Columna de "Medidas" en la tabla de productos
- ✅ Muestra las dimensiones y tipo de cálculo
- ✅ PDF actualizado con información de medidas

### Base de Datos (Supabase/PostgreSQL)

#### Script SQL: `sql/20250216_cotizaciones_medidas.sql`
**⚠️ IMPORTANTE: Este script DEBE ejecutarse en Supabase**

Columnas agregadas a `cotizacion_items`:
- `usa_medidas` BOOLEAN DEFAULT false
- `ancho` DECIMAL(10,2)
- `alto` DECIMAL(10,2)
- `tipo_precio` VARCHAR(20) - 'm2' o 'metro_lineal'
- `precio_por_medida` DECIMAL(10,2)

## 📋 Instrucciones de Instalación

### Paso 1: Actualizar Base de Datos

1. Abre tu proyecto en [Supabase](https://app.supabase.com)
2. Ve a **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido del archivo: `sql/20250216_cotizaciones_medidas.sql`
5. Ejecuta el script (Run)
6. Verifica que se ejecutó correctamente (debería mostrar "Success")

### Paso 2: Verificar Cambios

```sql
-- Ejecuta esta query para verificar las nuevas columnas:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'cotizacion_items'
AND column_name IN ('usa_medidas', 'ancho', 'alto', 'tipo_precio', 'precio_por_medida');
```

Deberías ver las 5 columnas nuevas listadas.

### Paso 3: Probar en el Frontend

1. El frontend ya está actualizado y listo
2. Ve a **Cotizaciones** → **Nueva Cotización**
3. Agrega un producto
4. Selecciona tipo de servicio: **Vinil Impreso**, **Lona** o **Vinil Microperforado**
5. Verás que aparece la sección de **Configuración de Medidas**
6. Prueba ambos modos:
   - **Por m²**: Ingresa ancho y alto
   - **Por metro lineal**: Solo ingresa ancho

## 🎯 Ejemplo de Uso

### Ejemplo 1: Lona por m²
- **Tipo de servicio**: Lona
- **Tipo de precio**: Por m² (ancho × alto)
- **Ancho**: 3.00 metros
- **Alto**: 2.00 metros
- **Precio por m²**: $180.00
- **Cantidad**: 1

**Cálculo**: 1 × (3.00 × 2.00) × $180.00 = **$1,080.00**

### Ejemplo 2: Vinil por metro lineal
- **Tipo de servicio**: Vinil Impreso
- **Tipo de precio**: Por Metro Lineal (ancho)
- **Ancho**: 1.20 metros
- **Precio por metro**: $150.00
- **Cantidad**: 5

**Cálculo**: 5 × 1.20 × $150.00 = **$900.00**

## ⚙️ Servicios que Usan Medidas

Actualmente, los siguientes tipos de servicio activan automáticamente el modo de medidas:
- ✅ Vinil Impreso
- ✅ Lona
- ✅ Vinil Microperforado

Otros servicios continúan usando el sistema de precio unitario normal.

## 🔧 Para Desarrolladores

### Estructura de Datos

```javascript
{
  descripcion: "Lona para fachada",
  cantidad: "1",
  unidad: "pzas",
  precio_unitario: 1080.00,  // Calculado automáticamente
  total: 1080.00,            // Calculado automáticamente
  tipo_servicio: "LONA",
  // Campos nuevos:
  usa_medidas: true,
  ancho: "3.00",
  alto: "2.00",
  tipo_precio: "m2",
  precio_por_medida: 180.00
}
```

### Agregar Más Servicios con Medidas

Para agregar más servicios que usen medidas, edita en `NuevaCotizacion.jsx`:

```javascript
// Línea ~110
const serviciosConMedidas = ['VINIL_IMPRESO', 'LONA', 'VINIL_MICROPERFORADO', 'NUEVO_SERVICIO'];
```

## ✅ Checklist de Implementación

- [x] Agregar campos al estado de items en NuevaCotizacion.jsx
- [x] Implementar lógica de cálculo automático
- [x] Crear UI para campos de medidas
- [x] Actualizar vista de detalle (CotizacionDetail.jsx)
- [x] Actualizar template de PDF
- [x] Crear script SQL para base de datos
- [x] Documentar cambios

## 🐛 Solución de Problemas

### Error al guardar cotización
- **Causa**: El script SQL no se ha ejecutado en Supabase
- **Solución**: Ejecuta el script `sql/20250216_cotizaciones_medidas.sql` en Supabase SQL Editor

### Los campos de medidas no aparecen
- **Causa**: El tipo de servicio no está en la lista de servicios con medidas
- **Solución**: Verifica que el servicio sea VINIL_IMPRESO, LONA o VINIL_MICROPERFORADO

### El cálculo no es correcto
- **Causa**: Verifica que estás ingresando las medidas en metros (no centímetros)
- **Solución**: Usa decimales. Ejemplo: 120cm = 1.20 metros

## 📞 Soporte

Si tienes problemas con la implementación:
1. Verifica que el script SQL se ejecutó correctamente
2. Revisa la consola del navegador (F12) para errores
3. Verifica que los datos se están guardando en Supabase (tabla cotizacion_items)

---

**Última actualización**: 16 de Febrero, 2025
**Versión**: 1.0.0
