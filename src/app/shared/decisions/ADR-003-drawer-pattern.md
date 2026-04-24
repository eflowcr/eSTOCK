# ADR-003 — Drawer / Modal Open State Pattern

**Status:** Accepted  
**Date:** 2026-04-23  
**Sprint:** S2.5  
**Author:** eSTOCK frontend team  

---

## Context

HR2 audit identified no standard for who owns drawer open state, what the prop is named, or how closing is signaled:

| Component | Open state owner | Prop name | Close mechanism |
|---|---|---|---|
| `ClientFormComponent` | Parent (passes `@Input() isOpen`) | `isOpen` | Parent toggles `isOpen` |
| `QuickSearchOverlayComponent` | Self | `open = false` | `@Output() closed` |
| `DrawerComponent` | Internal | `isVisible` | `@Output() closed` |
| Modal inline in `NotificationsPageComponent` | Self | No dedicated field — `*ngIf` on inline block | Assign `null` to data |

Three naming conventions (`isOpen`, `open`, `isVisible`), two ownership models (parent-controlled vs self-controlled), and one inline pattern that bypasses the drawer component entirely.

---

## Decision

**Standard: Parent-controlled open state using `[open]` input and `(closed)` output.**

### Pattern

```typescript
// Parent component (controls open state)
readonly isArticleFormOpen = signal(false);

openForm(): void { this.isArticleFormOpen.set(true); }
onFormClosed(): void { this.isArticleFormOpen.set(false); }
```

```html
<!-- Parent template -->
<app-article-form
  [open]="isArticleFormOpen()"
  (closed)="onFormClosed()"
/>
```

```typescript
// Child drawer/form component
@Input() open = false;
@Output() closed = new EventEmitter<void>();

close(): void {
  this.closed.emit();
}
```

### Rules

1. **Input prop MUST be named `open`** (not `isOpen`, not `isVisible`, not `show`).
2. **Output MUST be named `closed`** (past-tense event, emits `void`).
3. **Parent owns the signal** — the child NEVER sets its own open state. It only emits `closed` and the parent responds.
4. **`DrawerComponent` is the single shared shell** — all drawers/slide-overs MUST use `<app-drawer [open]="..." (closed)="...">`. Do not implement custom drawer animations in feature components.
5. **Modal dialogs** (centered overlay, not slide-over) follow the same `[open]/(closed)` contract but use a future `<app-dialog>` wrapper (S3 backlog).

### Example — correct implementation

```typescript
// BarcodeGeneratorDialogComponent — already uses this pattern correctly
@Input() open = false;
@Output() closed = new EventEmitter<void>();
```

---

## Consequences

### Positive
- Consistent API for all drawer consumers. A junior dev searching for "how to open a drawer" finds one pattern.
- Enables a future `hasUnsavedChanges` guard: parent can intercept `(closed)` and show a confirmation dialog before allowing close.
- Parent-controlled state means the parent decides when to react to data changes before closing.
- Predictable E2E test targets: `[data-testid="drawer-open"]`, `[data-testid="drawer-close"]`.

### Negative / Trade-offs
- Self-controlled overlays (`QuickSearchOverlayComponent`) need refactoring to expose `[open]/(closed)` (deferred).
- Parent must always declare a signal or boolean for open state — minor boilerplate.

---

## Migration Debt

Existing components NOT following this pattern — deferred to S3:
- `ClientFormComponent` — uses `@Input() isOpen` (rename to `open`)
- `QuickSearchOverlayComponent` — self-controlled via `open = false` field (refactor to parent-controlled)
- Inline modal in `NotificationsPageComponent` — extract to `<app-dialog>` or at minimum use `[open]/(closed)`

**No migration in this wave — document only.**

---

## Alternatives Considered

- **Self-controlled** (child owns open state) — rejected. Prevents parent from delaying close (e.g., unsaved changes prompt) and makes testing harder (parent must call imperative methods like `openDrawer()`).
- **Service-based** (e.g., `DrawerService.open(component)`) — rejected. Overkill for MVP; breaks Angular DI tree for inputs; makes component reuse harder.
- **`isOpen` naming** — rejected in favor of `open` (shorter, matches Angular CDK and browser `<dialog open>` attribute convention).
