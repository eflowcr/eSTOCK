import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  ColumnDef, PaginationState, SortingState,
  createAngularTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel,
} from '@tanstack/angular-table';
import { InventoryLot } from '../../../models/inventory-lot.model';
import { InventoryLotsService } from '../../../services/inventory-lots.service';
import { LanguageService } from '../../../services/extras/language.service';
import { ExpiryClassPipe, daysUntilExpiry } from '../../../shared/pipes/expiry-class.pipe';
import { ZardSelectComponent } from '../../../shared/components/select/select.component';
import { ZardSelectItemComponent } from '../../../shared/components/select/select-item.component';

type ExpiryWindow = 'all' | '30d' | '60d' | '90d' | 'expired';

@Component({
  selector: 'app-lots-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ExpiryClassPipe, ZardSelectComponent, ZardSelectItemComponent],
  templateUrl: './lots-inventory.component.html',
})
export class LotsInventoryComponent implements OnInit {
  isLoading = signal(false);
  private readonly allLots = signal<InventoryLot[]>([]);

  skuFilter = '';
  locationFilter = '';
  statusFilter = 'active';
  expiryWindow: ExpiryWindow = 'all';
  private readonly skuFilterSignal = signal('');
  private readonly locationFilterSignal = signal('');
  private readonly statusFilterSignal = signal('active');
  private readonly expiryWindowSignal = signal<ExpiryWindow>('all');
  private readonly sorting = signal<SortingState>([{ id: 'expiration_date', desc: false }]);
  private readonly pagination = signal<PaginationState>({ pageIndex: 0, pageSize: 25 });

  readonly filteredLots = computed(() => {
    const rows = this.allLots();
    const sku = this.skuFilterSignal().toLowerCase();
    const location = this.locationFilterSignal().toLowerCase();
    const status = this.statusFilterSignal();
    const window = this.expiryWindowSignal();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return rows.filter(lot => {
      if (sku && !lot.sku.toLowerCase().includes(sku)) return false;
      if (location && !lot.location.toLowerCase().includes(location)) return false;
      if (status && lot.status !== status) return false;
      if (window !== 'all') {
        const days = daysUntilExpiry(lot.expiration_date);
        if (days === null) return false;
        switch (window) {
          case 'expired': if (days >= 0) return false; break;
          case '30d':     if (days < 0 || days > 30) return false; break;
          case '60d':     if (days < 0 || days > 60) return false; break;
          case '90d':     if (days < 0 || days > 90) return false; break;
        }
      }
      return true;
    });
  });

  readonly columns: ColumnDef<InventoryLot>[] = [
    { id: 'sku', accessorKey: 'sku', enableSorting: true },
    { id: 'lot_number', accessorKey: 'lot_number', enableSorting: true },
    { id: 'location', accessorKey: 'location', enableSorting: true },
    { id: 'qty', accessorKey: 'qty', enableSorting: true },
    { id: 'expiration_date', accessorKey: 'expiration_date', enableSorting: true },
    { id: 'best_before_date', accessorKey: 'best_before_date', enableSorting: true },
    { id: 'manufactured_at', accessorKey: 'manufactured_at', enableSorting: true },
    { id: 'status', accessorKey: 'status', enableSorting: true },
    { id: 'actions', accessorFn: () => '', enableSorting: false },
  ];

  readonly table = createAngularTable<InventoryLot>(() => ({
    data: this.filteredLots(),
    columns: this.columns,
    state: { sorting: this.sorting(), pagination: this.pagination() },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(this.sorting()) : updater;
      this.sorting.set(next);
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(this.pagination()) : updater;
      this.pagination.set(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  }));

  constructor(
    private inventoryLotsService: InventoryLotsService,
    private languageService: LanguageService,
  ) {}

  ngOnInit(): void {
    this.loadLots();
  }

  private async loadLots(): Promise<void> {
    this.isLoading.set(true);
    try {
      const res = await this.inventoryLotsService.getAll();
      if (res?.result?.success && Array.isArray(res.data)) {
        this.allLots.set(res.data);
      }
    } catch {
      this.allLots.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  t(key: string): string { return this.languageService.translate(key); }

  onSkuSearch(val: string): void {
    this.skuFilterSignal.set(val);
    this.resetPage();
  }

  onLocationChange(): void {
    this.locationFilterSignal.set(this.locationFilter);
    this.resetPage();
  }

  onStatusChange(): void {
    this.statusFilterSignal.set(this.statusFilter);
    this.resetPage();
  }

  setExpiryWindow(w: ExpiryWindow): void {
    this.expiryWindow = w;
    this.expiryWindowSignal.set(w);
    this.resetPage();
  }

  private resetPage(): void {
    this.pagination.set({ ...this.pagination(), pageIndex: 0 });
  }

  get uniqueLocations(): string[] {
    return [...new Set(this.allLots().map(l => l.location).filter(Boolean))].sort();
  }

  daysLabel(exp: string | null | undefined): string {
    const d = daysUntilExpiry(exp);
    if (d === null) return '';
    if (d < 0) return `Vencido (${Math.abs(d)}d)`;
    if (d === 0) return 'Vence hoy';
    return `${d}d`;
  }

  formatDate(d: string | null | undefined): string {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('es-CR'); } catch { return d; }
  }

  statusBadge(s: string): string {
    if (s === 'active') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (s === 'expired') return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    if (s === 'quarantined') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-muted text-muted-foreground';
  }

  get pageIndex(): number { return this.table.getState().pagination.pageIndex; }
  get pageSize(): number  { return this.table.getState().pagination.pageSize; }
  get totalRows(): number { return this.filteredLots().length; }
  readonly Math = Math;
  readonly EXPIRY_WINDOWS: { value: ExpiryWindow; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: '30d', label: 'Próximos 30d' },
    { value: '60d', label: 'Próximos 60d' },
    { value: '90d', label: 'Próximos 90d' },
    { value: 'expired', label: 'Vencidos' },
  ];
}
