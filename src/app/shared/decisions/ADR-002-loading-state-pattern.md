# ADR-002 — Loading State Pattern

**Status:** Accepted  
**Date:** 2026-04-23  
**Sprint:** S2.5  
**Author:** eSTOCK frontend team  

---

## Context

HR2 audit identified three incompatible loading state patterns across S2 components:

| Approach | Components | Template binding |
|---|---|---|
| `signal(false)` | `stock-ledger`, `lot-trace`, dashboard widgets | `*ngIf="isLoading()"` |
| Plain class field `isLoading = false` | `notifications-page`, `clients-list`, `client-detail` | `*ngIf="isLoading"` |
| `LoadingService.show()/hide()` | `picking-task-form`, `adjustment-form` (pre-S2) | Global overlay |

These approaches cannot be unified into a shared `SkeletonLoaderComponent` or loading directive because the template bindings differ (`isLoading()` vs `isLoading`).

---

## Decision

**Standard: `signal(false)` for all component-level loading state.**

```typescript
// Correct — signal
readonly isLoading = signal(false);

async load(): Promise<void> {
  this.isLoading.set(true);
  try {
    this.data.set(await this.service.getAll());
  } finally {
    this.isLoading.set(false);
  }
}
```

```html
<!-- Template -->
<div *ngIf="isLoading()" class="...skeleton..."></div>
<div *ngIf="!isLoading()"><!-- content --></div>
```

### Rules

1. **New components MUST use `readonly isLoading = signal(false)`.**
2. **`LoadingService.show()/hide()` is deprecated** for new components. It remains in pre-S2 components only. Do not call it in new code.
3. **For multiple independent loading states** (e.g., loading list + loading detail simultaneously), use separate signals:

   ```typescript
   readonly isLoadingList = signal(false);
   readonly isLoadingDetail = signal(false);
   ```

4. **Derived loading state** (any of N is loading) uses `computed()`:

   ```typescript
   readonly isAnyLoading = computed(() => this.isLoadingList() || this.isLoadingDetail());
   ```

5. **Always use `try/finally`** to guarantee `isLoading.set(false)` is called even on error.

---

## Consequences

### Positive
- Single template binding pattern (`isLoading()`) enables a future `<app-skeleton>` directive that checks a `loading` input.
- `signal(false)` is reactive without manual `ChangeDetectorRef` calls.
- OnPush components benefit automatically from signal reactivity.

### Negative / Trade-offs
- Requires updating pre-S2 components that use plain fields (deferred to S3 or opportunistically).
- `LoadingService` cannot be removed until all pre-S2 callsites are migrated.

---

## Migration Debt

Components using plain `isLoading = false` (plain field) — deferred to S3:
- `notifications-page.component.ts`
- `clients-list.component.ts`
- `client-detail.component.ts`

Components using `LoadingService` — DO NOT migrate unless component is being substantially rewritten:
- `picking-task-form.component.ts`
- `adjustment-form.component.ts`
- `receiving-task-form.component.ts`

**No migration in this wave — document only.**

---

## Alternatives Considered

- **Plain class field `isLoading = false`** — rejected. Not reactive; requires `ChangeDetectorRef.markForCheck()` in OnPush components and produces inconsistent template bindings.
- **`BehaviorSubject<boolean>`** — rejected. RxJS not used in components per project pattern (see `feedback_estock_frontend_service_pattern.md`). Requires `async` pipe and adds subscription lifecycle complexity.
- **`LoadingService` as standard** — rejected. Global overlay is disruptive UX for micro-loading states (e.g., loading a single widget). Component-local signals are more granular.
