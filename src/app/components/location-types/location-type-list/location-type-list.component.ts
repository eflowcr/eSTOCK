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
import { LocationType } from '@app/models/location-type.model';
import { LanguageService } from '@app/services/extras/language.service';
import { ZardSelectComponent } from '@app/shared/components/select/select.component';
import { ZardSelectItemComponent } from '@app/shared/components/select/select-item.component';

@Component({
  selector: 'app-location-type-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ZardSelectComponent, ZardSelectItemComponent],
  templateUrl: './location-type-list.component.html',
  styleUrls: ['./location-type-list.component.css'],
})
export class LocationTypeListComponent {
  @Input() set types(value: LocationType[]) {
    this.typesSignal.set(value ?? []);
  }
  @Input() isLoading = false;
  @Output() refresh = new EventEmitter<void>();
  @Output() editLocationType = new EventEmitter<LocationType>();
  @Output() deleteLocationType = new EventEmitter<LocationType>();

  searchTerm = '';
  sortBy = 'code';
  sortOrder: 'asc' | 'desc' = 'asc';

  private readonly typesSignal = signal<LocationType[]>([]);
  private readonly searchTermSignal = signal('');
  private readonly sorting = signal<SortingState>([{ id: 'code', desc: false }]);
  private readonly pagination = signal<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  readonly filteredTypes = computed(() => {
    const rows = this.typesSignal();
    const search = this.searchTermSignal().toLowerCase();
    if (!search) return rows;
    return rows.filter(
      (t) =>
        t.code.toLowerCase().includes(search) ||
        (t.name && t.name.toLowerCase().includes(search))
    );
  });

  readonly columns: ColumnDef<LocationType>[] = [
    { id: 'code', accessorKey: 'code', enableSorting: true },
    { id: 'name', accessorKey: 'name', enableSorting: true },
    { id: 'status', accessorFn: (row) => (row.is_active ? 'active' : 'inactive'), enableSorting: false },
    { id: 'actions', accessorFn: () => '', enableSorting: false },
  ];

  readonly table = createAngularTable<LocationType>(() => ({
    data: this.filteredTypes(),
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

  constructor(private languageService: LanguageService) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  onSearch(): void {
    this.searchTermSignal.set(this.searchTerm);
    this.setPageIndex(0);
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

  get pageIndex(): number {
    return this.table.getState().pagination.pageIndex;
  }

  get pageSize(): number {
    return this.table.getState().pagination.pageSize;
  }

  get totalFilteredRows(): number {
    return this.filteredTypes().length;
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
      code: this.t('location_type_code'),
      name: this.t('location_type_name'),
      status: this.t('location_status'),
      actions: this.t('actions'),
    };
    return labels[columnId] ?? columnId;
  }

  getStatusBadgeClass(isActive: boolean): string {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    return isActive
      ? `${base} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
      : `${base} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
  }

  onEdit(type: LocationType): void {
    this.editLocationType.emit(type);
  }

  onDelete(type: LocationType): void {
    this.deleteLocationType.emit(type);
  }

  readonly Math = Math;
}
