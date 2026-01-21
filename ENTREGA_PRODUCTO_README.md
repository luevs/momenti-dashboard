# Módulo de Entrega de Producto

## Descripción
Módulo para registrar productos que los clientes dejan para personalización, con generación automática de tickets de recepción con deslinde de responsabilidad.

## Ubicación
**Ruta:** `/clientes/entrega-producto`  
**Menú:** Clientes > Entrega de Producto

## Características

### 1. Registro de Trabajos
- Búsqueda rápida de clientes por nombre o teléfono
- Selección de tipo de trabajo (DTF, Sublimación, Vinil, etc.)
- Registro de múltiples productos con:
  - Nombre del producto
  - Cantidad
  - Descripción opcional

### 2. Estados de Trabajo
Los trabajos pueden tener los siguientes estados:
- **recibido**: Producto recién recibido del cliente
- **en_proceso**: Trabajo en producción
- **completado**: Trabajo terminado, listo para entrega
- **entregado**: Producto ya entregado al cliente
- **cancelado**: Trabajo cancelado

### 3. Impresión de Tickets
Cada trabajo genera automáticamente un ticket térmico (80mm) que incluye:
- **Encabezado:** Logo de Momenti y número de folio
- **Información del cliente:** Nombre, teléfono
- **Detalles del trabajo:** Tipo y fecha
- **Listado de productos:** Tabla con productos, cantidades y descripciones
- **Deslinde de responsabilidad:** Texto legal que protege a la empresa
- **Espacio para firma:** Línea para firma del cliente

### 4. Historial de Trabajos
- Vista de trabajos recientes
- Opción de reimprimir tickets anteriores
- Filtrado por estado
- Información del cliente y folio

## Estructura de Datos

### Tabla: `entregas_producto`
```sql
- id (BIGSERIAL): Número de folio único
- customer_id (BIGINT): Referencia al cliente
- tipo_trabajo (VARCHAR): Tipo de personalización
- productos (JSONB): Array de productos [{nombre, cantidad, descripcion}]
- estado (VARCHAR): Estado del trabajo
- observaciones (TEXT): Notas adicionales
- created_at (TIMESTAMPTZ): Fecha de creación
- updated_at (TIMESTAMPTZ): Última actualización
- created_by (VARCHAR): Usuario que creó el registro
```

### Vista: `v_entregas_producto_detalle`
Vista optimizada que combina información de entregas y clientes para consultas rápidas.

## Instalación

### 1. Base de Datos
Ejecutar el script SQL en Supabase:
```bash
sql/20250121_entregas_producto.sql
```

Este script crea:
- Tabla `entregas_producto`
- Índices para optimización
- Triggers para actualización automática
- Vista `v_entregas_producto_detalle`
- Comentarios en columnas

### 2. Permisos (Opcional)
Si usas Row Level Security (RLS), descomentar las políticas en el script SQL y ajustar según tus necesidades.

## Uso

### Registrar un Nuevo Trabajo
1. Buscar el cliente escribiendo nombre o teléfono
2. Seleccionar el cliente de la lista
3. Ingresar el tipo de trabajo
4. Agregar productos uno por uno:
   - Nombre del producto
   - Cantidad
   - Descripción (opcional)
5. Hacer clic en "Guardar e Imprimir"
6. El ticket se abrirá automáticamente para impresión

### Reimprimir un Ticket
1. Localizar el trabajo en el historial
2. Hacer clic en "Reimprimir Ticket"
3. El ticket se abrirá en una nueva ventana

## Deslinde de Responsabilidad

El ticket incluye el siguiente texto legal:

> **DESLINDE DE RESPONSABILIDAD:**
> 
> El cliente entrega los productos mencionados anteriormente para su personalización bajo su propia responsabilidad. MOMENTI no se hace responsable de daños, pérdidas o defectos preexistentes en los productos entregados. El cliente acepta que los productos se encuentran en condiciones adecuadas para el trabajo solicitado.
> 
> Al firmar este documento, el cliente reconoce haber entregado los productos listados y acepta las condiciones mencionadas.

## Mejoras Futuras

### Funcionalidades Planeadas
- [ ] Notificaciones por WhatsApp al cliente cuando su trabajo esté listo
- [ ] Fotos de los productos recibidos
- [ ] Firma digital del cliente en lugar de firma física
- [ ] Integración con módulo de producción
- [ ] Cálculo de costos y cotización automática
- [ ] Tracking de estado del trabajo
- [ ] Reportes de tiempos de producción
- [ ] Exportación de datos a Excel
- [ ] Búsqueda avanzada por fecha, estado, tipo de trabajo
- [ ] Panel de estadísticas de trabajos

### Integraciones
- [ ] Conexión con módulo de Caja para registrar pagos
- [ ] Conexión con Máquinas para asignación de trabajos
- [ ] Integración con WhatsApp Business API

## Notas Técnicas

### Componentes
- **EntregaProducto.jsx**: Componente principal
- **App.jsx**: Configuración de ruta
- **Layout.jsx**: Menú de navegación

### Dependencias
- React
- Supabase Client
- lucide-react (iconos)
- react-router-dom (navegación)

### Estilos
- Tailwind CSS para todos los estilos
- Diseño responsive
- Tema consistente con el resto del dashboard

### Impresión
- Formato optimizado para impresoras térmicas de 80mm
- CSS específico para impresión (@media print)
- Apertura en nueva ventana para no interrumpir el flujo de trabajo

## Soporte
Para reportar bugs o solicitar nuevas funcionalidades, contactar al equipo de desarrollo.

---
**Versión:** 1.0  
**Fecha:** Enero 2025  
**Autor:** Sistema Momenti Dashboard
