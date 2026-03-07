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
import { Inventory } from '../../../models/inventory.model';
import { AlertService } from '../../../services/extras/alert.service';
import { AuthorizationService } from '../../../services/extras/authorization.service';
import { LanguageService } from '../../../services/extras/language.service';
import { InventoryService } from '../../../services/inventory.service';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory-list.component.html',
  styleUrls: ['./inventory-list.component.css']
})
export class InventoryListComponent {
  @Input() set inventory(value: Inventory[]) {
    this.inventorySignal.set(value ?? []);
  }
  @Input() isLoading = false;
  @Output() editInventory = new EventEmitter<Inventory>();
  @Output() deleteInventory = new EventEmitter<void>();

  viewingInventory: Inventory | null = null;
  deletingInventorySku: string | null = null;
  deletingLocation: string | null = null;
  isDeleting = false;

  searchTerm = '';
  statusFilter = '';
  locationFilter = '';
  presentationFilter = '';
  trackingFilter = '';
  sortBy = 'sku';
  sortOrder: 'asc' | 'desc' = 'asc';
  filtersExpanded = false;

  private readonly inventorySignal = signal<Inventory[]>([]);
  private readonly searchTermSignal = signal('');
  private readonly statusFilterSignal = signal('');
  private readonly locationFilterSignal = signal('');
  private readonly presentationFilterSignal = signal('');
  private readonly trackingFilterSignal = signal('');
  private readonly sorting = signal<SortingState>([{ id: 'sku', desc: false }]);
  private readonly pagination = signal<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  readonly filteredInventory = computed(() => {
    const rows = this.inventorySignal();
    const search = this.searchTermSignal().toLowerCase();
    const status = this.statusFilterSignal();
    const location = this.locationFilterSignal();
    const presentation = this.presentationFilterSignal();
    const tracking = this.trackingFilterSignal();

    return rows.filter((item) => {
      if (search) {
        const matchesSearch =
          item.sku.toLowerCase().includes(search) ||
          (item.name && item.name.toLowerCase().includes(search)) ||
          item.location.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      if (status && item.status !== status) return false;
      if (location && item.location !== location) return false;
      if (presentation && item.presentation !== presentation) return false;
      if (tracking && !this.matchesTrackingFilter(item, tracking)) return false;
      return true;
    });
  });

  readonly columns: ColumnDef<Inventory>[] = [
    { id: 'sku', accessorKey: 'sku', enableSorting: true },
    { id: 'name', accessorKey: 'name', enableSorting: true },
    { id: 'location', accessorKey: 'location', enableSorting: true },
    { id: 'quantity', accessorKey: 'quantity', enableSorting: true },
    { id: 'presentation', accessorKey: 'presentation', enableSorting: true },
    { id: 'status', accessorKey: 'status', enableSorting: true },
    { id: 'tracking', accessorFn: () => '', enableSorting: false },
    { id: 'actions', accessorFn: () => '', enableSorting: false },
  ];

  readonly table = createAngularTable<Inventory>(() => ({
    data: this.filteredInventory(),
    columns: this.columns,
    state: {
      sorting: this.sorting(),
      pagination: this.pagination(),
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(this.sorting()) : updater;
      this.sorting.set(next);
      const first = next[0];
      if (first) {
        this.sortBy = first.id;
        this.sortOrder = first.desc ? 'desc' : 'asc';
      }
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
    private inventoryService: InventoryService,
    private languageService: LanguageService,
    private alertService: AlertService,
    private authService: AuthorizationService
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  toggleFilters(): void {
    this.filtersExpanded = !this.filtersExpanded;
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchTerm ||
      this.statusFilter ||
      this.locationFilter ||
      this.presentationFilter ||
      this.trackingFilter
    );
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.locationFilter = '';
    this.presentationFilter = '';
    this.trackingFilter = '';
    this.searchTermSignal.set('');
    this.statusFilterSignal.set('');
    this.locationFilterSignal.set('');
    this.presentationFilterSignal.set('');
    this.trackingFilterSignal.set('');
    this.setPageIndex(0);
  }

  onSearch(term: string): void {
    this.searchTermSignal.set(term);
    this.setPageIndex(0);
  }

  onFilterChange(): void {
    this.statusFilterSignal.set(this.statusFilter);
    this.locationFilterSignal.set(this.locationFilter);
    this.presentationFilterSignal.set(this.presentationFilter);
    this.trackingFilterSignal.set(this.trackingFilter);
    this.setPageIndex(0);
  }

  get uniqueLocations(): string[] {
    return Array.from(new Set(this.inventorySignal().map((item) => item.location).filter(Boolean)));
  }

  get uniquePresentations(): string[] {
    return Array.from(new Set(this.inventorySignal().map((item) => item.presentation).filter(Boolean)));
  }

  sort(columnId: string): void {
    if (this.sortBy === columnId) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = columnId;
      this.sortOrder = 'asc';
    }
    this.sorting.set([{ id: columnId, desc: this.sortOrder === 'desc' }]);
    this.setPageIndex(0);
  }

  matchesTrackingFilter(item: Inventory, filter: string): boolean {
    switch (filter) {
      case 'lot_only':
        return item.track_by_lot && !item.track_by_serial;
      case 'serial_only':
        return !item.track_by_lot && item.track_by_serial;
      case 'both':
        return item.track_by_lot && item.track_by_serial;
      case 'none':
        return !item.track_by_lot && !item.track_by_serial;
      default:
        return true;
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'reserved':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'damaged':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }

  viewInventory(inventory: Inventory): void {
    this.viewingInventory = inventory;
  }

  closeViewModal(): void {
    this.viewingInventory = null;
  }

  editInventoryItem(inventory: Inventory): void {
    this.editInventory.emit(inventory);
  }

  confirmDelete(inventory: Inventory): void {
    this.deletingInventorySku = inventory.sku;
    this.deletingLocation = inventory.location;
  }

  closeDeleteDialog(): void {
    this.deletingInventorySku = null;
    this.deletingLocation = null;
  }

  async deleteInventoryItem(): Promise<void> {
    if (!this.deletingInventorySku || !this.deletingLocation) return;

    try {
      this.isDeleting = true;
      const response = await this.inventoryService.delete(this.deletingInventorySku, this.deletingLocation);
      if (response.result.success) {
        this.deleteInventory.emit();
        this.closeDeleteDialog();
      } else {
        this.alertService.error(response.result.message || this.t('failed_to_delete_inventory'));
      }
    } catch (error) {
      this.alertService.error(this.t('failed_to_delete_inventory'));
    } finally {
      this.isDeleting = false;
    }
  }

  getSortIcon(columnId: string): 'none' | 'asc' | 'desc' {
    const active = this.sorting().find((s) => s.id === columnId);
    if (!active) return 'none';
    return active.desc ? 'desc' : 'asc';
  }

  getHeaderLabel(columnId: string): string {
    const labels: Record<string, string> = {
      sku: this.t('sku_code'),
      name: this.t('description'),
      location: this.t('location'),
      quantity: this.t('quantity'),
      presentation: this.t('presentation'),
      status: this.t('status'),
      tracking: this.t('tracking'),
      actions: this.t('actions'),
    };
    return labels[columnId] ?? columnId;
  }

  get pageIndex(): number {
    return this.table.getState().pagination.pageIndex;
  }

  get pageSize(): number {
    return this.table.getState().pagination.pageSize;
  }

  get totalFilteredRows(): number {
    return this.filteredInventory().length;
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

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeViewModal();
      this.closeDeleteDialog();
    }
  }

  readonly Math = Math;
}
