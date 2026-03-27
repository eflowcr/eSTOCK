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
import { DataExportConfig } from '../../shared/data-export/data-export.component';
import { DataExportContentComponent } from '../../shared/data-export/data-export-content.component';
import { InventoryImportDialogComponent } from '../inventory-import-dialog/inventory-import-dialog.component';

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

  exportConfig: DataExportConfig = {
    title: 'Export Inventory',
    endpoint: '/api/inventory/export',
    data: [],
    filename: 'inventory_export'
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
      zContent: InventoryImportDialogComponent,
      zData: { onSuccess: () => this.loadInventory() },
      zHideFooter: true,
      zCustomClasses: 'sm:max-w-[95vw]',
    });
  }

  openExportDialog(): void {
    this.exportConfig.data = this.localizeInventoryExport(this.inventory);
    this.dialogService.create({
      zTitle: this.t('export_data'),
      zDescription: this.t('export_description'),
      zContent: DataExportContentComponent,
      zData: { config: this.exportConfig, onExported: () => this.alertService.success(this.t('export_successful')) },
      zHideFooter: true,
      zCustomClasses: 'sm:max-w-md',
    });
  }

  private localizeInventoryExport(items: Inventory[]): Record<string, any>[] {
    const isEs = this.languageService.getCurrentLanguage() !== 'en';
    const h = isEs ? {
      sku: 'SKU', name: 'Nombre', description: 'Descripción', location: 'Ubicación',
      quantity: 'Cantidad', unit_price: 'Precio Unitario', status: 'Estado',
      presentation: 'Presentación', track_by_lot: 'Rastrear Lote',
      track_by_serial: 'Rastrear Serie', track_expiration: 'Rastrear Expiración',
      min_quantity: 'Cantidad Mínima', max_quantity: 'Cantidad Máxima',
      created_at: 'Creado el', updated_at: 'Actualizado el',
    } : {
      sku: 'SKU', name: 'Name', description: 'Description', location: 'Location',
      quantity: 'Quantity', unit_price: 'Unit Price', status: 'Status',
      presentation: 'Presentation', track_by_lot: 'Track by Lot',
      track_by_serial: 'Track by Serial', track_expiration: 'Track Expiration',
      min_quantity: 'Min Quantity', max_quantity: 'Max Quantity',
      created_at: 'Created At', updated_at: 'Updated At',
    };
    return items.map((i: any) => ({
      [h.sku]: i.sku, [h.name]: i.name, [h.description]: i.description ?? '',
      [h.location]: i.location, [h.quantity]: i.quantity, [h.unit_price]: i.unit_price ?? '',
      [h.status]: i.status, [h.presentation]: i.presentation,
      [h.track_by_lot]: i.track_by_lot, [h.track_by_serial]: i.track_by_serial,
      [h.track_expiration]: i.track_expiration,
      [h.min_quantity]: i.min_quantity ?? '', [h.max_quantity]: i.max_quantity ?? '',
      [h.created_at]: i.created_at, [h.updated_at]: i.updated_at,
    }));
  }


}
