import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../../models/user.model';
import { UserService } from '../../../services/user.service';
import { LanguageService } from '../../../services/extras/language.service';
import { AlertService } from '../../../services/extras/alert.service';
import { AuthorizationService } from '../../../services/authorization.service';
import { UserFormComponent } from '../user-form/user-form.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, UserFormComponent],
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

  closeEditDialog(): void {
    this.editingUser = null;
  }

  closeViewDialog(): void {
    this.viewingUser = null;
  }

  closeDeleteDialog(): void {
    this.deletingUserId = null;
  }

  onEditSuccess(): void {
    this.closeEditDialog();
    this.refresh.emit();
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

  // Authorization methods
  isAdmin(): boolean {
    return this.authService.isAdmin();
  }
}
