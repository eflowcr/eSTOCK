import { CommonModule } from '@angular/common';
import { Component, computed, Input, OnInit, signal } from '@angular/core';
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
import { Adjustment } from '../../../models/adjustment.model';
import { AdjustmentReasonCode } from '../../../models/adjustment-reason-code.model';
import { User } from '../../../models/user.model';
import { LanguageService } from '../../../services/extras/language.service';
import { UserService } from '../../../services/user.service';
import { ZardButtonComponent } from '../../../shared/components/button/button.component';
import { ZardInputDirective } from '../../../shared/components/input/input.directive';
import { ZardSelectComponent } from '../../../shared/components/select/select.component';
import { ZardSelectItemComponent } from '../../../shared/components/select/select-item.component';

@Component({
  selector: 'app-adjustment-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ZardButtonComponent, ZardInputDirective, ZardSelectComponent, ZardSelectItemComponent],
  templateUrl: './adjustment-list.component.html',
  styleUrl: './adjustment-list.component.css'
})
export class AdjustmentListComponent implements OnInit {
  @Input() set adjustments(value: Adjustment[]) {
    this.adjustmentsSignal.set(value ?? []);
  }
  @Input() isLoading = false;
  @Input() reasonCodes: AdjustmentReasonCode[] = [];

  users: User[] = [];
  searchTerm = '';
  reasonFilter = '';
  sortBy = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';

  private readonly adjustmentsSignal = signal<Adjustment[]>([]);
  private readonly searchTermSignal = signal('');
  private readonly reasonFilterSignal = signal('');
  private readonly sorting = signal<SortingState>([{ id: 'createdAt', desc: true }]);
  private readonly pagination = signal<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  readonly filteredAdjustments = computed(() => {
    const rows = this.adjustmentsSignal();
    const search = this.searchTermSignal().toLowerCase();
    const reason = this.reasonFilterSignal();

    return rows.filter((adj) => {
      if (search) {
        const matchesSearch =
          adj.sku.toLowerCase().includes(search) ||
          adj.location.toLowerCase().includes(search) ||
          (adj.notes && adj.notes.toLowerCase().includes(search));
        if (!matchesSearch) return false;
      }
      if (reason && adj.reason !== reason) return false;
      return true;
    });
  });

  readonly columns: ColumnDef<Adjustment>[] = [
    { id: 'createdAt', accessorFn: (row) => new Date(row.created_at).getTime(), enableSorting: true },
    { id: 'sku', accessorKey: 'sku', enableSorting: true },
    { id: 'location', accessorKey: 'location', enableSorting: true },
    { id: 'previous_quantity', accessorKey: 'previous_quantity', enableSorting: false },
    { id: 'adjustment_quantity', accessorKey: 'adjustment_quantity', enableSorting: true },
    { id: 'new_quantity', accessorKey: 'new_quantity', enableSorting: false },
    { id: 'reason', accessorKey: 'reason', enableSorting: true },
    { id: 'user_id', accessorKey: 'user_id', enableSorting: false },
  ];

  readonly table = createAngularTable<Adjustment>(() => ({
    data: this.filteredAdjustments(),
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
    private userService: UserService,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  private async loadUsers(): Promise<void> {
    try {
      const response = await this.userService.getAll();
      this.users = response.data || [];
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  getUserDisplay(userId: string): string {
    const user = this.users.find((u) => u.id === userId);
    if (!user) return userId;
    return user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.email;
  }

  getReasonName(code: string): string {
    if (!code) return '';
    const fixedReasonMap: Record<string, string> = {
      outbound_physical_withdrawal: this.t('reason_outbound_physical_withdrawal'),
      inbound_physical_withdrawal: this.t('reason_inbound_physical_withdrawal'),
    };
    if (fixedReasonMap[code]) {
      return fixedReasonMap[code];
    }
    const rc = this.reasonCodes.find((r) => r.code === code);
    return rc ? rc.name : code;
  }

  onSearch(): void {
    this.searchTermSignal.set(this.searchTerm);
    this.setPageIndex(0);
  }

  onReasonFilterChange(): void {
    this.reasonFilterSignal.set(this.reasonFilter);
    this.setPageIndex(0);
  }

  sort(columnId: string): void {
    if (this.sortBy === columnId) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = columnId;
      this.sortOrder = columnId === 'createdAt' ? 'desc' : 'asc';
    }
    this.sorting.set([{ id: columnId, desc: this.sortOrder === 'desc' }]);
    this.setPageIndex(0);
  }

  getSortIcon(columnId: string): 'none' | 'asc' | 'desc' {
    const active = this.sorting().find((s) => s.id === columnId);
    if (!active) return 'none';
    return active.desc ? 'desc' : 'asc';
  }

  getHeaderLabel(columnId: string): string {
    const labels: Record<string, string> = {
      createdAt: this.t('date'),
      sku: this.t('sku_code'),
      location: this.t('location'),
      previous_quantity: this.t('previous_qty'),
      adjustment_quantity: this.t('adjustment'),
      new_quantity: this.t('new_qty'),
      reason: this.t('reason'),
      user_id: this.t('user'),
    };
    return labels[columnId] ?? columnId;
  }

  getAdjustmentBadgeClass(quantity: number): string {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    return quantity >= 0
      ? `${base} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
      : `${base} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  get pageIndex(): number {
    return this.table.getState().pagination.pageIndex;
  }

  get pageSize(): number {
    return this.table.getState().pagination.pageSize;
  }

  get totalFilteredRows(): number {
    return this.filteredAdjustments().length;
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

  get adjustmentsCount(): number {
    return this.adjustmentsSignal().length;
  }

  readonly Math = Math;
}
