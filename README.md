# eSTOCK Frontend

Stack: Angular 17+ standalone components · Signals · SCSS · Karma/Jasmine

## Features (post-Sprint S1)

- Login + auth guards: `NoAuthGuard`, `AuthGuard`, `AdminGuard`, `PermissionGuard`
- **Forgot password UI** (S1): link en login, componente `forgot-password` con confirmación genérica, componente `reset-password` con validación de match + toggle show/hide, rutas con `NoAuthGuard`, 22 traducciones es/en
- Receiving tasks: lista + form con `FormArray` anidado de lotes, validación suma = `expected_qty`, R3 auto-sugerencia de última location usada por SKU
- **Picking tasks** (S1): lista + form con `FormArray` anidado de `allocations`, FEFO prefill cross-location, indicador `available_qty` por allocation con color-coding, botón "Iniciar picking" para lazy reservation
- Badge ámbar para status `completed_with_differences` en receiving list (S1)
- Dashboard, inventory, articles, locations, stock-alerts, stock-transfers, stock-adjustments
- Gamification, audit logs, settings, role management, barcode generator
- Internacionalización es/en (ngx-translate)

## Quick start

### Prerequisites

- Node 20+
- Angular CLI: `npm install -g @angular/cli`

### Setup

```bash
npm install
ng serve   # http://localhost:4200
```

### Env / config

| Archivo | Uso |
|---|---|
| `src/environments/environment.ts` | Dev — `ng serve` |
| `src/environments/environment.prod.ts` | Prod — `ng build --configuration=production` |

`environment.API.BASE` — ajustar a la URL del backend según deploy.

## Routes

| Path | Componente | Guard | Notas |
|---|---|---|---|
| `/login` | LoginComponent | NoAuthGuard | |
| `/forgot-password` | ForgotPasswordComponent | NoAuthGuard | **S1** |
| `/reset-password` | ResetPasswordComponent | NoAuthGuard | **S1** — recibe `?token=X` |
| `/dashboard` | Dashboard | AuthGuard | |
| `/inventory` | Inventory | AuthGuard | |
| `/articles` | Articles | AuthGuard | |
| `/locations` | Locations | AuthGuard | |
| `/receiving-tasks` | ReceivingTasks | AuthGuard | |
| `/picking-tasks` | PickingTasks | AuthGuard | |
| `/stock-alerts` | StockAlerts | AuthGuard | |
| `/stock-transfers` | StockTransfers | AuthGuard | |
| `/stock-adjustments` | StockAdjustments | AuthGuard | |
| `/roles` | Roles | AdminGuard | |
| `/users` | Users | AdminGuard | |
| `/settings` | Settings | AdminGuard | **S1 fix**: antes sin AdminGuard |
| `/gamification` | Gamification | AuthGuard | |
| `/barcode-generator` | BarcodeGenerator | AuthGuard | |

## Modelos TS clave (post-S1)

### `LotEntry` — `src/app/models/lot-entry.model.ts`

```typescript
interface LotEntry {
  lot_number: string;
  sku?: string;
  quantity: number;
  expiration_date?: string;   // "YYYY-MM-DD"
  manufactured_date?: string; // "YYYY-MM-DD" — S2
  status?: 'pending' | 'picked' | 'received' | 'skipped' | string;
}
```

### `LocationAllocation` — `src/app/models/lot-entry.model.ts`

```typescript
interface LocationAllocation {
  location: string;
  quantity: number;
  lot_number?: string;
  picked_qty?: number;
  status?: 'pending' | 'picked' | 'skipped' | string;
  expiration_date?: string;  // display-only, no se envía al backend
}
```

### `PickSuggestionResponse` — `src/app/models/pick-suggestion.model.ts`

```typescript
interface PickSuggestionResponse {
  allocations: AllocationSuggestion[];
  total_found: number;
  requested: number;
  sufficient: boolean;
}
```

Nota: `requested` en el modelo TS (no `requested_qty`). El campo `PickSuggestion` original está `@deprecated` — se mantiene para fallback legacy.

### `Inventory` — `src/app/models/inventory.model.ts`

Campos agregados en S1:
```typescript
reserved_qty?: number;   // cantidad reservada por pickings in_progress
available_qty?: number;  // quantity - reserved_qty (calculado en backend)
```

### Status union types

```typescript
type ReceivingTaskStatus = 'open' | 'in_progress' | 'completed' | 'completed_with_differences' | 'cancelled';
type PickingTaskStatus   = ReceivingTaskStatus | 'assigned' | 'abandoned';
```

## Breaking changes S1

### 1. Receiving lifecycle: `in_progress` requerido antes de `completed`

`open → in_progress → completed | completed_with_differences`. No hay `open → completed` directo.

UI: botón "Iniciar recepción" en el modal de detalle de tarea. Backend: `PATCH /receiving-tasks/:id` con `{status: 'in_progress'}`.

### 2. Picking lifecycle: `StartPickingTask` requerido para reservar stock

UI: botón "Iniciar picking" en el form de detalle. Backend: `POST /picking-tasks/:id/start` — aplica las reservas lazy sobre el stock.

### 3. `PickingTaskItem.allocations` reemplaza `.location`

El campo `location: string` del item de picking fue reemplazado por `allocations: LocationAllocation[]`. El parser backend (legacy retrocompat) acepta el formato viejo; el frontend genera siempre el nuevo formato.

### 4. `resetPassword` envía snake_case al backend

`AuthService.resetPassword(token, newPassword)` envía `{ token, new_password: newPassword }`. El contrato del backend es snake_case.

### 5. `GET /inventory/pick-suggestions/:sku?qty=N`

La query string `?qty=N` es requerida. La respuesta es `PickSuggestionResponse`, no un array de lotes.

## Tests

```bash
ng test                    # Karma/Jasmine interactivo
npm run test:ci            # headless (para CI)
ng build                   # verifica compilación
```

El CI corre `npm run test:ci` en cada push. 378/378 tests PASS al cierre de S1.

## Troubleshooting

| Problema | Fix |
|---|---|
| `Cannot find control with name: '0'` en form | Falta `formArrayName="items"` en el template wrapper del FormArray |
| Tests fallan post-merge | Mock desactualizado — revisar specs del service afectado y actualizar el stub de respuesta |
| Reset password redirige a login pero no envía email | En dev, el backend loguea el email a stdout en lugar de enviarlo (sin `RESEND_API_KEY`) |
| Operadores ven Settings en nav | Verificar que `navigation.service` tiene `adminOnly: true` en el item de settings |
