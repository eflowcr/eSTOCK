import { CommonModule } from '@angular/common';
import { Component, computed, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';

import { BarcodeItem } from '@app/models/barcode.model';
import { ArticleService } from '@app/services/article.service';
import { BarcodeService } from '@app/services/barcode.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { LoadingService } from '@app/services/extras/loading.service';
import { LocationService } from '@app/services/location.service';
import { LotService } from '@app/services/lot.service';
import { PickingTaskService } from '@app/services/picking-task.service';
import { ReceivingTaskService } from '@app/services/receiving-task.service';
import { SerialService } from '@app/services/serial.service';

import { BarcodeGeneratorDialogComponent } from '@app/components/barcode-generator/barcode-generator-dialog/barcode-generator-dialog.component';
import { MainLayoutComponent } from '@app/components/layout/main-layout.component';
import { LoadingSpinnerComponent } from '@app/components/shared/extras/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-barcode-generator-management',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    MainLayoutComponent, 
    LoadingSpinnerComponent,
    BarcodeGeneratorDialogComponent
  ],
  templateUrl: './barcode-generator-management.component.html',
  styleUrl: './barcode-generator-management.component.css'
})
export class BarcodeGeneratorManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Signals for reactive state management
  isLoading = signal(false);
  activeTab = signal<'skus' | 'locations' | 'tasks'>('skus');
  selectedItems = signal<BarcodeItem[]>([]);
  expandedSkus = signal<Set<string>>(new Set());
  showDialog = signal(false);

  // Search filters
  skuSearch = signal('');
  locationSearch = signal('');
  taskSearch = signal('');

  // Data signals
  articles = signal<any[]>([]);
  locations = signal<any[]>([]);
  receivingTasks = signal<any[]>([]);
  pickingTasks = signal<any[]>([]);
  lotsData = signal<any[]>([]);
  serialsData = signal<any[]>([]);

  // Computed filtered data
  filteredArticles = computed(() => {
    const search = this.skuSearch().toLowerCase();
    if (!search) return this.articles();
    
    return this.articles().filter(article =>
      article.sku?.toLowerCase().includes(search) ||
      article.name?.toLowerCase().includes(search)
    );
  });

  filteredLocations = computed(() => {
    const search = this.locationSearch().toLowerCase();
    if (!search) return this.locations();
    
    return this.locations().filter(location =>
      location.locationCode?.toLowerCase().includes(search) ||
      location.description?.toLowerCase().includes(search)
    );
  });

  filteredTasks = computed(() => {
    const search = this.taskSearch().toLowerCase();
    const allTasks = [...this.receivingTasks(), ...this.pickingTasks()];
    if (!search) return allTasks;
    
    return allTasks.filter(task =>
      task.taskId?.toLowerCase().includes(search) ||
      task.description?.toLowerCase().includes(search)
    );
  });

  // Computed barcode items
  skuBarcodeItems = computed(() => 
    this.barcodeService.convertArticlesToBarcodeItems(this.filteredArticles())
  );

  locationBarcodeItems = computed(() => 
    this.barcodeService.convertLocationsToBarcodeItems(this.filteredLocations())
  );

  taskBarcodeItems = computed(() => 
    this.barcodeService.convertTasksToBarcodeItems(this.filteredTasks())
  );

  constructor(
    private barcodeService: BarcodeService,
    private articleService: ArticleService,
    private locationService: LocationService,
    private pickingTaskService: PickingTaskService,
    private receivingTaskService: ReceivingTaskService,
    private lotService: LotService,
    private serialService: SerialService,
    private languageService: LanguageService,
    private alertService: AlertService,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    document.body.classList.add('barcode-generator-page');
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    document.body.classList.remove('barcode-generator-page');
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadInitialData(): Promise<void> {
    this.isLoading.set(true);

    try {
      // Cargar datos en paralelo
      const [
        articlesResponse,
        locationsResponse,
        pickingTasksResponse,
        receivingTasksResponse
      ] = await Promise.all([
        this.articleService.getAll(),
        this.locationService.getAll(),
        this.pickingTaskService.getAll(),
        this.receivingTaskService.getAll()
      ]);

      if (articlesResponse.result.success) {
        this.articles.set(articlesResponse.data || []);
      }

      if (locationsResponse.result.success) {
        this.locations.set(locationsResponse.data || []);
      }

      if (pickingTasksResponse.result.success) {
        this.pickingTasks.set(pickingTasksResponse.data || []);
      }

      if (receivingTasksResponse.result.success) {
        this.receivingTasks.set(receivingTasksResponse.data || []);
      }

    } catch (error) {
      console.error('Error loading initial data:', error);
      this.alertService.error(
        this.languageService.translate('BARCODE.LOAD_DATA_ERROR'),
        this.languageService.translate('COMMON.ERROR')
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  // Tab management
  setActiveTab(tab: 'skus' | 'locations' | 'tasks'): void {
    this.activeTab.set(tab);
  }

  // Search methods
  updateSkuSearch(search: string): void {
    this.skuSearch.set(search);
  }

  updateLocationSearch(search: string): void {
    this.locationSearch.set(search);
  }

  updateTaskSearch(search: string): void {
    this.taskSearch.set(search);
  }

  // Item selection methods
  isItemSelected(item: BarcodeItem): boolean {
    return this.selectedItems().some(selected => selected.id === item.id);
  }

  handleItemSelect(item: BarcodeItem, checked: boolean): void {
    if (checked) {
      this.selectedItems.update(current => [...current, item]);
    } else {
      this.selectedItems.update(current => current.filter(selected => selected.id !== item.id));
    }
  }

  toggleItemSelection(item: BarcodeItem, event: Event): void {
    // Prevent toggle if clicking on buttons or other interactive elements
    const target = event.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }
    
    const isCurrentlySelected = this.isItemSelected(item);
    this.handleItemSelect(item, !isCurrentlySelected);
  }

  isAllSelected(items: BarcodeItem[]): boolean {
    return items.length > 0 && items.every(item => this.isItemSelected(item));
  }

  isSomeSelected(items: BarcodeItem[]): boolean {
    return items.some(item => this.isItemSelected(item)) && !this.isAllSelected(items);
  }

  handleSelectAll(items: BarcodeItem[], checked: boolean): void {
    if (checked) {
      const newItems = items.filter(item => 
        !this.selectedItems().some(selected => selected.id === item.id)
      );
      this.selectedItems.update(current => [...current, ...newItems]);
    } else {
      const itemIds = items.map(item => item.id);
      this.selectedItems.update(current => 
        current.filter(item => !itemIds.includes(item.id))
      );
    }
  }

  clearSelection(): void {
    this.selectedItems.set([]);
  }

  // SKU expansion methods
  isSkuExpanded(sku: string): boolean {
    return this.expandedSkus().has(sku);
  }

  toggleSkuExpansion(sku: string): void {
    this.expandedSkus.update(current => {
      const newSet = new Set(current);
      if (newSet.has(sku)) {
        newSet.delete(sku);
      } else {
        newSet.add(sku);
        // Cargar lotes y series para este SKU
        this.loadSkuDetails(sku);
      }
      return newSet;
    });
  }

  private async loadSkuDetails(sku: string): Promise<void> {
    try {
      const [lotsResponse, serialsResponse] = await Promise.all([
        this.lotService.getBySku(sku),
        this.serialService.getBySku(sku)
      ]);

      if (lotsResponse.result.success) {
        const currentLots = this.lotsData();
        const newLots = lotsResponse.data || [];
        this.lotsData.set([...currentLots, ...newLots]);
      }

      if (serialsResponse.result.success) {
        const currentSerials = this.serialsData();
        const newSerials = serialsResponse.data || [];
        this.serialsData.set([...currentSerials, ...newSerials]);
      }
    } catch (error) {
      console.error('Error loading SKU details:', error);
    }
  }

  // Get lots and serials for SKU
  getLotsForSku(sku: string): any[] {
    return this.lotsData().filter(lot => lot.sku === sku);
  }

  getSerialsForSku(sku: string): any[] {
    return this.serialsData().filter(serial => serial.sku === sku);
  }

  // Handle lot/serial selection
  handleLotSelect(lot: any, sku: string, checked: boolean): void {
    const lotItems = this.barcodeService.convertLotsToBarcodItems([lot], sku);
    if (lotItems.length > 0) {
      this.handleItemSelect(lotItems[0], checked);
    }
  }

  handleSerialSelect(serial: any, sku: string, checked: boolean): void {
    const serialItems = this.barcodeService.convertSerialsToBarcodItems([serial], sku);
    if (serialItems.length > 0) {
      this.handleItemSelect(serialItems[0], checked);
    }
  }

  // Check if lot/serial is selected
  isLotSelected(lot: any, sku: string): boolean {
    const lotId = `lot-${lot.id}`;
    return this.selectedItems().some(item => item.id === lotId);
  }

  isSerialSelected(serial: any, sku: string): boolean {
    const serialId = `serial-${serial.serialNumber || serial.id}`;
    return this.selectedItems().some(item => item.id === serialId);
  }

  // Generate labels
  generateLabels(): void {
    if (this.selectedItems().length === 0) {
      this.alertService.error(
        this.languageService.translate('BARCODE.NO_ITEMS_SELECTED'),
        this.languageService.translate('COMMON.ERROR')
      );
      return;
    }

    this.showDialog.set(true);
  }

  // Handle dialog close
  onDialogClose(result: boolean): void {
    this.showDialog.set(false);
    if (result) {
      // Clear selection after successful generation
      this.clearSelection();
    }
  }

  // Translation helper
  /**
   * Get translation
   */
  t(key: string, params?: any): string {
    return this.languageService.translate(key);
  }

  // Get current tab items
  getCurrentTabItems(): BarcodeItem[] {
    switch (this.activeTab()) {
      case 'skus':
        return this.skuBarcodeItems();
      case 'locations':
        return this.locationBarcodeItems();
      case 'tasks':
        return this.taskBarcodeItems();
      default:
        return [];
    }
  }

  // Get tab counts
  getSkuCount(): number {
    return this.articles().length;
  }

  getLocationCount(): number {
    return this.locations().length;
  }

  getTaskCount(): number {
    return this.receivingTasks().length + this.pickingTasks().length;
  }

  // Get article for SKU
  getArticleForSku(sku: string): any | null {
    return this.articles().find(a => a.sku === sku) || null;
  }

  // Get location for code
  getLocationForCode(code: string): any | null {
    return this.locations().find(l => l.location_code === code) || null;
  }

  // Get task for code
  getTaskForCode(code: string): any | null {
    const allTasks = [...this.receivingTasks(), ...this.pickingTasks()];
    return this.taskBarcodeItems().find(t => t.code === code) || null;
  }

  // Check if article has tracking
  hasTracking(article: any): boolean {
    if (!article) return false;
    const lots = this.getLotsForSku(article.sku);
    const serials = this.getSerialsForSku(article.sku);
    return (article.trackByLot && lots.length > 0) || (article.trackBySerial && serials.length > 0);
  }

  // Format date
  formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString || 'N/A';
    }
  }

  // Get status badge CSS classes
  getStatusBadgeClass(status: string): string {
    const baseClasses = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium';
    
    switch (status?.toLowerCase()) {
      case 'completado':
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
      case 'abierto':
      case 'open':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`;
      case 'en progreso':
      case 'in_progress':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`;
      case 'cancelado':
      case 'cancelled':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200`;
    }
  }

  // Get priority badge CSS classes
  getPriorityBadgeClass(priority: string): string {
    const baseClasses = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium';
    
    switch (priority?.toLowerCase()) {
      case 'alto':
      case 'high':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
      case 'medio':
      case 'medium':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`;
      case 'bajo':
      case 'low':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200`;
    }
  }

  // Translation helper functions
  translateStatus(status: string): string {
    if (!status) return status;
    const key = `STATUS.${status.toUpperCase()}`;
    return this.languageService.translate(key) || status;
  }

  translatePriority(priority: string): string {
    if (!priority) return priority;
    const key = `PRIORITY.${priority.toUpperCase()}`;
    return this.languageService.translate(key) || priority;
  }

  translateTaskType(taskType: string): string {
    if (!taskType) return taskType;
    const key = `TASK_TYPE.${taskType.toUpperCase()}`;
    return this.languageService.translate(key) || taskType;
  }

  translateLocationType(locationType: string): string {
    if (!locationType) return locationType;
    const key = `LOCATION.${locationType.toUpperCase()}`;
    return this.languageService.translate(key) || locationType;
  }

  // TrackBy function for ngFor
  trackByItemId(index: number, item: BarcodeItem): string {
    return item.id;
  }
}
