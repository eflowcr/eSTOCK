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
import { Location } from '../../../models/location.model';
import { AlertService } from '../../../services/extras/alert.service';
import { AuthorizationService } from '../../../services/extras/authorization.service';
import { LanguageService } from '../../../services/extras/language.service';
import { LocationService } from '../../../services/location.service';
import { handleApiError } from '@app/utils';
import { ZardDialogService } from '@app/shared/components/dialog';
import { LocationDetailsContentComponent } from '../location-details-content/location-details-content.component';
import { ZardButtonComponent } from '../../../shared/components/button/button.component';
import { ZardInputDirective } from '../../../shared/components/input/input.directive';
import { ZardSelectComponent } from '../../../shared/components/select/select.component';
import { ZardSelectItemComponent } from '../../../shared/components/select/select-item.component';

@Component({
  selector: 'app-location-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ZardButtonComponent, ZardInputDirective, ZardSelectComponent, ZardSelectItemComponent],
  templateUrl: './location-list.component.html',
  styleUrls: ['./location-list.component.css']
})
export class LocationListComponent {
  @Input() set locations(value: Location[]) {
    this.locationsSignal.set(value ?? []);
  }
  @Input() isLoading = false;
  @Output() refresh = new EventEmitter<void>();
  @Output() edit = new EventEmitter<Location>();
  @Output() updated = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();

  deletingLocationId: string | null = null;
  isDeleting = false;

  searchTerm = '';
  typeFilter = '';
  zoneFilter = '';
  statusFilter = '';
  sortBy = 'location_code';
  sortOrder: 'asc' | 'desc' = 'asc';
  filtersExpanded = false;

  private readonly locationsSignal = signal<Location[]>([]);
  private readonly searchTermSignal = signal('');
  private readonly typeFilterSignal = signal('');
  private readonly zoneFilterSignal = signal('');
  private readonly statusFilterSignal = signal('');
  private readonly sorting = signal<SortingState>([{ id: 'location_code', desc: false }]);
  private readonly pagination = signal<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  readonly filteredLocations = computed(() => {
    const rows = this.locationsSignal();
    const search = this.searchTermSignal().toLowerCase();
    const type = this.typeFilterSignal();
    const zone = this.zoneFilterSignal();
    const status = this.statusFilterSignal();

    return rows.filter((location) => {
      if (search) {
        const matchesSearch =
          location.location_code.toLowerCase().includes(search) ||
          (location.description && location.description.toLowerCase().includes(search)) ||
          (location.zone && location.zone.toLowerCase().includes(search));
        if (!matchesSearch) return false;
      }
      if (type && type !== 'all' && location.type.toUpperCase() !== type.toUpperCase()) return false;
      if (zone && zone !== 'all' && (!location.zone || location.zone.toUpperCase() !== zone.toUpperCase())) return false;
      if (status && status !== 'all') {
        const isActive = status === 'active';
        if (location.is_active !== isActive) return false;
      }
      return true;
    });
  });

  readonly columns: ColumnDef<Location>[] = [
    { id: 'location_code', accessorKey: 'location_code', enableSorting: true },
    { id: 'description', accessorKey: 'description', enableSorting: true },
    { id: 'zone', accessorKey: 'zone', enableSorting: true },
    { id: 'type', accessorKey: 'type', enableSorting: true },
    { id: 'status', accessorFn: (row) => (row.is_active ? 'active' : 'inactive'), enableSorting: false },
    { id: 'actions', accessorFn: () => '', enableSorting: false },
  ];

  readonly table = createAngularTable<Location>(() => ({
    data: this.filteredLocations(),
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
    private locationService: LocationService,
    private languageService: LanguageService,
    private alertService: AlertService,
    private authService: AuthorizationService,
    private dialogService: ZardDialogService
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  getTypeBadgeClass(type: string): string {
    const variants: Record<string, string> = {
      PALLET: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      SHELF: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      BIN: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      FLOOR: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
      BLOCK: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    };
    return variants[type.toUpperCase()] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }

  getStatusBadgeClass(isActive: boolean): string {
    return isActive
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  }

  get uniqueTypes(): string[] {
    const types = [...new Set(this.locationsSignal().map((l) => l.type.toUpperCase()))];
    return types.sort();
  }

  get uniqueZones(): string[] {
    const zones = [...new Set(this.locationsSignal().map((l) => l.zone).filter((z) => z && z.trim() !== ''))] as string[];
    return zones.sort();
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

  onEdit(location: Location): void {
    this.edit.emit(location);
  }

  onView(location: Location): void {
    this.dialogService.create({
      zTitle: this.t('location_details'),
      zContent: LocationDetailsContentComponent,
      zData: {
        location,
        onEdit: (loc: Location) => this.onEdit(loc),
        isAdmin: this.isAdmin(),
      },
      zHideFooter: true,
      zCustomClasses: 'sm:max-w-lg',
    });
  }

  onDelete(location: Location): void {
    const locationId = location.id.toString();
    this.dialogService.create({
      zTitle: this.t('delete_location'),
      zDescription: this.t('delete_location_confirm'),
      zOkText: this.t('delete'),
      zCancelText: this.t('cancel'),
      zOkDestructive: true,
      zClosable: false,
      zOnOk: () => {
        this.performDeleteAndRefresh(locationId);
      },
    });
  }

  private async performDeleteAndRefresh(locationId: string): Promise<void> {
    try {
      const response = await this.locationService.delete(locationId);
      if (response.result.success) {
        this.alertService.success(this.t('success'), this.t('location_deleted_successfully'));
        this.deleted.emit();
      } else {
        this.alertService.error(this.t('error'), response.result.message || this.t('failed_to_delete_location'));
      }
    } catch (error: any) {
      this.alertService.error(this.t('error'), handleApiError(error, this.t('failed_to_delete_location')));
    }
  }

  toggleFilters(): void {
    this.filtersExpanded = !this.filtersExpanded;
  }

  hasActiveFilters(): boolean {
    return !!(this.typeFilter || this.zoneFilter || this.statusFilter);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.typeFilter = '';
    this.zoneFilter = '';
    this.statusFilter = '';
    this.searchTermSignal.set('');
    this.typeFilterSignal.set('');
    this.zoneFilterSignal.set('');
    this.statusFilterSignal.set('');
    this.setPageIndex(0);
  }

  onSearch(term: string): void {
    this.searchTermSignal.set(term);
    this.setPageIndex(0);
  }

  onFilterChange(): void {
    this.typeFilterSignal.set(this.typeFilter);
    this.zoneFilterSignal.set(this.zoneFilter);
    this.statusFilterSignal.set(this.statusFilter);
    this.setPageIndex(0);
  }

  getSortIcon(columnId: string): 'none' | 'asc' | 'desc' {
    const active = this.sorting().find((s) => s.id === columnId);
    if (!active) return 'none';
    return active.desc ? 'desc' : 'asc';
  }

  getHeaderLabel(columnId: string): string {
    const labels: Record<string, string> = {
      location_code: this.t('location_code'),
      description: this.t('location_description'),
      zone: this.t('location_zone'),
      type: this.t('location_type'),
      status: this.t('location_status'),
      actions: this.t('user_management.actions'),
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
    return this.filteredLocations().length;
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
