import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ColumnDef,
  PaginationState,
  SortingState,
  createAngularTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/angular-table';
import { StockTransfer } from '@app/models/stock-transfer.model';
import { LanguageService } from '@app/services/extras/language.service';
import { ZardSelectComponent } from '@app/shared/components/select/select.component';
import { ZardSelectItemComponent } from '@app/shared/components/select/select-item.component';

/** Location-like shape for display (id + name/code) */
export interface LocationOption {
  id: string;
  location_code?: string;
  description?: string;
}

@Component({
  selector: 'app-stock-transfer-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ZardSelectComponent, ZardSelectItemComponent],
  templateUrl: './stock-transfer-list.component.html',
  styleUrls: ['./stock-transfer-list.component.css'],
})
export class StockTransferListComponent {
  @Input() set transfers(value: StockTransfer[]) {
    this.transfersSignal.set(value ?? []);
  }
  @Input() set locations(value: LocationOption[]) {
    this.locationsSignal.set(value ?? []);
  }
  @Input() isLoading = false;

  private readonly locationsSignal = signal<LocationOption[]>([]);
  @Output() refresh = new EventEmitter<void>();
  @Output() editTransfer = new EventEmitter<StockTransfer>();
  @Output() deleteTransfer = new EventEmitter<StockTransfer>();
  @Output() executeTransfer = new EventEmitter<StockTransfer>();

  searchTerm = '';
  private readonly statusFilterSignal = signal<string>('');

  private readonly transfersSignal = signal<StockTransfer[]>([]);
  private readonly searchTermSignal = signal('');
  private readonly sorting = signal<SortingState>([{ id: 'created_at', desc: true }]);
  private readonly pagination = signal<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  readonly locationNameMap = computed(() => {
    const map: Record<string, string> = {};
    for (const loc of this.locationsSignal()) {
      const name = loc.description || loc.location_code || loc.id;
      map[loc.id] = name;
    }
    return map;
  });

  readonly filteredTransfers = computed(() => {
    const rows = this.transfersSignal();
    const search = this.searchTermSignal().toLowerCase();
    const status = this.statusFilterSignal();
    const locMap = this.locationNameMap();
    let out = rows;
    if (status) {
      out = out.filter((t) => t.status === status);
    }
    if (!search) return out;
    return out.filter((t) => {
      const fromName = locMap[t.from_location_id] ?? '';
      const toName = locMap[t.to_location_id] ?? '';
      return (
        (t.transfer_number || '').toLowerCase().includes(search) ||
        fromName.toLowerCase().includes(search) ||
        toName.toLowerCase().includes(search) ||
        (t.status || '').toLowerCase().includes(search)
      );
    });
  });

  readonly columns: ColumnDef<StockTransfer>[] = [
    { id: 'transfer_number', accessorKey: 'transfer_number', enableSorting: true },
    { id: 'from_location', accessorKey: 'from_location_id', enableSorting: true },
    { id: 'to_location', accessorKey: 'to_location_id', enableSorting: true },
    { id: 'status', accessorKey: 'status', enableSorting: true },
    { id: 'created_at', accessorKey: 'created_at', enableSorting: true },
    { id: 'actions', accessorFn: () => '', enableSorting: false },
  ];

  readonly table = createAngularTable<StockTransfer>(() => ({
    data: this.filteredTransfers(),
    columns: this.columns,
    state: {
      sorting: this.sorting(),
      pagination: this.pagination(),
    },
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

  constructor(private languageService: LanguageService) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  getLocationName(id: string): string {
    return this.locationNameMap()[id] ?? id;
  }

  onSearch(): void {
    this.searchTermSignal.set(this.searchTerm);
    this.setPageIndex(0);
  }

  get statusFilter(): string {
    return this.statusFilterSignal();
  }

  set statusFilter(value: string) {
    this.statusFilterSignal.set(value ?? '');
    this.setPageIndex(0);
  }

  sort(columnId: string): void {
    const current = this.sorting();
    const existing = current.find((s) => s.id === columnId);
    const desc = existing ? !existing.desc : true;
    this.sorting.set([{ id: columnId, desc }]);
    this.setPageIndex(0);
  }

  get pageIndex(): number {
    return this.table.getState().pagination.pageIndex;
  }

  get pageSize(): number {
    return this.table.getState().pagination.pageSize;
  }

  get totalFilteredRows(): number {
    return this.filteredTransfers().length;
  }

  setPageSize(size: number): void {
    const current = this.pagination();
    this.pagination.set({ ...current, pageSize: size, pageIndex: 0 });
  }

  nextPage(): void {
    this.table.nextPage();
  }

  previousPage(): void {
    this.table.previousPage();
  }

  private setPageIndex(pageIndex: number): void {
    const current = this.pagination();
    this.pagination.set({ ...current, pageIndex });
  }

  getSortIcon(columnId: string): 'none' | 'asc' | 'desc' {
    const active = this.sorting().find((s) => s.id === columnId);
    if (!active) return 'none';
    return active.desc ? 'desc' : 'asc';
  }

  getHeaderLabel(columnId: string): string {
    const labels: Record<string, string> = {
      transfer_number: this.t('stock_transfer_number'),
      from_location: this.t('stock_transfer_from_location'),
      to_location: this.t('stock_transfer_to_location'),
      status: this.t('stock_transfer_status'),
      created_at: this.t('stock_transfer_created_at'),
      actions: this.t('actions'),
    };
    return labels[columnId] ?? columnId;
  }

  getStatusBadgeClass(status: string): string {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    const map: Record<string, string> = {
      draft: `${base} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`,
      in_progress: `${base} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`,
      completed: `${base} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`,
      cancelled: `${base} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`,
    };
    return map[status] ?? base;
  }

  getStatusLabel(status: string): string {
    const key = `stock_transfer_status_${status}`;
    const label = this.t(key);
    return label !== key ? label : status;
  }

  onEdit(t: StockTransfer): void {
    this.editTransfer.emit(t);
  }

  onDelete(t: StockTransfer): void {
    this.deleteTransfer.emit(t);
  }

  onExecute(t: StockTransfer): void {
    this.executeTransfer.emit(t);
  }

  canExecute(t: StockTransfer): boolean {
    return t.status === 'draft' || t.status === 'in_progress';
  }

  readonly Math = Math;
}
