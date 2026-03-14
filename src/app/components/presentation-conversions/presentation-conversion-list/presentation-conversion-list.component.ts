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
import { PresentationConversion } from '@app/models/presentation-conversion.model';
import { PresentationType } from '@app/models/presentation-type.model';
import { LanguageService } from '@app/services/extras/language.service';
import { ZardSelectComponent } from '@app/shared/components/select/select.component';
import { ZardSelectItemComponent } from '@app/shared/components/select/select-item.component';

@Component({
  selector: 'app-presentation-conversion-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ZardSelectComponent, ZardSelectItemComponent],
  templateUrl: './presentation-conversion-list.component.html',
  styleUrls: ['./presentation-conversion-list.component.css'],
})
export class PresentationConversionListComponent {
  @Input() set conversions(value: PresentationConversion[]) {
    this.conversionsSignal.set(value ?? []);
  }
  @Input() set presentationTypes(value: PresentationType[]) {
    this.presentationTypesSignal.set(value ?? []);
  }
  @Input() isLoading = false;

  private readonly presentationTypesSignal = signal<PresentationType[]>([]);
  @Output() refresh = new EventEmitter<void>();
  @Output() editConversion = new EventEmitter<PresentationConversion>();
  @Output() deleteConversion = new EventEmitter<PresentationConversion>();

  searchTerm = '';
  sortBy = 'from_type';
  sortOrder: 'asc' | 'desc' = 'asc';

  private readonly conversionsSignal = signal<PresentationConversion[]>([]);
  private readonly searchTermSignal = signal('');
  private readonly sorting = signal<SortingState>([{ id: 'from_type', desc: false }]);
  private readonly pagination = signal<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  readonly typeNameMap = computed(() => {
    const map: Record<string, string> = {};
    for (const pt of this.presentationTypesSignal()) {
      map[pt.id] = pt.name || pt.code;
    }
    return map;
  });

  readonly filteredConversions = computed(() => {
    const rows = this.conversionsSignal();
    const search = this.searchTermSignal().toLowerCase();
    const typeMap = this.typeNameMap();
    if (!search) return rows;
    return rows.filter((c) => {
      const fromName = typeMap[c.from_presentation_type_id] ?? '';
      const toName = typeMap[c.to_presentation_type_id] ?? '';
      return (
        fromName.toLowerCase().includes(search) ||
        toName.toLowerCase().includes(search) ||
        String(c.conversion_factor).includes(search)
      );
    });
  });

  readonly columns: ColumnDef<PresentationConversion>[] = [
    { id: 'from_type', accessorKey: 'from_presentation_type_id', enableSorting: true },
    { id: 'to_type', accessorKey: 'to_presentation_type_id', enableSorting: true },
    { id: 'factor', accessorKey: 'conversion_factor', enableSorting: true },
    { id: 'status', accessorFn: (row) => (row.is_active ? 'active' : 'inactive'), enableSorting: false },
    { id: 'actions', accessorFn: () => '', enableSorting: false },
  ];

  readonly table = createAngularTable<PresentationConversion>(() => ({
    data: this.filteredConversions(),
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

  getTypeName(id: string): string {
    return this.typeNameMap()[id] ?? id;
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
    return this.filteredConversions().length;
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
      from_type: this.t('conversion_from_type'),
      to_type: this.t('conversion_to_type'),
      factor: this.t('conversion_factor'),
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

  onEdit(c: PresentationConversion): void {
    this.editConversion.emit(c);
  }

  onDelete(c: PresentationConversion): void {
    this.deleteConversion.emit(c);
  }

  readonly Math = Math;
}
