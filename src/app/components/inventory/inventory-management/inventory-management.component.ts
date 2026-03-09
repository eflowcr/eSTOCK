import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Inventory } from '../../../models/inventory.model';
import { AlertService } from '../../../services/extras/alert.service';
import { AuthorizationService } from '../../../services/extras/authorization.service';
import { LanguageService } from '../../../services/extras/language.service';
import { InventoryService } from '../../../services/inventory.service';
import { ZardDialogService } from '@app/shared/components/dialog';
import { MainLayoutComponent } from '../../layout/main-layout.component';
import { InventoryListComponent } from '../inventory-list/inventory-list.component';
import { InventoryFormComponent } from '../inventory-form/inventory-form.component';
import { FileImportConfig, ImportResult } from '../../shared/file-import/file-import.component';
import { DataExportConfig } from '../../shared/data-export/data-export.component';
import { DataExportContentComponent } from '../../shared/data-export/data-export-content.component';
import { FileImportContentComponent } from '../../shared/file-import/file-import-content.component';

@Component({
  selector: 'app-inventory-management',
  standalone: true,
  imports: [
    CommonModule,
    MainLayoutComponent,
    InventoryListComponent,
    InventoryFormComponent,
  ],
  templateUrl: './inventory-management.component.html',
  styleUrls: ['./inventory-management.component.css']
})
export class InventoryManagementComponent implements OnInit {
  inventory: Inventory[] = [];
  isLoading = false;
  isCreateDialogOpen = false;
  selectedInventory: Inventory | null = null;

  // Export configuration
  exportConfig: DataExportConfig = {
    title: 'Export Inventory',
    endpoint: '/api/inventory/export',
    data: [],
    filename: 'inventory_export'
  };

  // Import configuration
  importConfig: FileImportConfig = {
    title: 'import_inventory',
    endpoint: '/api/inventory/import',
    acceptedFormats: ['.csv', '.xlsx', '.xls'],
    templateFields: ['sku', 'name', 'description', 'location', 'quantity', 'status', 'presentation', 'unit_price', 'track_by_lot', 'track_by_serial', 'track_expiration', 'min_quantity', 'max_quantity', 'image_url'],
    maxFileSize: 10,
    templateType: 'inventory'
  };

  constructor(
    private inventoryService: InventoryService,
    private authService: AuthorizationService,
    private alertService: AlertService,
    private languageService: LanguageService,
    private dialogService: ZardDialogService
  ) {}

  ngOnInit(): void {
    this.loadInventory();
  }

  /**
   * @description Get translation for a key
   */
  t(key: string): string {
    return this.languageService.translate(key);
  }

  /**
   * @description Check if user is admin
   */
  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  /**
   * @description Load all inventory items
   */
  async loadInventory(): Promise<void> {
    try {
      this.isLoading = true;
      const response = await this.inventoryService.getAll();
      
      if (response.result.success && response.data) {
        this.inventory = response.data;
        this.exportConfig.data = this.inventory;
      }
      // When data is empty or load fails, no error toast; UI shows "No data" state.
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * @description Open create dialog
   */
  openCreateDialog(): void {
    this.selectedInventory = null;
    this.isCreateDialogOpen = true;
  }

  /**
   * @description Close create dialog
   */
  closeCreateDialog(): void {
    this.isCreateDialogOpen = false;
    this.selectedInventory = null;
  }

  /**
   * @description Open edit dialog
   */
  openEditDialog(inventory: Inventory): void {
    this.selectedInventory = inventory;
    this.isCreateDialogOpen = true;
  }

  /**
   * @description Handle successful inventory operation
   */
  onInventorySuccess(): void {
    this.closeCreateDialog();
    this.loadInventory();
    const message = this.selectedInventory 
      ? this.t('inventory_updated_successfully') 
      : this.t('inventory_created_successfully');
    this.alertService.success(message);
  }

  /**
   * @description Handle inventory deletion
   */
  onInventoryDeleted(): void {
    this.loadInventory();
    this.alertService.success(this.t('inventory_deleted_successfully'));
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
    this.exportConfig.data = this.inventory;
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

  onImportSuccess(_result: ImportResult): void {
    this.alertService.success(this.t('import_successful'));
    this.loadInventory();
  }

  onImportError(error: string): void {
    this.alertService.error(error || this.t('failed_to_import_inventory'));
  }

  onExportSuccess(): void {
    this.alertService.success(this.t('export_successful'));
  }


}
