import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
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
import { PresentationTypesService } from '../../../services/presentation-types.service';
import { AlertService } from '../../../services/extras/alert.service';
import { AuthorizationService } from '../../../services/extras/authorization.service';
import { LanguageService } from '../../../services/extras/language.service';
import { InventoryService } from '../../../services/inventory.service';
import { getDisplayableApiError, humanizeApiError } from '@app/utils';
import { ZardDialogService } from '@app/shared/components/dialog';
import { InventoryDetailsContentComponent } from '../inventory-details-content/inventory-details-content.component';
import { InventoryFiltersContentComponent } from '../inventory-filters-content/inventory-filters-content.component';
import { ZardButtonComponent } from '../../../shared/components/button/button.component';
import { ZardInputDirective } from '../../../shared/components/input/input.directive';
import { ZardSelectComponent } from '../../../shared/components/select/select.component';
import { ZardSelectItemComponent } from '../../../shared/components/select/select-item.component';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ZardButtonComponent, ZardInputDirective, ZardSelectComponent, ZardSelectItemComponent],
  templateUrl: './inventory-list.component.html',
  styleUrls: ['./inventory-list.component.css']
})
export class InventoryListComponent implements OnInit {
  @Input() set inventory(value: Inventory[]) {
    this.inventorySignal.set(value ?? []);
  }
  @Input() isLoading = false;
  @Output() editInventory = new EventEmitter<Inventory>();
  @Output() deleteInventory = new EventEmitter<void>();

  viewingInventory: Inventory | null = null;

  searchTerm = '';
  statusFilter = '';
  locationFilter = '';
  presentationFilter = '';
  trackingFilter = '';
  sortBy = 'sku';
  sortOrder: 'asc' | 'desc' = 'asc';
  filtersExpanded = false;
  /** Presentation types for filter dropdown (from API). */
  presentationOptions: { value: string; label: string }[] = [];

  private readonly inventorySignal = signal<Inventory[]>([]);
  private readonly searchTermSignal = signal('');
  private readonly statusFilterSignal = signal('');
  private readonly locationFilterSignal = signal('');
  private readonly presentationFilterSignal = signal('');
  private readonly trackingFilterSignal = signal('');
  private readonly sorting = signal<SortingState>([{ id: 'sku', desc: false }]);
  private readonly pagination = signal<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
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
    private presentationTypesService: PresentationTypesService,
    private languageService: LanguageService,
    private alertService: AlertService,
    private authService: AuthorizationService,
    private dialogService: ZardDialogService
  ) {}

  ngOnInit(): void {
    this.loadPresentationTypes();
  }

  private async loadPresentationTypes(): Promise<void> {
    try {
      const res = await this.presentationTypesService.getList();
      if (res?.result?.success && Array.isArray(res.data)) {
        this.presentationOptions = res.data.map((pt) => ({ value: pt.code, label: pt.name }));
      }
    } catch {
      this.presentationOptions = [];
    }
  }

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  toggleFilters(): void {
    const items = this.inventorySignal();
    const locations = [...new Set(items.map(i => i.location).filter(Boolean))].sort() as string[];
    const presentations = [...new Set(items.map((i: any) => i.presentation).filter(Boolean))].sort() as string[];
    this.dialogService.create({
      zTitle: this.t('filters'),
      zContent: InventoryFiltersContentComponent,
      zData: {
        statusFilter: this.statusFilter,
        locationFilter: this.locationFilter,
        presentationFilter: this.presentationFilter,
        trackingFilter: this.trackingFilter,
        locations,
        presentations,
        onApply: (filters: { statusFilter: string; locationFilter: string; presentationFilter: string; trackingFilter: string }) => {
          this.statusFilter = filters.statusFilter;
          this.locationFilter = filters.locationFilter;
          this.presentationFilter = filters.presentationFilter;
          this.trackingFilter = filters.trackingFilter;
          this.onFilterChange();
        },
      },
      zHideFooter: true,
      zCustomClasses: 'sm:max-w-md',
    });
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
    this.dialogService.create({
      zTitle: this.t('inventory_details'),
      zContent: InventoryDetailsContentComponent,
      zData: inventory,
      zOkText: this.t('close'),
      zCancelText: null,
      zCustomClasses: 'sm:max-w-5xl',
    });
  }

  editInventoryItem(inventory: Inventory): void {
    this.editInventory.emit(inventory);
  }

  onDelete(inventory: Inventory): void {
    const sku = inventory.sku;
    const location = inventory.location;
    this.dialogService.create({
      zTitle: this.t('confirm_delete_inventory'),
      zDescription: this.t('delete_inventory_warning'),
      zOkText: this.t('delete'),
      zCancelText: this.t('cancel'),
      zOkDestructive: true,
      zClosable: false,
      zOnOk: () => {
        this.performDeleteAndEmit(sku, location);
      },
    });
  }

  private async performDeleteAndEmit(sku: string, location: string): Promise<void> {
    try {
      const response = await this.inventoryService.delete(sku, location);
      if (response.result.success) {
        this.deleteInventory.emit();
      } else {
        const msg = response.result.message || '';
        this.alertService.error(this.t('error'), humanizeApiError(msg, this.t, 'failed_to_delete_inventory'));
      }
    } catch (error: any) {
      this.alertService.error(this.t('error'), getDisplayableApiError(error, this.t, 'failed_to_delete_inventory'));
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

  readonly Math = Math;
}
