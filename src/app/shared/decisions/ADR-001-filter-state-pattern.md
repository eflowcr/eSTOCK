# ADR-001 — Filter State Pattern

**Status:** Accepted  
**Date:** 2026-04-23  
**Sprint:** S2.5  
**Author:** eSTOCK frontend team  

---

## Context

Sprint S2 introduced multiple list views with user-editable filter forms. HR2 audit identified three incompatible approaches across sibling views:

| Component | Approach | Persists across navigation? |
|---|---|---|
| `stock-ledger` | Plain class fields + `computed()` signals | No |
| `notifications-page` | Plain class fields, no signals | No |
| `clients-list` | Plain class fields | No |
| `inventory-list` | Signals + `localStorage` persistence | Yes |

A developer adding a new list view has no standard to follow. The inconsistency prevents future extraction into a shared filter directive/mixin.

---

## Decision

**Standard: `signal()` for all filter state, with `localStorage` persistence for non-trivial filters.**

### Rules

1. **Filter values MUST be declared as Angular `signal()`** — not plain class fields.

   ```typescript
   // Correct
   readonly skuFilter = signal('');
   readonly typeFilter = signal<MovementType | ''>('');
   readonly fromDate = signal('');

   // Wrong — plain field
   skuFilter = '';
   ```

2. **`computed()` for derived filtered lists** — derive filtered results from signals, not from imperative filter methods.

   ```typescript
   readonly filteredMovements = computed(() =>
     this.allMovements().filter(mv => {
       const sku = this.skuFilter();
       return !sku || mv.sku.includes(sku);
     })
   );
   ```

3. **`localStorage` persistence for any filter that a user would expect to survive navigation.** Use the component selector as the key prefix:

   ```typescript
   private readonly STORAGE_KEY = 'estock.stock-ledger.filters';

   private saveFilters(): void {
     localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
       sku: this.skuFilter(),
       type: this.typeFilter(),
       from: this.fromDate(),
     }));
   }
   ```

4. **Reset filter to default on explicit user action only** — do not reset on navigation. Add a "Clear filters" button whenever localStorage persistence is used.

---

## Consequences

### Positive
- Consistent DX: new list views have a clear template to follow.
- Enables future extraction of a `FilterStateBase` class or mixin.
- localStorage persistence improves UX for power users (e.g., warehouse operators who navigate away frequently).
- Signals integrate naturally with Angular's change detection (no `ChangeDetectorRef.markForCheck()`).

### Negative / Trade-offs
- Filter state in localStorage can become stale if schema changes (add version key to STORAGE_KEY).
- `signal()` pattern requires Angular 16+. This project already requires Angular 17+, so no constraint.

---

## Migration Debt

The following components use plain class fields for filter state and are deferred to S3:
- `notifications-page.component.ts` — `readFilter`, `eventTypeFilter` (plain fields)
- `clients-list.component.ts` — `search`, `statusFilter` (plain fields)
- `stock-ledger.component.ts` — `skuFilter`, `typeFilter`, `fromDate`, `toDate` (mixed: signals via `computed()` but not all signal-based)

**No migration in this wave — document only. S3 backlog item.**

---

## Alternatives Considered

- **RxJS BehaviorSubject** — rejected. Project memory (`feedback_estock_frontend_service_pattern.md`) confirms services use Promise, not RxJS. Adding BehaviorSubject to components creates split patterns.
- **Plain class fields without signals** — rejected. Not reactive; prevents computed() usage and future OnPush optimizations.
- **State management library (NgRx, Akita)** — rejected. Overkill for MVP scope; reintroduce if component count exceeds 30 list views.
