import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../../models/user.model';
import { UserService } from '../../../services/user.service';
import { LanguageService } from '../../../services/extras/language.service';
import { AlertService } from '../../../services/extras/alert.service';
import { AuthorizationService } from '../../../services/authorization.service';
import { UserListComponent } from '../user-list/user-list.component';
import { UserFormComponent } from '../user-form/user-form.component';
import { FileImportComponent, FileImportConfig, ImportResult } from '../../shared/file-import/file-import.component';
import { DataExportComponent, DataExportConfig } from '../../shared/data-export/data-export.component';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';
import { MainLayoutComponent } from '../../layout/main-layout.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule, 
    UserListComponent, 
    UserFormComponent, 
    FileImportComponent, 
    DataExportComponent,
    ConfirmationDialogComponent,
    MainLayoutComponent
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  isLoading = false;
  isCreateDialogOpen = false;
  isImportDialogOpen = false;
  isExportDialogOpen = false;
  selectedUser: User | null = null;

  // Export configuration
  exportConfig: DataExportConfig = {
    title: 'Export Users',
    endpoint: '/api/users/export',
    data: [],
    filename: 'users_export'
  };

  // Import configuration
  importConfig: FileImportConfig = {
    title: 'import_users',
    endpoint: '/api/users/import',
    acceptedFormats: ['.csv', '.xlsx', '.xls'],
    templateFields: ['id_usuario', 'email', 'nombre', 'apellido', 'contraseña', 'rol'],
    maxFileSize: 10,
    templateType: 'users'
  };

  constructor(
    private userService: UserService,
    private languageService: LanguageService,
    private alertService: AlertService,
    private authService: AuthorizationService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  async loadUsers(): Promise<void> {
    this.isLoading = true;
    
    try {
      const response = await this.userService.getAll();
      
      if (response.result.success && response.data) {
        this.users = Array.isArray(response.data) ? response.data : [];
        // Update export data
        this.exportConfig = {
          ...this.exportConfig,
          data: this.users
        };
      } else {
        this.users = [];
        this.alertService.error(
          this.t('user_management.error'),
          response.result.message || this.t('user_management.failed_load_users')
        );
      }
    } catch (error: any) {
      console.error('Error loading users:', error);
      this.users = [];
      this.alertService.error(
        this.t('user_management.error'),
        error.message || this.t('user_management.failed_load_users')
      );
    } finally {
      this.isLoading = false;
    }
  }

  openCreateDialog(): void {
    this.isCreateDialogOpen = true;
  }

  closeCreateDialog(): void {
    this.isCreateDialogOpen = false;
  }

  openImportDialog(): void {
    this.isImportDialogOpen = true;
  }

  closeImportDialog(): void {
    this.isImportDialogOpen = false;
  }

  openExportDialog(): void {
    this.exportConfig.data = this.users;
    this.isExportDialogOpen = true;
  }

  closeExportDialog(): void {
    this.isExportDialogOpen = false;
  }

  onExportSuccess(): void {
    this.closeExportDialog();
  }

  onCreateSuccess(): void {
    this.closeCreateDialog();
    this.loadUsers(); // Refresh the list
  }

  onImportSuccess(result: ImportResult): void {
    this.closeImportDialog();
    this.loadUsers(); // Refresh the list
    
    // Show detailed import results
    if (result.failed > 0) {
      this.alertService.warning(
        `${this.t('import_completed_with_errors')} - ${this.t('successful')}: ${result.successful}, ${this.t('failed')}: ${result.failed}`,
        this.t('import_summary')
      );
    }
  }

  onImportError(error: string): void {
    console.error('Import error:', error);
  }

  onRefresh(): void {
    this.loadUsers();
  }

  // Authorization methods
  isAdmin(): boolean {
    return this.authService.isAdmin();
  }
}
