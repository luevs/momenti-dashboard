# Mejoras Dashboard Clientes Lealtad

## 📋 Resumen de Cambios

Se han implementado mejoras significativas en el módulo de Clientes de Lealtad para proporcionar mejor organización, análisis por producto y seguimiento temporal de movimientos.

---

## ✨ Nuevas Funcionalidades

### 1. **Métricas por Producto**

#### Tarjetas de Análisis por Tipo
Se agregaron dos tarjetas visuales que muestran métricas específicas para cada tipo de programa:

- **DTF Textil**
  - Metros totales vendidos
  - Metros consumidos
  - Metros disponibles
  - Número de programas activos
  - Barra de progreso visual

- **UV DTF**
  - Mismas métricas que DTF Textil
  - Diseño diferenciado por color

#### Estadísticas Mejoradas
```javascript
loyaltyStats: {
  // Métricas generales
  activeCustomers: number,
  inactiveCustomers: number,
  activePrograms: number,
  
  // Métricas por producto
  dtfMeters: {
    total: number,
    consumed: number,
    available: number,
    activePrograms: number
  },
  uvMeters: {
    total: number,
    consumed: number,
    available: number,
    activePrograms: number
  }
}
```

---

### 2. **Vista de Movimientos por Período**

#### Panel de Movimientos
Nuevo panel expansible que muestra movimientos filtrados por período:

**Períodos disponibles:**
- Hoy
- Ayer
- Semana (últimos 7 días)
- Mes (últimos 30 días)
- Todo

#### Estadísticas de Movimientos
Tarjetas que muestran:
- Total de movimientos en el período
- Metros totales consumidos
- Metros DTF Textil consumidos
- Metros UV DTF consumidos
- Clientes únicos que realizaron pedidos

#### Tabla de Movimientos
Lista detallada con:
- Fecha y hora (UTC)
- Cliente
- Tipo de programa
- Folio del programa
- Metros consumidos
- Quién registró el movimiento

**Características:**
- Scroll vertical con encabezados fijos
- Altura máxima de 384px
- Hover effects
- Badges de color por tipo

---

### 3. **Filtro de Clientes Inactivos**

#### Nuevo Estado de Filtro
Se agregó la opción **"Sin Programas Activos"** al filtro de estado:

```javascript
Filtros de Estado:
- Todos
- Activos
- Históricos
- Sin Programas Activos  // ← NUEVO
```

**Funcionalidad:**
- Muestra clientes que NO tienen ningún programa activo con metros > 0
- Útil para identificar clientes que necesitan renovación
- Contador visual del número de clientes inactivos

**Lógica de filtrado:**
```javascript
if (statusFilter === 'Sin Programas Activos') {
  // Retorna solo clientes sin programas activos
  return !hasActiveProgram;
}
```

---

### 4. **Componente Reutilizable: LoyaltyMovementsPanel**

Se creó un componente independiente que puede ser usado en otros módulos del dashboard.

#### Ubicación
```
src/components/LoyaltyMovementsPanel.jsx
```

#### Props
```javascript
<LoyaltyMovementsPanel 
  formatDate={formatDateFunction}  // Función para formatear fechas
  initialPeriod="hoy"             // Período inicial: 'hoy', 'ayer', 'semana', 'mes', 'todo'
  showExport={true}               // Mostrar botón de exportar
  className=""                    // Clases CSS adicionales
/>
```

#### Casos de Uso
Este componente puede ser utilizado en:
- Dashboard principal de ventas
- Reportes de producción
- Análisis de consumo por período
- Página de estadísticas gerenciales
- Cualquier módulo que necesite visualizar movimientos temporales

#### Ejemplo de Uso
```javascript
import LoyaltyMovementsPanel from '../components/LoyaltyMovementsPanel';
import { formatDate } from '../utils/dateUtils';

function MyDashboard() {
  return (
    <div>
      <h1>Dashboard Personalizado</h1>
      
      <LoyaltyMovementsPanel 
        formatDate={formatDate}
        initialPeriod="semana"
        showExport={true}
        className="my-4"
      />
    </div>
  );
}
```

---

## 🎨 Mejoras Visuales

### Diseño del Dashboard

1. **Header Reorganizado**
   - Botón de Movimientos destacado
   - Íconos consistentes
   - Estados visuales (activo/inactivo)

2. **Tarjetas de Resumen**
   - Descripción actualizada con clientes inactivos
   - Formato de números con separadores de miles

3. **Tarjetas de Producto**
   - Grid responsivo (2 columnas en desktop)
   - Barras de progreso animadas
   - Badges con número de programas activos
   - Colores diferenciados:
     - DTF Textil: Cyan
     - UV DTF: Indigo

4. **Panel de Movimientos**
   - Fondo gradiente (blue-50 → indigo-50)
   - Bordes con sombras suaves
   - Tarjetas de estadísticas con bordes de color
   - Tabla con scroll y headers fijos

---

## 📊 Datos Exportables

### Exportación de Movimientos
El componente `LoyaltyMovementsPanel` incluye exportación a Excel con:

**Columnas exportadas:**
- Fecha
- Cliente
- Tipo
- Folio Programa
- Metros Consumidos
- Metros Restantes
- Registrado Por
- Observaciones

**Nombre del archivo:**
```
movimientos_lealtad_{periodo}_{fecha}.xlsx
```

Ejemplo: `movimientos_lealtad_semana_2026-04-16.xlsx`

---

## 🔧 Funciones Nuevas

### 1. `fetchMovementsByPeriod(period)`
Obtiene movimientos de la base de datos filtrados por período.

**Parámetros:**
- `period`: string - 'hoy', 'ayer', 'semana', 'mes', 'todo'

**Retorna:**
- Array de objetos con movimientos

**Consulta SQL:**
```javascript
// Ejemplo para "semana"
supabase
  .from('order_history')
  .select('*')
  .gte('recorded_at', hace7Dias.toISOString())
  .order('recorded_at', { ascending: false })
```

### 2. `movementsStats` (useMemo)
Calcula estadísticas agregadas de los movimientos actuales.

**Retorna:**
```javascript
{
  totalMovements: number,
  totalMetersConsumed: number,
  dtfMetersConsumed: number,
  uvMetersConsumed: number,
  uniqueClients: number
}
```

### 3. `loyaltyStats` (actualizado)
Agregadas métricas por producto y clientes inactivos.

---

## 🗂️ Estructura de Estados

### Nuevos Estados
```javascript
// Filtros temporales
const [periodFilter, setPeriodFilter] = useState('hoy');
const [showMovementsPanel, setShowMovementsPanel] = useState(false);
const [movementsData, setMovementsData] = useState([]);
```

### Estados Actualizados
```javascript
// statusFilter ahora incluye 'Sin Programas Activos'
const [statusFilter, setStatusFilter] = useState('Todos');
// Opciones: 'Todos', 'Activos', 'Históricos', 'Sin Programas Activos'
```

---

## 🎯 Mejores Prácticas

### Rendimiento
- Uso de `useMemo` para cálculos costosos
- Consultas optimizadas con índices de fecha
- Tabla con scroll virtual para grandes datasets

### UX
- Loading states en todas las operaciones asíncronas
- Estados vacíos con mensajes amigables
- Feedback visual inmediato en filtros

### Accesibilidad
- Labels semánticos
- Contraste de colores WCAG AA
- Navegación por teclado en filtros

---

## 📈 Casos de Uso Empresariales

### 1. Análisis de Consumo Diario
**Objetivo:** Monitorear actividad del día
**Cómo:** Usar panel de movimientos con período "Hoy"
**Beneficio:** Identificar picos de demanda en tiempo real

### 2. Planificación de Renovaciones
**Objetivo:** Contactar clientes sin programas activos
**Cómo:** Filtrar por "Sin Programas Activos"
**Beneficio:** Lista de clientes para campañas de re-engagement

### 3. Comparación de Productos
**Objetivo:** Evaluar popularidad DTF vs UV DTF
**Cómo:** Revisar tarjetas de métricas por producto
**Beneficio:** Decisiones informadas de inventario y pricing

### 4. Reportes Semanales
**Objetivo:** Presentar estadísticas a gerencia
**Cómo:** Exportar movimientos de "Semana" a Excel
**Beneficio:** Reportes profesionales automatizados

---

## 🚀 Próximos Pasos Sugeridos

### Corto Plazo
- [ ] Agregar gráficas de tendencias (Chart.js)
- [ ] Notificaciones push para clientes inactivos
- [ ] Comparación período anterior vs actual

### Mediano Plazo
- [ ] Dashboard ejecutivo con `LoyaltyMovementsPanel`
- [ ] Predicción de consumo con ML
- [ ] API pública para integraciones

### Largo Plazo
- [ ] App móvil con mismas métricas
- [ ] Sistema de recompensas gamificado
- [ ] BI avanzado con Metabase/Superset

---

## 📝 Notas Técnicas

### Zona Horaria
Todos los timestamps se manejan en **UTC** para consistencia.

**Conversión en UI:**
```javascript
formatDate(record.recorded_at, { useUTC: true })
```

### Tabla de Base de Datos
El componente consulta la tabla `order_history` que debe tener:
- `id`: UUID/integer
- `customer_id`: FK a customers
- `client_name`: string
- `type`: 'DTF Textil' | 'UV DTF'
- `program_folio`: string
- `meters_consumed`: numeric
- `remaining_meters`: numeric
- `recorded_by`: string
- `recorded_at`: timestamp (UTC)
- `observaciones`: text

### Migraciones
Si `order_history` no existe, asegurarse de que existe `loyalty_programs_history` y actualizar las consultas en:
- `fetchMovementsByPeriod()`
- `LoyaltyMovementsPanel.jsx`

---

## 🐛 Troubleshooting

### Panel no muestra datos
**Problema:** Panel vacío incluso con movimientos en BD
**Solución:** Verificar nombre de tabla en consulta Supabase

### Filtro de inactivos no funciona
**Problema:** Muestra clientes con programas activos
**Solución:** Verificar que la lógica considera `remaining_meters > 0`

### Exportación falla
**Problema:** Error al exportar Excel
**Solución:** Verificar que `xlsx` y `file-saver` estén instalados

```bash
npm install xlsx file-saver
```

---

## 👥 Contribuciones

Este módulo fue mejorado para facilitar análisis de negocio y toma de decisiones data-driven. El componente `LoyaltyMovementsPanel` está diseñado para ser reutilizado en múltiples contextos.

**Autor:** GitHub Copilot  
**Fecha:** 16 de Abril, 2026  
**Versión:** 2.0.0
