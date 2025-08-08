import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { EnhancedInventory } from '../../../models/inventory.model';
import { AlertService } from '../../../services/extras/alert.service';
import { AuthorizationService } from '../../../services/extras/authorization.service';
import { LanguageService } from '../../../services/extras/language.service';
import { InventoryService } from '../../../services/inventory.service';
import { MainLayoutComponent } from '../../layout/main-layout.component';
import { DataExportComponent, DataExportConfig } from '../../shared/data-export/data-export.component';
import { FileImportComponent, FileImportConfig, ImportResult } from '../../shared/file-import/file-import.component';
import { InventoryListComponent } from '../inventory-list/inventory-list.component';
import { InventoryFormComponent } from '../inventory-form/inventory-form.component';

@Component({
  selector: 'app-inventory-management',
  standalone: true,
  imports: [
    CommonModule,
    FileImportComponent,
    DataExportComponent,
    MainLayoutComponent,
    InventoryListComponent,
    InventoryFormComponent
  ],
  templateUrl: './inventory-management.component.html',
  styleUrls: ['./inventory-management.component.css']
})
export class InventoryManagementComponent implements OnInit {
  inventory: EnhancedInventory[] = [];
  isLoading = false;
  isCreateDialogOpen = false;
  isImportDialogOpen = false;
  isExportDialogOpen = false;
  selectedInventory: EnhancedInventory | null = null;

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
    templateFields: ['sku', 'name', 'description', 'location', 'quantity', 'status', 'presentation', 'unit_price'],
    maxFileSize: 10,
    templateType: 'inventory'
  };

  constructor(
    private inventoryService: InventoryService,
    private authService: AuthorizationService,
    private alertService: AlertService,
    private languageService: LanguageService
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
      
      if (response.result.success) {
        this.inventory = response.data;
        this.exportConfig.data = this.inventory;
      } else {
        this.alertService.error(this.t('failed_to_load_inventory'));
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
      this.alertService.error(this.t('failed_to_load_inventory'));
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
  openEditDialog(inventory: EnhancedInventory): void {
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

  /**
   * @description Open import dialog
   */
  openImportDialog(): void {
    this.isImportDialogOpen = true;
  }

  /**
   * @description Close import dialog
   */
  closeImportDialog(): void {
    this.isImportDialogOpen = false;
  }

  /**
   * @description Handle successful import
   */
  onImportSuccess(result: ImportResult): void {
    this.closeImportDialog();
    this.loadInventory();
    this.alertService.success(
      this.t('import_completed_successfully') + 
      ` (${result.successful} ${this.t('items_processed')})`
    );
  }

  /**
   * @description Handle import error
   */
  onImportError(error: string): void {
    this.alertService.error(error);
  }

  /**
   * @description Open export dialog
   */
  openExportDialog(): void {
    this.exportConfig.data = this.inventory;
    this.isExportDialogOpen = true;
  }

  /**
   * @description Close export dialog
   */
  closeExportDialog(): void {
    this.isExportDialogOpen = false;
  }

  /**
   * @description Handle successful export
   */
  onExportSuccess(): void {
    this.closeExportDialog();
    this.alertService.success(this.t('export_completed_successfully'));
  }
}
