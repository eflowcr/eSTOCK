import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { User } from '../../../models/user.model';
import { AuthorizationService } from '../../../services/extras/authorization.service';
import { AlertService } from '../../../services/extras/alert.service';
import { LanguageService } from '../../../services/extras/language.service';
import { UserService } from '../../../services/user.service';
import { handleApiError } from '@app/utils';
import { ZardDialogService } from '@app/shared/components/dialog';
import { MainLayoutComponent } from '../../layout/main-layout.component';
import { DataExportConfig } from '../../shared/data-export/data-export.component';
import { FileImportConfig, ImportResult } from '../../shared/file-import/file-import.component';
import { DataExportContentComponent } from '../../shared/data-export/data-export-content.component';
import { FileImportContentComponent } from '../../shared/file-import/file-import-content.component';
import { UserFormComponent } from '../user-form/user-form.component';
import { UserListComponent } from '../user-list/user-list.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    UserListComponent,
    UserFormComponent,
    MainLayoutComponent
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  isLoading = false;
  isCreateDialogOpen = false;
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
    private authService: AuthorizationService,
    private dialogService: ZardDialogService
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
        handleApiError(error, this.t('user_management.failed_load_users'))
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
    this.dialogService.create({
      zTitle: this.t('import_data'),
      zContent: FileImportContentComponent,
      zData: {
        config: this.importConfig,
        onSuccess: (res: ImportResult) => this.onImportSuccess(res),
        onError: (err: string) => this.onImportError(err),
      },
      zHideFooter: true,
      zCustomClasses: 'sm:max-w-2xl',
    });
  }

  openExportDialog(): void {
    this.exportConfig.data = this.users;
    this.dialogService.create({
      zTitle: this.t('export_data'),
      zDescription: this.t('export_description'),
      zContent: DataExportContentComponent,
      zData: {
        config: this.exportConfig,
        onExported: () => this.onExportSuccess(),
      },
      zHideFooter: true,
      zCustomClasses: 'sm:max-w-md',
    });
  }

  onExportSuccess(): void {}

  onCreateSuccess(): void {
    this.closeCreateDialog();
    this.loadUsers(); // Refresh the list
  }

  onImportSuccess(result: ImportResult): void {
    this.loadUsers();
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
