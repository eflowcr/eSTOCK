import { Component, OnInit, signal, Output, EventEmitter } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { InventoryMovement } from '@app/models/inventory-movement.model';
import { Inventory } from '@app/models/inventory.model';
import { InventoryMovementService, InventoryService } from '@app/services';
import { LanguageService } from '@app/services/extras/language.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LoadingSpinnerComponent } from '@app/components/shared/extras/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-dialog-inventory-movements',
  standalone: true,
  imports: [FormsModule, LoadingSpinnerComponent],
  templateUrl: './dialog-inventory-movements.component.html',
  styleUrls: ['./dialog-inventory-movements.component.css']
})
export class DialogInventoryMovementsComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();
  
  movements = signal<InventoryMovement[]>([]);
  availableSkus = signal<string[]>([]);
  filteredSkus = signal<string[]>([]);
  isLoading = signal<boolean>(false);
  
  // Search parameters
  selectedSku: string = '';
  skuSearchTerm: string = '';
  showSkuDropdown: boolean = false;

  constructor(
    private inventoryMovementService: InventoryMovementService,
    private inventoryService: InventoryService,
    private languageService: LanguageService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.loadAvailableSkus();
    this.loadAllMovements();
  }

  async loadAvailableSkus(): Promise<void> {
    try {
      const response = await this.inventoryService.getAll();
      if (response.result.success && response.data) {
        const uniqueSkus = [...new Set(response.data.map(item => item.sku))].sort();
        this.availableSkus.set(uniqueSkus);
        this.filteredSkus.set(uniqueSkus);
      }
    } catch (error) {
      console.error('Error loading SKUs:', error);
    }
  }

  async loadAllMovements(): Promise<void> {
    this.isLoading.set(true);
    try {
      const response = await this.inventoryMovementService.getAll();
      if (response.result.success && response.data) {
        // Ordenar por fecha más reciente primero
        const sortedMovements = response.data.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        this.movements.set(sortedMovements);
      } else {
        this.alertService.error(
          this.t('inventory_movements_load_error'),
          this.t('error')
        );
      }
    } catch (error) {
      console.error('Error loading movements:', error);
      this.alertService.error(
        this.t('inventory_movements_load_error'),
        this.t('error')
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadMovementsBySku(sku: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const response = await this.inventoryMovementService.getMovementsBySku(sku);
      if (response.result.success && response.data) {
        // Ordenar por fecha más reciente primero
        const sortedMovements = response.data.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        this.movements.set(sortedMovements);
      } else {
        this.alertService.error(
          this.t('inventory_movements_load_error'),
          this.t('error')
        );
      }
    } catch (error) {
      console.error('Error loading movements by SKU:', error);
      this.alertService.error(
        this.t('inventory_movements_load_error'),
        this.t('error')
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  onSkuSearchChange(): void {
    const searchTerm = this.skuSearchTerm.toLowerCase();
    const filtered = this.availableSkus().filter(sku => 
      sku.toLowerCase().includes(searchTerm)
    );
    this.filteredSkus.set(filtered);
    this.showSkuDropdown = this.skuSearchTerm.length > 0 && filtered.length > 0;
  }

  selectSku(sku: string): void {
    this.selectedSku = sku;
    this.skuSearchTerm = sku;
    this.showSkuDropdown = false;
  }

  clearSkuFilter(): void {
    this.selectedSku = '';
    this.skuSearchTerm = '';
    this.showSkuDropdown = false;
    this.filteredSkus.set(this.availableSkus());
  }

  onSearch(): void {
    if (this.selectedSku.trim()) {
      this.loadMovementsBySku(this.selectedSku);
    } else {
      this.loadAllMovements();
    }
  }

  onSkuInputFocus(): void {
    this.showSkuDropdown = this.filteredSkus().length > 0;
  }

  onSkuInputBlur(): void {
    // Delay hiding dropdown to allow click on options
    setTimeout(() => {
      this.showSkuDropdown = false;
    }, 200);
  }

  getMovementTypeClass(type: string): string {
    switch (type.toLowerCase()) {
      case 'in':
      case 'entrada':
      case 'ingreso':
        return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700';
      case 'out':
      case 'salida':
      case 'egreso':
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700';
      case 'adjustment':
      case 'ajuste':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700';
      case 'transfer':
      case 'transferencia':
        return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-700';
    }
  }

  getMovementTypeText(type: string): string {
    switch (type.toLowerCase()) {
      case 'in':
        return this.t('entrada');
      case 'out':
        return this.t('salida');
      case 'adjustment':
        return this.t('ajuste');
      case 'transfer':
        return this.t('transferencia');
      default:
        return type;
    }
  }

  formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  }

  formatQuantity(quantity: number): string {
    return quantity >= 0 ? `+${quantity}` : `${quantity}`;
  }

  closeDialog(): void {
    this.closed.emit();
  }

  t(key: string): string {
    return this.languageService.translate(key);
  }
}
