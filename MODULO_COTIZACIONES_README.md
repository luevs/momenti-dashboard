# 📋 Módulo de Cotizaciones - Momenti Dashboard

Este módulo proporciona una gestión completa de cotizaciones para la agencia de imprenta y publicidad Momenti en Chihuahua, México.

## 🎯 Características Principales

- ✅ Creación y edición de cotizaciones con interfaz intuitiva
- ✅ Sistema de scoring automático (0-100) basado en múltiples factores
- ✅ Gestión de estados (Cotizado, En Proceso, Cerrado, Perdido)
- ✅ Segmentación de clientes (Negocio Nuevo, Evento/Corporativo, Revendedor, Cliente Final)
- ✅ Generación de PDF profesional con branding corporativo
- ✅ Duplicación de cotizaciones existentes
- ✅ Estadísticas y análisis de conversión
- ✅ Top clientes por valor
- ✅ Servicios más cotizados
- ✅ Exportación a Excel
- ✅ Sistema de notas y seguimiento
- ✅ Cálculo automático de IVA y totales

## 📦 Instalación

### 1. Base de Datos (Supabase)

Ejecuta el script SQL en tu proyecto de Supabase:

```bash
# El archivo está ubicado en:
sql/20250213_cotizaciones.sql
```

Este script creará:
- Tabla `cotizaciones`
- Tabla `cotizacion_items`
- Vistas para análisis (v_cotizaciones_resumen, v_servicios_mas_cotizados, v_cotizaciones_mensuales)
- Funciones de utilidad (generar_folio_cotizacion, calcular_score_cotizacion)
- Triggers automáticos
- Políticas de seguridad RLS

**Pasos en Supabase:**
1. Abre tu proyecto en Supabase
2. Ve a SQL Editor
3. Crea una nueva query
4. Copia y pega el contenido de `sql/20250213_cotizaciones.sql`
5. Ejecuta el script (Run)
6. Verifica que no haya errores

### 2. Dependencias del Frontend

Las dependencias ya están instaladas en el proyecto:
- `react-router-dom` (navegación)
- `lucide-react` (iconos)
- `xlsx` (exportación a Excel)
- `recharts` (gráficas estadísticas)
- `@supabase/supabase-js` (cliente de Supabase)

Si necesitas reinstalar:

```bash
npm install react-router-dom lucide-react xlsx recharts @supabase/supabase-js
# o
pnpm install react-router-dom lucide-react xlsx recharts @supabase/supabase-js
```

### 3. Variables de Entorno

Asegúrate de que tu archivo `.env` tenga configuradas las variables de Supabase:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

### 4. Verificación de la Instalación

Los archivos del módulo ya están integrados en:

```
src/
├── pages/
│   └── Cotizaciones/
│       ├── CotizacionesList.jsx      # Lista de cotizaciones
│       ├── NuevaCotizacion.jsx       # Formulario crear/editar
│       ├── CotizacionDetail.jsx      # Detalle y PDF
│       ├── CotizacionStats.jsx       # Estadísticas
│       └── index.js                  # Exportaciones
├── services/
│   └── cotizacionesService.js        # Lógica de negocio
└── components/
    └── Layout.jsx                    # Menú actualizado (incluye Cotizaciones)

App.jsx                               # Rutas actualizadas
```

## 🚀 Uso del Módulo

### Acceso

El módulo está disponible en el menú lateral del dashboard:

**Cotizaciones** > 
- Cotizaciones (lista principal)
- Estadísticas (análisis y métricas)

### Crear una Cotización

1. Click en **"Nueva Cotización"** desde la lista
2. Completa los siguientes datos:

**Información de Cotización:**
- Vigencia (3, 5, 7 o 10 días)
- Tiempo de entrega

**Datos del Cliente:**
- Nombre/Empresa (requerido)
- Teléfono
- Email
- Tipo de cliente

**Productos/Servicios:**
- Click en "Agregar Producto"
- Descripción del producto
- Cantidad y unidad
- Precio unitario (se calcula el total automáticamente)
- Tipo de servicio

**Totales:**
- Subtotal (calculado automáticamente)
- Descuento (opcional)
- IVA 16% (calculado)
- Total
- Score (calculado automáticamente)

3. Guarda con:
   - **"Guardar Cotización"**: Guarda y vuelve al listado
   - **"Guardar y Generar PDF"**: Guarda y muestra el PDF

### Gestionar Cotizaciones

Desde la lista de cotizaciones puedes:

- 👁️ **Ver detalle**: Información completa y timeline
- ✏️ **Editar**: Modificar datos y productos
- 📄 **Imprimir PDF**: Generar documento profesional
- 📋 **Duplicar**: Crear copia de cotización existente
- 🗑️ **Eliminar**: Borrar cotización (con confirmación)

### Cambiar Status

En el detalle de la cotización:
1. Usa el dropdown de Status
2. Selecciona el nuevo estado:
   - **COTIZADO**: Recién creada
   - **EN_PROCESO**: Cliente interesado, en seguimiento
   - **CERRADO**: Venta confirmada ✅
   - **PERDIDO**: No se concretó

### Filtros y Búsqueda

- Usa el buscador para encontrar por **nombre de cliente** o **folio**
- Filtra por status con los botones de colores
- Exporta resultados a Excel

### Estadísticas

Accede a **Cotizaciones > Estadísticas** para ver:

- KPIs principales (total, conversión, valor, promedio)
- Gráfica de estados (pie chart)
- Servicios más cotizados (bar chart)
- Top 10 clientes por valor
- Análisis por tipo de servicio

## 📊 Sistema de Scoring

El score se calcula automáticamente basado en:

### Por Monto Total
- ≥ $20,000: +30 puntos
- ≥ $10,000: +25 puntos
- ≥ $5,000: +20 puntos
- < $5,000: +10 puntos

### Por Tipo de Cliente
- Evento/Corporativo: +15 puntos
- Negocio Nuevo: +10 puntos
- Revendedor: +5 puntos
- Cliente Final: 0 puntos

### Por Urgencia
- 24-48hrs / Express: +15 puntos
- 3-5 días: +10 puntos
- Otros: 0 puntos

### Por Cantidad de Items
- ≥ 5 productos: +10 puntos
- ≥ 3 productos: +5 puntos
- < 3 productos: 0 puntos

**Score Total:** Máximo 100 puntos

### Interpretación del Score
- 🌟 90-100: **Prioridad Alta** (verde)
- ⭐ 70-89: **Prioridad Media** (amarillo)
- • <70: **Prioridad Normal** (gris)

## 🎨 Branding y PDF

El PDF generado incluye:

- Header con logo MOMENTI
- Barra de colores corporativos (Amarillo, Magenta, Cyan)
- Información de cotización y cliente
- Tabla de productos detallada
- Totales con IVA calculado
- Condiciones comerciales
- Datos de contacto en footer

### Colores Corporativos
- Negro: #000000
- Amarillo: #FFD700
- Magenta: #FF0090
- Cyan: #00B8E6
- Gris claro: #F5F5F5

## 📱 Datos de Contacto (en PDF)

- WhatsApp: +52 614 682 2183
- Email: contacto@momentipromo.com
- Instagram: @momenticuu_
- Facebook: Momenti Imprenta y Publicidad
- Ubicación: Chihuahua, Chihuahua, México

## 🔐 Seguridad

El módulo implementa:
- Row Level Security (RLS) en Supabase
- Autenticación requerida para todas las operaciones
- Validaciones en frontend y backend
- Políticas de acceso por rol (preparado para expansión)

## 📈 Tipos de Servicio Disponibles

1. **DTF_TEXTIL**: DTF para textiles
2. **UV_DTF**: UV DTF
3. **VINIL_IMPRESO**: Vinil impreso
4. **VINIL_SUAJADO**: Vinil suajado/cortado
5. **VINIL_MICROPERFORADO**: Vinil microperforado
6. **VINIL_HOLOGRAFICO**: Vinil holográfico
7. **LONA**: Impresión en lona
8. **PAPELERIA**: Tarjetas, flyers, folders, etc.
9. **GRABADO_LASER**: Grabado láser
10. **INSTALACION**: Servicio de instalación
11. **OTRO**: Otros servicios

## 🛠️ Troubleshooting

### Error: "No se pueden cargar las cotizaciones"

**Solución:**
1. Verifica que el script SQL se haya ejecutado correctamente en Supabase
2. Revisa las políticas RLS en Supabase
3. Confirma que el usuario esté autenticado
4. Revisa la consola del navegador para errores específicos

### Error: "No se puede generar el folio"

**Solución:**
1. Verifica que el trigger `trigger_generar_folio` esté creado
2. Revisa la función `generar_folio_cotizacion()`
3. No proporciones un folio manualmente, déjalo vacío

### El PDF no se genera correctamente

**Solución:**
1. Verifica que el navegador permita popups
2. Usa Google Chrome o Edge (mejor soporte de impresión)
3. Si usas bloqueadores de ads, desactívalos temporalmente

### Errores de cálculo de totales

**Solución:**
1. Asegúrate de que los precios sean valores numéricos
2. Verifica que el IVA sea 16% (configurable en el servicio)
3. Los descuentos no pueden ser mayores al subtotal

## 🔄 Actualizaciones Futuras

Funcionalidades planeadas:
- [ ] Envío de cotización por email
- [ ] Plantillas de productos frecuentes
- [ ] Historial de cambios de status
- [ ] Recordatorios automáticos de seguimiento
- [ ] Conversión de cotización a orden de trabajo
- [ ] Dashboard predictivo con IA
- [ ] Firma digital del cliente
- [ ] Integración con WhatsApp API

## 📞 Soporte

Para problemas o dudas sobre el módulo:

1. Revisa este README
2. Consulta la documentación de Supabase
3. Revisa los comentarios en el código fuente
4. Contacta al equipo de desarrollo

## 📝 Notas Importantes

- Los folios se generan automáticamente con formato: `COT-YYYY-MM-###`
- Las cotizaciones nunca se eliminan físicamente (considera agregar soft delete)
- El IVA está fijo en 16% (modificable en `cotizacionesService.js`)
- Las condiciones comerciales están predefinidas (personalizables por cotización en notas)
- Las estadísticas se calculan del mes actual por defecto

## ✅ Checklist de Instalación

- [ ] Script SQL ejecutado en Supabase
- [ ] Tablas creadas correctamente
- [ ] Variables de entorno configuradas
- [ ] Dependencias de npm instaladas
- [ ] Servidor de desarrollo iniciado
- [ ] Login funcionando
- [ ] Menú "Cotizaciones" visible
- [ ] Crear cotización de prueba
- [ ] Generar PDF de prueba
- [ ] Verificar estadísticas

---

**Versión:** 1.0.0  
**Fecha:** Febrero 2025  
**Autor:** Equipo Momenti  
**Licencia:** Propietario
