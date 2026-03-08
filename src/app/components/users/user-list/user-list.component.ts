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
import { User } from '../../../models/user.model';
import { AlertService } from '../../../services/extras/alert.service';
import { AuthorizationService } from '../../../services/extras/authorization.service';
import { LanguageService } from '../../../services/extras/language.service';
import { UserService } from '../../../services/user.service';
import { handleApiError } from '@app/utils';
import { UserFormComponent } from '../user-form/user-form.component';
import { PasswordChangeComponent } from '../password-change/password-change.component';
import { ZardButtonComponent } from '../../../shared/components/button/button.component';
import { ZardInputDirective } from '../../../shared/components/input/input.directive';
import { ZardSelectComponent } from '../../../shared/components/select/select.component';
import { ZardSelectItemComponent } from '../../../shared/components/select/select-item.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, UserFormComponent, PasswordChangeComponent, ZardButtonComponent, ZardInputDirective, ZardSelectComponent, ZardSelectItemComponent],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent {
  @Input() set users(value: User[]) {
    this.usersSignal.set(value ?? []);
  }
  @Input() isLoading = false;
  @Output() refresh = new EventEmitter<void>();

  editingUser: User | null = null;
  viewingUser: User | null = null;
  deletingUserId: string | null = null;
  isDeleting = false;
  changingPasswordUser: User | null = null;

  searchTerm = '';
  roleFilter = '';
  statusFilter = '';
  sortBy = 'first_name';
  sortOrder: 'asc' | 'desc' = 'asc';
  filtersExpanded = false;

  private readonly usersSignal = signal<User[]>([]);
  private readonly searchTermSignal = signal('');
  private readonly roleFilterSignal = signal('');
  private readonly statusFilterSignal = signal('');
  private readonly sorting = signal<SortingState>([{ id: 'first_name', desc: false }]);
  private readonly pagination = signal<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  readonly filteredUsers = computed(() => {
    const rows = this.usersSignal();
    const search = this.searchTermSignal().toLowerCase();
    const role = this.roleFilterSignal();
    const status = this.statusFilterSignal();

    return rows.filter((user) => {
      if (search) {
        const matchesSearch =
          (user.first_name && user.first_name.toLowerCase().includes(search)) ||
          (user.last_name && user.last_name.toLowerCase().includes(search)) ||
          (user.email && user.email.toLowerCase().includes(search)) ||
          (user.role && user.role.toLowerCase().includes(search));
        if (!matchesSearch) return false;
      }
      if (role && user.role !== role) return false;
      if (status) {
        const isActive = status === 'active';
        if (user.is_active !== isActive) return false;
      }
      return true;
    });
  });

  readonly columns: ColumnDef<User>[] = [
    { id: 'first_name', accessorKey: 'first_name', enableSorting: true },
    { id: 'email', accessorKey: 'email', enableSorting: true },
    { id: 'role', accessorKey: 'role', enableSorting: true },
    { id: 'status', accessorFn: (row) => (row.is_active ? 'active' : 'inactive'), enableSorting: false },
    { id: 'created_at', accessorFn: (row) => new Date(row.created_at || '').getTime(), enableSorting: true },
    { id: 'actions', accessorFn: () => '', enableSorting: false },
  ];

  readonly table = createAngularTable<User>(() => ({
    data: this.filteredUsers(),
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
    private languageService: LanguageService,
    private alertService: AlertService,
    private authService: AuthorizationService
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  getInitials(firstName?: string | null, lastName?: string | null): string {
    if (!firstName && !lastName) return 'U';
    return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
  }

  getRoleBadgeClass(role: string): string {
    const variants: Record<string, string> = {
      admin: 'bg-[#00113f] text-white',
      operator: 'bg-gray-500 text-white',
    };
    return variants[role] ?? 'bg-gray-500 text-white';
  }

  getStatusBadgeClass(isActive: boolean): string {
    return isActive
      ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
      : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
  }

  formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  }

  getUserDisplayName(user: User): string {
    if (user.first_name || user.last_name) {
      return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
    }
    return user.email || user.id;
  }

  onEdit(user: User): void {
    this.editingUser = user;
  }

  onView(user: User): void {
    this.viewingUser = user;
  }

  onDelete(userId: string): void {
    this.deletingUserId = userId;
  }

  onChangePassword(user: User): void {
    this.changingPasswordUser = user;
  }

  closeEditDialog(): void {
    this.editingUser = null;
  }

  closeViewDialog(): void {
    this.viewingUser = null;
  }

  closeDeleteDialog(): void {
    this.deletingUserId = null;
  }

  closePasswordDialog(): void {
    this.changingPasswordUser = null;
  }

  onEditSuccess(): void {
    this.closeEditDialog();
    this.refresh.emit();
  }

  onPasswordChangeSuccess(): void {
    this.closePasswordDialog();
  }

  async confirmDelete(): Promise<void> {
    if (!this.deletingUserId) return;

    this.isDeleting = true;
    try {
      const response = await this.userService.delete(this.deletingUserId);
      if (response.result.success) {
        this.alertService.success(this.t('user_management.success'), this.t('user_management.user_deleted'));
        this.refresh.emit();
        this.closeDeleteDialog();
      } else {
        throw new Error(response.result.message || this.t('delete_failed'));
      }
    } catch (error: any) {
      const fallback = this.t('user_management.failed_delete');
      const msg = handleApiError(error, fallback);
      const errorTitle = msg.includes('Cannot delete user') ? this.t('user_management.cannot_delete') : this.t('user_management.error');
      this.alertService.error(errorTitle, msg);
    } finally {
      this.isDeleting = false;
    }
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

  onSearch(term: string): void {
    this.searchTermSignal.set(term);
    this.setPageIndex(0);
  }

  onFilterChange(): void {
    this.roleFilterSignal.set(this.roleFilter);
    this.statusFilterSignal.set(this.statusFilter);
    this.setPageIndex(0);
  }

  toggleFilters(): void {
    this.filtersExpanded = !this.filtersExpanded;
  }

  hasActiveFilters(): boolean {
    return !!(this.roleFilter || this.statusFilter);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.roleFilter = '';
    this.statusFilter = '';
    this.searchTermSignal.set('');
    this.roleFilterSignal.set('');
    this.statusFilterSignal.set('');
    this.setPageIndex(0);
  }

  get uniqueRoles(): string[] {
    const roles = [...new Set(this.usersSignal().map((u) => u.role).filter(Boolean))] as string[];
    return roles.sort();
  }

  getSortIcon(columnId: string): 'none' | 'asc' | 'desc' {
    const active = this.sorting().find((s) => s.id === columnId);
    if (!active) return 'none';
    return active.desc ? 'desc' : 'asc';
  }

  getHeaderLabel(columnId: string): string {
    const labels: Record<string, string> = {
      first_name: this.t('user_management.name'),
      email: this.t('user_management.email'),
      role: this.t('user_management.role'),
      status: this.t('user_management.status'),
      created_at: this.t('user_management.created'),
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
    return this.filteredUsers().length;
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

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  readonly Math = Math;
}
