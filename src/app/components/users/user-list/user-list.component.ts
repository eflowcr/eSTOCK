import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../../models/user.model';
import { UserService } from '../../../services/user.service';
import { LanguageService } from '../../../services/extras/language.service';
import { AlertService } from '../../../services/extras/alert.service';
import { AuthorizationService } from '../../../services/extras/authorization.service';
import { UserFormComponent } from '../user-form/user-form.component';
import { PasswordChangeComponent } from '../password-change/password-change.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, UserFormComponent, PasswordChangeComponent],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent {
  @Input() users: User[] = [];
  @Input() isLoading = false;
  @Output() refresh = new EventEmitter<void>();

  editingUser: User | null = null;
  viewingUser: User | null = null;
  deletingUserId: string | null = null;
  isDeleting = false;
  changingPasswordUser: User | null = null;

  // Search and filter properties
  searchTerm = '';
  roleFilter = '';
  statusFilter = '';
  sortBy = 'first_name';
  sortOrder: 'asc' | 'desc' = 'asc';
  filtersExpanded = false;

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
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  }

  getRoleBadgeClass(role: string): string {
    const variants = {
      admin: "bg-[#00113f] text-white",
      operator: "bg-gray-500 text-white",
    } as const;
    
    return variants[role as keyof typeof variants] || "bg-gray-500 text-white";
  }

  getStatusBadgeClass(isActive: boolean): string {
    return isActive 
      ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
      : "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100";
  }

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  }

  getUserDisplayName(user: User): string {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
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
        this.alertService.success(
          this.t('user_management.success'),
          this.t('user_management.user_deleted')
        );
        this.refresh.emit();
      } else {
        throw new Error(response.result.message || this.t('delete_failed'));
      }
    } catch (error: any) {
      let errorMessage = this.t('user_management.failed_delete');
      let errorTitle = this.t('user_management.error');
      
      // Parse specific error messages
      if (error.message?.includes('Cannot delete user')) {
        errorTitle = this.t('user_management.cannot_delete');
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      this.alertService.error(errorTitle, errorMessage);
    } finally {
      this.isDeleting = false;
      this.closeDeleteDialog();
    }
  }

  get filteredAndSortedUsers(): User[] {
    let filtered = this.users.filter(user => {
      // Search filter
      if (this.searchTerm) {
        const searchLower = this.searchTerm.toLowerCase();
        const matchesSearch = (
          (user.first_name && user.first_name.toLowerCase().includes(searchLower)) ||
          (user.last_name && user.last_name.toLowerCase().includes(searchLower)) ||
          (user.email && user.email.toLowerCase().includes(searchLower)) ||
          (user.role && user.role.toLowerCase().includes(searchLower))
        );
        if (!matchesSearch) return false;
      }

      // Role filter
      if (this.roleFilter && this.roleFilter !== '') {
        if (user.role !== this.roleFilter) return false;
      }

      // Status filter
      if (this.statusFilter && this.statusFilter !== '') {
        const isActive = this.statusFilter === 'active';
        if (user.is_active !== isActive) return false;
      }

      return true;
    });

    // Sort
    return filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (this.sortBy) {
        case 'first_name':
          aValue = a.first_name || '';
          bValue = b.first_name || '';
          break;
        case 'email':
          aValue = a.email || '';
          bValue = b.email || '';
          break;
        case 'role':
          aValue = a.role || '';
          bValue = b.role || '';
          break;
        case 'created_at':
          aValue = new Date(a.created_at || '').getTime();
          bValue = new Date(b.created_at || '').getTime();
          break;
        default:
          aValue = a.first_name || '';
          bValue = b.first_name || '';
      }

      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else {
        comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
      
      return this.sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  get uniqueRoles(): string[] {
    const roles = [...new Set(this.users.map(u => u.role).filter(r => r))] as string[];
    return roles.sort();
  }

  onSort(field: string): void {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'asc';
    }
  }

  toggleFilters(): void {
    this.filtersExpanded = !this.filtersExpanded;
  }

  hasActiveFilters(): boolean {
    return this.roleFilter !== '' || this.statusFilter !== '';
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.roleFilter = '';
    this.statusFilter = '';
  }

  trackByUserId(index: number, user: User): string {
    return user.id;
  }

  onSearch(term: string): void {
    this.searchTerm = term;
  }

  onTableScroll(event: Event): void {
    // Handle table scroll events if needed
    // This method is required for the table scroll container
  }

  // Authorization methods
  isAdmin(): boolean {
    return this.authService.isAdmin();
  }
}
