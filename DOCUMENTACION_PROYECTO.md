# eSTOCK - Documentación Completa del Sistema

## Información General del Proyecto

**Nombre:** eSTOCK - Sistema de Gestión de Inventario  
**Versión:** 1.0.0  
**Framework:** Angular 20.1.0  
**Tecnologías:** TypeScript, TailwindCSS, RxJS, Angular Material  
**Arquitectura:** Single Page Application (SPA) con componentes standalone  

### Librerías Principales
- **QRCode & JsBarcode:** Generación de códigos de barras y QR
- **jsPDF:** Generación de documentos PDF
- **XLSX:** Importación/exportación de archivos Excel
- **TailwindCSS:** Framework de estilos utilitarios
- **Angular Material:** Componentes de UI

---

## Arquitectura del Sistema

### Estructura de Directorios
```
src/app/
├── components/          # Componentes de la aplicación
│   ├── layout/         # Componentes de diseño (sidebar, topbar)
│   ├── login/          # Sistema de autenticación
│   ├── dashboard/      # Panel principal y widgets
│   ├── users/          # Gestión de usuarios
│   ├── locations/      # Gestión de ubicaciones
│   ├── inventory/      # Gestión de inventario
│   ├── articles/       # Maestro de artículos/SKUs
│   ├── receiving-tasks/ # Tareas de recepción
│   ├── picking-tasks/  # Tareas de picking
│   ├── adjustments/    # Ajustes de inventario
│   ├── stock-alerts/   # Alertas de stock
│   ├── barcode-generator/ # Generador de códigos
│   ├── gamification/   # Sistema de gamificación
│   └── shared/         # Componentes compartidos
├── services/           # Servicios de datos y lógica
├── models/            # Modelos de datos TypeScript
├── guards/            # Guards de autenticación
├── interceptors/      # Interceptores HTTP
└── utils/             # Utilidades y helpers
```

### Patrones de Diseño
- **Componentes Standalone:** Todos los componentes son independientes
- **Lazy Loading:** Carga diferida de módulos para optimización
- **Reactive Forms:** Formularios reactivos con validaciones
- **Service Pattern:** Servicios para lógica de negocio y API calls
- **Guard Pattern:** Protección de rutas con AuthGuard y NoAuthGuard

---

## Pantallas del Sistema

### 1. Pantalla de Login (`/login`)

**Componente:** `LoginComponent`  
**Ruta:** `/login`  
**Acceso:** Solo usuarios no autenticados

#### Funcionalidades:
- **Login de Usuario:** Autenticación con email y contraseña
- **Registro de Usuario:** Creación de nuevas cuentas (rol operador por defecto)
- **Cambio de Idioma:** Selector de idioma (español/inglés)
- **Validaciones:** Email válido, campos requeridos

#### Características Técnicas:
- Formularios reactivos con validaciones
- Manejo de errores con AlertService
- Integración con AuthService y UserService
- Responsive design con TailwindCSS
- Toggles para mostrar/ocultar contraseñas

---

### 2. Dashboard Principal (`/dashboard`)

**Componente:** `DashboardComponent`  
**Ruta:** `/dashboard`  
**Acceso:** Usuarios autenticados

#### Widgets y Componentes:
1. **KPI Cards:** Métricas principales del inventario
2. **Activity Feed:** Feed de actividades recientes
3. **Movement Chart:** Gráfico de movimientos de inventario
4. **Stock Alerts Widget:** Alertas de stock bajo

#### Funcionalidades:
- **Vista General:** Resumen ejecutivo del estado del inventario
- **Métricas en Tiempo Real:** KPIs actualizados automáticamente
- **Navegación Rápida:** Acceso directo a módulos principales
- **Alertas Visuales:** Notificaciones de stock crítico

#### Layout:
- **Header:** Topbar con búsqueda global y perfil de usuario
- **Sidebar:** Navegación principal con iconos
- **Content Area:** Widgets organizados en grid responsive
- **Footer:** Información de versión y enlaces

---

### 3. Gestión de Usuarios (`/users`)

**Componente:** `UserManagementComponent`  
**Ruta:** `/users`  
**Acceso:** Usuarios autenticados

#### Sub-componentes:
- `UserListComponent`: Lista de usuarios con filtros
- `UserFormComponent`: Formulario CRUD de usuarios
- `PasswordChangeComponent`: Cambio de contraseñas

#### Funcionalidades:
- **CRUD Completo:** Crear, leer, actualizar, eliminar usuarios
- **Gestión de Roles:** Admin y Operator
- **Cambio de Contraseñas:** Modal independiente para administradores
- **Búsqueda:** Por nombre, apellido, email
- **Import/Export:** Archivos Excel con plantillas

---

### 4. Gestión de Ubicaciones (`/locations`)

**Componente:** `LocationManagementComponent`  
**Ruta:** `/locations`  
**Acceso:** Usuarios autenticados

#### Sub-componentes:
- `LocationListComponent`: Lista con filtros expandibles
- `LocationFormComponent`: Formulario modal para CRUD

#### Funcionalidades:
- **CRUD de Ubicaciones:** Gestión completa de ubicaciones de almacén
- **Tipos de Ubicación:** PALLET, SHELF, BIN, FLOOR, BLOCK
- **Filtros Expandibles:** Por tipo, zona, estado (card expandible)
- **Búsqueda Inteligente:** Por código, descripción, zona
- **Validaciones:** Código único, campos requeridos
- **Import/Export:** Plantilla ImportLocations.xlsx

#### Características UI:
- Modal de visualización con información completa
- Modal de confirmación para eliminaciones
- Badges de colores para tipos y estados
- Botones de acción neutros con hover effects

---

### 5. Gestión de Inventario (`/inventory`)

**Componente:** `InventoryManagementComponent`  
**Ruta:** `/inventory`  
**Acceso:** Usuarios autenticados

#### Sub-componentes:
- `InventoryListComponent`: Lista principal con filtros
- `InventoryFormComponent`: Formulario amplio para CRUD

#### Funcionalidades:
- **Gestión Completa:** CRUD de items de inventario
- **Rastreo Avanzado:** Por lote, serie, fecha de expiración
- **Filtros Múltiples:** Estado, ubicación, presentación, tipo de rastreo
- **Búsqueda:** Por SKU, nombre, ubicación
- **Import/Export:** Integración con archivos Excel

---

### 6. Maestro de Artículos (`/articles`)

**Componente:** `ArticleManagementComponent`  
**Ruta:** `/articles`  
**Acceso:** Usuarios autenticados

#### Funcionalidades:
- **Maestro de SKUs:** Catálogo central de productos
- **Configuración de Rastreo:** Definición de políticas por SKU
- **Precios y Presentaciones:** Gestión de información comercial
- **Límites de Stock:** Configuración de mínimos y máximos
- **Import/Export:** Plantilla ImportArticles.xlsx

#### Campos de Artículo:
- **SKU:** Código único del producto
- **Información:** Nombre, descripción, imagen
- **Comercial:** Precio unitario, presentación
- **Rastreo:** Configuración de seguimiento (lote/serie/expiración)
- **Stock:** Límites mínimo y máximo
- **Estado:** Activo/inactivo

---

### 7. Tareas de Recepción (`/receiving-tasks`)

**Componente:** `ReceivingTaskManagementComponent`  
**Ruta:** `/receiving-tasks`  
**Acceso:** Usuarios autenticados

#### Sub-componentes:
- `ReceivingTaskListComponent`: Lista de tareas
- `ReceivingTaskFormComponent`: Formulario con dropdowns avanzados

#### Funcionalidades:
- **Gestión de Recepciones:** Control de mercancía entrante
- **Asignación de Operadores:** Dropdown con validaciones
- **Selección de SKUs:** Dropdown inteligente con búsqueda
- **Ubicaciones:** Asignación automática o manual
- **Estados:** Pendiente, en progreso, completada, cancelada
- **Validaciones Avanzadas:** Campos requeridos con feedback visual

---

### 8. Tareas de Picking (`/picking-tasks`)

**Componente:** `PickingTaskManagementComponent`  
**Ruta:** `/picking-tasks`  
**Acceso:** Usuarios autenticados

#### Funcionalidades:
- **Gestión de Picking:** Control de mercancía saliente
- **Rutas Optimizadas:** Sugerencias de rutas de picking
- **Validación de Stock:** Verificación de disponibilidad
- **Estados de Tarea:** Workflow completo de picking
- **Dropdowns Consistentes:** Mismo patrón que receiving-tasks

#### Características:
- Misma estructura UI que receiving-tasks
- Validaciones avanzadas con feedback visual
- Integración con sistema de inventario
- Reportes de productividad

---

### 9. Ajustes de Inventario (`/stock-adjustments`)

**Componente:** `AdjustmentManagementComponent`  
**Ruta:** `/stock-adjustments`  
**Acceso:** Usuarios autenticados

#### Funcionalidades:
- **Ajustes de Stock:** Correcciones de inventario
- **Tipos de Ajuste:** Entrada, salida, corrección, merma
- **Razones de Ajuste:** Catálogo de motivos
- **Aprobaciones:** Workflow de autorización
- **Auditoría:** Trazabilidad completa de cambios

---

### 10. Alertas de Stock (`/stock-alerts`)

**Componente:** `StockAlertsManagementComponent`  
**Ruta:** `/stock-alerts`  
**Acceso:** Usuarios autenticados

#### Funcionalidades:
- **Alertas Automáticas:** Stock bajo, sobrestock, expiración
- **Configuración:** Umbrales personalizables
- **Notificaciones:** Email y sistema interno
- **Dashboard:** Vista consolidada de alertas activas

---

### 11. Generador de Códigos de Barras (`/barcode-generator`)

**Componente:** `BarcodeGeneratorManagementComponent`  
**Ruta:** `/barcode-generator`  
**Acceso:** Usuarios autenticados

#### Sub-componentes:
- `BarcodeGeneratorDialogComponent`: Modal principal
- `BarcodeDisplayComponent`: Visualización de códigos

#### Funcionalidades:
- **Tipos de Código:** QR, Code128, EAN-13
- **Generación Masiva:** Selección múltiple de items
- **Preview en Tiempo Real:** Vista previa de primeros 4 items
- **Formatos de Etiqueta:** 4x2, 2x1, 3x1 pulgadas
- **Exportación PDF:** Generación optimizada sin cortes
- **Prioridades:** Normal, urgente

#### Características Técnicas:
- **Librerías:** QRCode.js y JsBarcode
- **Canvas Rendering:** Renderizado real de códigos
- **PDF Generation:** jsPDF con dimensiones precisas
- **Signal-based:** Estado reactivo con Angular Signals
- **Error Handling:** Fallbacks para códigos fallidos

#### Workflow:
1. Selección de items de inventario
2. Configuración de formato y prioridad
3. Preview de códigos generados
4. Impresión o descarga de PDF

---

### 12. Sistema de Gamificación (`/gamification`)

**Componente:** `GamificationManagementComponent`  
**Ruta:** `/gamification`  
**Acceso:** Usuarios autenticados

#### Sub-componentes:
- `GamificationPanelComponent`: Panel de usuario

#### Funcionalidades:
- **Sistema de Puntos:** Recompensas por productividad
- **Badges y Logros:** Reconocimientos por metas
- **Leaderboards:** Rankings de rendimiento
- **Desafíos:** Metas individuales y grupales

---

### 13. Centro de Control Admin (`/admin-control-center`)

**Componente:** `AdminControlCenterListComponent`  
**Ruta:** `/admin-control-center`  
**Acceso:** Usuarios autenticados

#### Funcionalidades:
- **Configuración Global:** Parámetros del sistema
- **Monitoreo:** Métricas de rendimiento
- **Logs del Sistema:** Auditoría de actividades
- **Mantenimiento:** Herramientas administrativas

---

## Componentes de Layout

### Topbar Component
**Funcionalidades:**
- **Búsqueda Global:** Busca todo lo del sidebar
- **Perfil de Usuario:** Datos del usuario
- **Avatar Personalizado:** Círculo con iniciales
- **Badge de Rol:** Colores específicos por tipo de usuario
- **Menú de Usuario:** Ver perfil, configuración, cerrar sesión

### Sidebar Component
**Funcionalidades:**
- **Navegación Principal:** Iconos y enlaces a módulos
- **Responsive Design:** Colapsible en móviles
- **Estados Activos:** Highlighting de sección actual
- **Organización:** Agrupación lógica de funcionalidades

### Main Layout Component
**Funcionalidades:**
- **Layout Wrapper:** Estructura principal de la aplicación
- **Responsive Grid:** Adaptación a diferentes pantallas
- **Dark Mode Support:** Soporte completo para modo oscuro

---

## Sistemas Transversales

### Sistema de Alertas
**Características:**
- **Posición:** Esquina inferior derecha
- **Tipos:** Success, error, warning, info
- **Apilamiento:** Nuevas alertas empujan hacia arriba
- **Auto-dismiss:** Cierre automático configurable
- **Responsive:** Adaptación a móviles

### Sistema de Loading
**Características:**
- **Spinner Global:** Activación automática en peticiones HTTP
- **Loading Interceptor:** Intercepta todas las llamadas API
- **Control Manual:** LoadingService para casos específicos
- **Contador de Peticiones:** Manejo de múltiples requests simultáneos

### Sistema de Traducciones
**Características:**
- **Multiidioma:** Español e inglés
- **LanguageService:** Servicio centralizado
- **Interpolación:** Soporte para parámetros dinámicos
- **Fallbacks:** Valores por defecto para claves faltantes

### Sistema de Permisos
**Características:**
- **Guards de Ruta:** AuthGuard y NoAuthGuard
- **Roles de Usuario:** Admin, Manager, Supervisor, User, Operator
- **Permisos Granulares:** Control por funcionalidad
- **UI Condicional:** Elementos basados en permisos

---

## Características Técnicas Destacadas

### Performance
- **Lazy Loading:** Carga diferida de componentes
- **OnPush Strategy:** Optimización de change detection
- **TrackBy Functions:** Optimización de listas
- **Debounce:** Búsquedas con retraso para performance

### UX/UI
- **Responsive Design:** Adaptación completa a móviles
- **Dark Mode:** Soporte completo para modo oscuro
- **Animations:** Transiciones suaves con TailwindCSS
- **Accessibility:** Cumplimiento de estándares WCAG

### Security
- **JWT Authentication:** Tokens seguros para autenticación
- **Route Guards:** Protección de rutas sensibles
- **Role-based Access:** Control granular de permisos
- **Input Validation:** Validaciones frontend y backend

### Maintainability
- **TypeScript:** Tipado fuerte para mejor mantenibilidad
- **Standalone Components:** Arquitectura modular
- **Service Pattern:** Separación de responsabilidades
- **Consistent Patterns:** Patrones uniformes en toda la aplicación

---

## Conclusión

eSTOCK es un sistema completo de gestión de inventario construido con Angular 20, que ofrece una experiencia de usuario moderna y funcionalidades avanzadas para la gestión de almacenes. El sistema está diseñado con patrones de desarrollo actuales, optimización de performance y una arquitectura escalable que facilita el mantenimiento y la extensión de funcionalidades.

La aplicación cubre todos los aspectos críticos de la gestión de inventario, desde el control de usuarios y ubicaciones hasta la generación de códigos de barras y sistemas de gamificación, proporcionando una solución integral para empresas que requieren un control preciso de su inventario.
