import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { InventoryMovementsService } from '@app/services/inventory-movements.service';
import { LanguageService } from '@app/services/extras/language.service';
import { MainLayoutComponent } from '../layout/main-layout.component';
import { InventoryMovement, MovementType } from '@app/models/inventory-movement.model';

const PAGE_SIZE = 20;
const MOVEMENT_TYPES: MovementType[] = ['INBOUND', 'OUTBOUND', 'REJECTED', 'ADJUSTMENT', 'TRANSFER'];

@Component({
  selector: 'app-stock-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MainLayoutComponent],
  template: `
    <app-main-layout>
      <div class="flex flex-col gap-4">
        <!-- Header -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 class="text-xl font-semibold text-foreground">{{ t('stock_ledger.title') }}</h1>
            <p class="text-sm text-muted-foreground">{{ t('stock_ledger.subtitle') }}</p>
          </div>
          <button
            type="button"
            (click)="exportCsv()"
            [disabled]="exporting()"
            class="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent disabled:opacity-50"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            {{ exporting() ? t('stock_ledger.exporting') : t('stock_ledger.export_csv') }}
          </button>
        </div>

        <!-- KPI Summary -->
        <div *ngIf="!isLoading() && allMovements().length" class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div class="rounded-lg border border-border bg-card p-3">
            <div class="text-xs text-muted-foreground">{{ t('stock_ledger.kpi.total') }}</div>
            <div class="mt-1 text-lg font-semibold text-foreground">{{ filteredMovements().length }}</div>
          </div>
          <div *ngFor="let type of movementTypes" class="rounded-lg border border-border bg-card p-3">
            <div class="text-xs text-muted-foreground">{{ typeLabel(type) }}</div>
            <div class="mt-1 text-lg font-semibold" [ngClass]="typeTextClass(type)">
              {{ countByType(type) }}
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="rounded-lg border border-border bg-card p-4">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <!-- SKU -->
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted-foreground">{{ t('stock_ledger.filter.sku') }}</label>
              <input
                type="text"
                [(ngModel)]="filterSku"
                (ngModelChange)="onFilterChange()"
                [placeholder]="t('stock_ledger.filter.sku_placeholder')"
                class="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <!-- Location -->
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted-foreground">{{ t('stock_ledger.filter.location') }}</label>
              <input
                type="text"
                [(ngModel)]="filterLocation"
                (ngModelChange)="onFilterChange()"
                [placeholder]="t('stock_ledger.filter.location_placeholder')"
                class="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <!-- Lot -->
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted-foreground">{{ t('stock_ledger.filter.lot') }}</label>
              <input
                type="text"
                [(ngModel)]="filterLot"
                (ngModelChange)="onFilterChange()"
                [placeholder]="t('stock_ledger.filter.lot_placeholder')"
                class="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <!-- Reference type -->
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted-foreground">{{ t('stock_ledger.filter.reference_type') }}</label>
              <select
                [(ngModel)]="filterRefType"
                (ngModelChange)="onFilterChange()"
                class="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">{{ t('stock_ledger.filter.all_refs') }}</option>
                <option value="receiving_task">{{ t('stock_ledger.ref.receiving_task') }}</option>
                <option value="picking_task">{{ t('stock_ledger.ref.picking_task') }}</option>
                <option value="adjustment">{{ t('stock_ledger.ref.adjustment') }}</option>
                <option value="stock_transfer">{{ t('stock_ledger.ref.stock_transfer') }}</option>
              </select>
            </div>

            <!-- From date -->
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted-foreground">{{ t('stock_ledger.filter.from') }}</label>
              <input
                type="date"
                [(ngModel)]="filterFrom"
                (ngModelChange)="onFilterChange()"
                class="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <!-- To date -->
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted-foreground">{{ t('stock_ledger.filter.to') }}</label>
              <input
                type="date"
                [(ngModel)]="filterTo"
                (ngModelChange)="onFilterChange()"
                class="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <!-- Movement type multi-select -->
            <div class="flex flex-col gap-1 sm:col-span-2">
              <label class="text-xs font-medium text-muted-foreground">{{ t('stock_ledger.filter.movement_type') }}</label>
              <div class="flex flex-wrap gap-1.5">
                <button
                  *ngFor="let type of movementTypes"
                  type="button"
                  (click)="toggleType(type)"
                  [class.ring-2]="isTypeSelected(type)"
                  [class.ring-offset-1]="isTypeSelected(type)"
                  class="rounded-full px-2.5 py-0.5 text-xs font-medium transition-all"
                  [ngClass]="typeBadgeClass(type)"
                >{{ typeLabel(type) }}</button>
              </div>
            </div>
          </div>

          <div class="mt-3 flex items-center justify-between gap-3">
            <span class="text-xs text-muted-foreground">
              {{ filteredMovements().length }} {{ t('stock_ledger.filter.results') }}
            </span>
            <button
              type="button"
              (click)="clearFilters()"
              class="text-xs text-muted-foreground underline hover:text-foreground"
            >{{ t('stock_ledger.filter.clear') }}</button>
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="isLoading()" class="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <div class="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-foreground mr-2"></div>
          {{ t('stock_ledger.loading') }}
        </div>

        <!-- Error -->
        <div *ngIf="hasError() && !isLoading()" class="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {{ t('stock_ledger.error') }}
        </div>

        <!-- Table -->
        <div *ngIf="!isLoading() && !hasError()" class="rounded-lg border border-border bg-card overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border">
                <th class="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{{ t('stock_ledger.col.date') }}</th>
                <th class="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{{ t('stock_ledger.col.type') }}</th>
                <th class="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold text-muted-foreground">{{ t('stock_ledger.col.qty') }}</th>
                <th class="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{{ t('stock_ledger.col.sku') }}</th>
                <th class="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{{ t('stock_ledger.col.location') }}</th>
                <th class="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{{ t('stock_ledger.col.lot') }}</th>
                <th class="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{{ t('stock_ledger.col.reference') }}</th>
                <th class="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{{ t('stock_ledger.col.before_after') }}</th>
                <th class="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold text-muted-foreground">{{ t('stock_ledger.col.unit_cost') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="pagedMovements().length === 0">
                <td colspan="9" class="px-4 py-12 text-center text-sm text-muted-foreground">
                  {{ t('stock_ledger.empty') }}
                </td>
              </tr>
              <tr
                *ngFor="let mv of pagedMovements()"
                class="border-b border-border/50 transition-colors hover:bg-muted/30"
              >
                <td class="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                  <span [title]="mv.created_at">{{ relativeDate(mv.created_at) }}</span>
                  <br/>
                  <span class="text-[10px]">{{ absoluteDate(mv.created_at) }}</span>
                </td>
                <td class="whitespace-nowrap px-4 py-2.5">
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium" [ngClass]="typeBadgeClass(mv.movement_type)">
                    {{ typeLabel(mv.movement_type) }}
                  </span>
                </td>
                <td class="whitespace-nowrap px-4 py-2.5 text-right font-mono text-sm font-semibold" [ngClass]="qtyClass(mv)">
                  {{ qtyDisplay(mv) }}
                </td>
                <td class="whitespace-nowrap px-4 py-2.5">
                  <a [routerLink]="['/articles', mv.sku]" class="font-mono text-xs font-semibold text-primary hover:underline">
                    {{ mv.sku }}
                  </a>
                </td>
                <td class="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted-foreground">{{ mv.location_code || '—' }}</td>
                <td class="whitespace-nowrap px-4 py-2.5">
                  <a
                    *ngIf="mv.lot_id; else noLot"
                    [routerLink]="['/lots', mv.lot_id, 'trace']"
                    class="font-mono text-xs text-primary hover:underline"
                  >{{ mv.lot_id.slice(0, 8) }}</a>
                  <ng-template #noLot><span class="text-xs text-muted-foreground">—</span></ng-template>
                </td>
                <td class="px-4 py-2.5 text-xs text-muted-foreground">{{ referenceLabel(mv) }}</td>
                <td class="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted-foreground">{{ qtyPairDisplay(mv) }}</td>
                <td class="whitespace-nowrap px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">{{ unitCostDisplay(mv.unit_cost) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div *ngIf="!isLoading() && totalPages() > 1" class="flex items-center justify-between gap-3">
          <span class="text-xs text-muted-foreground">
            {{ t('stock_ledger.pagination.page') }} {{ pageIndex() + 1 }} / {{ totalPages() }}
          </span>
          <div class="flex gap-1">
            <button
              type="button"
              (click)="prevPage()"
              [disabled]="pageIndex() === 0"
              class="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-40"
            >{{ t('stock_ledger.pagination.prev') }}</button>
            <button
              type="button"
              (click)="nextPage()"
              [disabled]="pageIndex() >= totalPages() - 1"
              class="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-40"
            >{{ t('stock_ledger.pagination.next') }}</button>
          </div>
        </div>
      </div>
    </app-main-layout>
  `,
})
export class StockLedgerComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly hasError = signal(false);
  readonly allMovements = signal<InventoryMovement[]>([]);
  readonly pageIndex = signal(0);
  readonly exporting = signal(false);

  readonly movementTypes: MovementType[] = MOVEMENT_TYPES;

  filterSku = '';
  filterLocation = '';
  filterLot = '';
  filterRefType = '';
  filterFrom = '';
  filterTo = '';
  readonly selectedTypes = signal<Set<MovementType>>(new Set());

  readonly filteredMovements = computed(() => {
    const sku = this.filterSku.trim().toLowerCase();
    const location = this.filterLocation.trim().toLowerCase();
    const lot = this.filterLot.trim().toLowerCase();
    const refType = this.filterRefType;
    const from = this.filterFrom;
    const to = this.filterTo;
    const types = this.selectedTypes();

    return this.allMovements().filter((mv) => {
      if (sku && !mv.sku.toLowerCase().includes(sku)) return false;
      if (location && !(mv.location_code || '').toLowerCase().includes(location)) return false;
      if (lot && !(mv.lot_id || '').toLowerCase().includes(lot)) return false;
      if (refType && mv.reference_type !== refType) return false;
      if (types.size > 0 && !types.has(mv.movement_type)) return false;
      const d = mv.created_at.slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  });

  readonly totalRows = computed(() => this.filteredMovements().length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalRows() / PAGE_SIZE)));

  readonly pagedMovements = computed(() => {
    const start = this.pageIndex() * PAGE_SIZE;
    return this.filteredMovements().slice(start, start + PAGE_SIZE);
  });

  constructor(
    private inventoryMovementsService: InventoryMovementsService,
    private languageService: LanguageService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    this.hasError.set(false);
    try {
      const res = await this.inventoryMovementsService.getAll({ limit: 5000 });
      if (res?.result?.success && Array.isArray(res.data)) {
        this.allMovements.set(
          [...res.data].sort((a, b) => b.created_at.localeCompare(a.created_at)),
        );
      } else {
        this.allMovements.set([]);
      }
    } catch {
      this.allMovements.set([]);
      this.hasError.set(true);
    } finally {
      this.isLoading.set(false);
      this.pageIndex.set(0);
    }
  }

  onFilterChange(): void {
    this.pageIndex.set(0);
  }

  toggleType(type: MovementType): void {
    const next = new Set(this.selectedTypes());
    if (next.has(type)) next.delete(type);
    else next.add(type);
    this.selectedTypes.set(next);
    this.pageIndex.set(0);
  }

  isTypeSelected(type: MovementType): boolean {
    return this.selectedTypes().has(type);
  }

  clearFilters(): void {
    this.filterSku = '';
    this.filterLocation = '';
    this.filterLot = '';
    this.filterRefType = '';
    this.filterFrom = '';
    this.filterTo = '';
    this.selectedTypes.set(new Set());
    this.pageIndex.set(0);
  }

  prevPage(): void {
    if (this.pageIndex() > 0) this.pageIndex.set(this.pageIndex() - 1);
  }

  nextPage(): void {
    if (this.pageIndex() < this.totalPages() - 1) this.pageIndex.set(this.pageIndex() + 1);
  }

  countByType(type: MovementType): number {
    return this.filteredMovements().filter((m) => m.movement_type === type).length;
  }

  async exportCsv(): Promise<void> {
    const rows = this.filteredMovements();
    if (rows.length === 0) return;

    if (rows.length > 5000) {
      // Pragmatic limit: warn and proceed anyway — large exports may be slow
      console.warn('[StockLedger] CSV export has', rows.length, 'rows — consider adding a date range filter for large datasets');
    }

    this.exporting.set(true);
    try {
      const headers = ['date', 'type', 'qty', 'sku', 'location', 'lot_id', 'reference_type', 'reference_id', 'before_qty', 'after_qty', 'unit_cost'];
      const escape = (v: unknown): string => {
        const s = v == null ? '' : String(v);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };
      const lines = [
        headers.join(','),
        ...rows.map((mv) =>
          [
            mv.created_at,
            mv.movement_type,
            mv.quantity,
            mv.sku,
            mv.location_code,
            mv.lot_id ?? '',
            mv.reference_type ?? '',
            mv.reference_id ?? '',
            mv.before_qty ?? '',
            mv.after_qty ?? '',
            mv.unit_cost ?? '',
          ]
            .map(escape)
            .join(','),
        ),
      ];
      const csv = lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock-ledger-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      this.exporting.set(false);
    }
  }

  t(key: string): string {
    return this.languageService.t(key);
  }

  typeLabel(type: MovementType): string {
    return this.t(`historial.type.${type.toLowerCase()}`);
  }

  typeTextClass(type: MovementType): string {
    switch (type) {
      case 'INBOUND': return 'text-green-800 dark:text-green-300';
      case 'OUTBOUND': return 'text-blue-800 dark:text-blue-300';
      case 'ADJUSTMENT': return 'text-amber-800 dark:text-amber-300';
      case 'TRANSFER': return 'text-indigo-800 dark:text-indigo-300';
      case 'REJECTED': return 'text-red-800 dark:text-red-300';
      default: return 'text-muted-foreground';
    }
  }

  typeBadgeClass(type: MovementType): string {
    const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';
    switch (type) {
      case 'INBOUND':
        return `${base} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300`;
      case 'OUTBOUND':
        return `${base} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300`;
      case 'ADJUSTMENT':
        return `${base} bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300`;
      case 'TRANSFER':
        return `${base} bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300`;
      case 'REJECTED':
        return `${base} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300`;
      default:
        return `${base} bg-muted text-muted-foreground`;
    }
  }

  qtyClass(mv: InventoryMovement): string {
    if (mv.movement_type === 'INBOUND') return 'text-green-700 dark:text-green-400';
    if (mv.movement_type === 'OUTBOUND' || mv.movement_type === 'REJECTED') return 'text-red-700 dark:text-red-400';
    return 'text-foreground';
  }

  qtyDisplay(mv: InventoryMovement): string {
    const qty = Number(mv.quantity) || 0;
    if (mv.movement_type === 'INBOUND') return `+${qty}`;
    if (mv.movement_type === 'OUTBOUND' || mv.movement_type === 'REJECTED') return qty > 0 ? `-${qty}` : `${qty}`;
    return qty > 0 ? `+${qty}` : `${qty}`;
  }

  qtyPairDisplay(mv: InventoryMovement): string {
    const b = mv.before_qty;
    const a = mv.after_qty;
    if (b == null && a == null) return '—';
    return `${b ?? '—'} → ${a ?? '—'}`;
  }

  unitCostDisplay(v: number | null | undefined): string {
    if (v == null) return '—';
    try { return v.toLocaleString('es', { style: 'currency', currency: 'USD' }); } catch { return `$${v}`; }
  }

  referenceLabel(mv: InventoryMovement): string {
    if (!mv.reference_type) return '—';
    const suffix = mv.reference_id ? ` · ${mv.reference_id.slice(0, 8)}` : '';
    return `${mv.reference_type}${suffix}`;
  }

  absoluteDate(iso: string): string {
    try { return new Date(iso).toLocaleString('es'); } catch { return iso; }
  }

  relativeDate(iso: string): string {
    try {
      const diffSec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
      if (diffSec < 60) return `${diffSec}s`;
      const diffMin = Math.round(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m`;
      const diffH = Math.round(diffMin / 60);
      if (diffH < 24) return `${diffH}h`;
      const diffD = Math.round(diffH / 24);
      if (diffD < 30) return `${diffD}d`;
      const diffMo = Math.round(diffD / 30);
      if (diffMo < 12) return `${diffMo}mo`;
      return `${Math.round(diffMo / 12)}y`;
    } catch { return ''; }
  }
}
