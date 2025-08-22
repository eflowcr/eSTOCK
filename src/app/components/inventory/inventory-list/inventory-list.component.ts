import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Inventory } from '../../../models/inventory.model';
import { AlertService } from '../../../services/extras/alert.service';
import { AuthorizationService } from '../../../services/extras/authorization.service';
import { LanguageService } from '../../../services/extras/language.service';
import { InventoryService } from '../../../services/inventory.service';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory-list.component.html',
  styleUrls: ['./inventory-list.component.css']
})
export class InventoryListComponent {
  @Input() inventory: Inventory[] = [];
  @Input() isLoading = false;
  @Output() editInventory = new EventEmitter<Inventory>();
  @Output() deleteInventory = new EventEmitter<void>();

  viewingInventory: Inventory | null = null;
  deletingInventoryId: number | null = null;
  deletingLocation: string | null = null;
  isDeleting = false;

  // Search and filter properties
  searchTerm = '';
  statusFilter = '';
  locationFilter = '';
  presentationFilter = '';
  trackingFilter = '';
  sortBy = 'sku';
  sortOrder: 'asc' | 'desc' = 'asc';
  filtersExpanded = false;

  // Pagination
  itemsPerPage = 25; // batch size for infinite scroll
  visibleCount = this.itemsPerPage;
  isLoadingMore = false;

  constructor(
    private inventoryService: InventoryService,
    private languageService: LanguageService,
    private alertService: AlertService,
    private authService: AuthorizationService
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  /**
   * @description Check if user is admin
   */
  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  /**
   * @description Toggle filters visibility
   */
  toggleFilters(): void {
    this.filtersExpanded = !this.filtersExpanded;
  }

  /**
   * @description Check if there are active filters
   */
  hasActiveFilters(): boolean {
    return this.searchTerm !== '' || 
           this.statusFilter !== '' || 
           this.locationFilter !== '' || 
           this.presentationFilter !== '' ||
           this.trackingFilter !== '';
  }

  /**
   * @description Clear all filters
   */
  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.locationFilter = '';
    this.presentationFilter = '';
    this.trackingFilter = '';
    this.resetVisible();
  }

  /**
   * @description Handle search input
   */
  onSearch(term: string): void {
    this.searchTerm = term;
    this.resetVisible();
  }

  /**
   * @description Get filtered and sorted inventory
   */
  get filteredInventory(): Inventory[] {
    let filtered = this.inventory.filter(item => {
      const matchesSearch = !this.searchTerm || 
        item.sku.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (item.name && item.name.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        item.location.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus = !this.statusFilter || item.status === this.statusFilter;
      const matchesLocation = !this.locationFilter || item.location === this.locationFilter;
      const matchesPresentation = !this.presentationFilter || item.presentation === this.presentationFilter;
      
      const matchesTracking = !this.trackingFilter || this.matchesTrackingFilter(item, this.trackingFilter);

      return matchesSearch && matchesStatus && matchesLocation && matchesPresentation && matchesTracking;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[this.sortBy as keyof Inventory];
      let bValue: any = b[this.sortBy as keyof Inventory];

      if (this.sortBy === 'quantity') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else {
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
      }

      if (aValue < bValue) return this.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }

  /**
   * @description Get inventory currently visible (infinite scroll window)
   */
  get visibleInventory(): Inventory[] {
    return this.filteredInventory.slice(0, this.visibleCount);
  }

  /**
   * @description Whether all items are loaded in current view
   */
  get allLoaded(): boolean {
    return this.visibleCount >= this.filteredInventory.length;
  }

  /**
   * @description Get unique locations for filter
   */
  get uniqueLocations(): string[] {
    return Array.from(new Set(this.inventory.map(item => item.location).filter(Boolean)));
  }

  /**
   * @description Get unique presentations for filter
   */
  get uniquePresentations(): string[] {
    return Array.from(new Set(this.inventory.map(item => item.presentation).filter(Boolean)));
  }

  /**
   * @description Handle sort change
   */
  onSort(field: string): void {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'asc';
    }
    this.resetVisible();
  }

  /**
   * @description Handle filter changes (reset visible window)
   */
  onFilterChange(): void {
    this.resetVisible();
  }

  /**
   * @description Change items per page (batch size)
   */
  changeItemsPerPage(items: number): void {
    this.itemsPerPage = items;
    this.resetVisible();
  }

  /**
   * @description Check if item matches tracking filter
   */
  matchesTrackingFilter(item: Inventory, filter: string): boolean {
    switch (filter) {
      case 'lot_only':
        return item.track_by_lot && !item.track_by_serial;
      case 'serial_only':
        return !item.track_by_lot && item.track_by_serial;
      case 'both':
        return item.track_by_lot && item.track_by_serial;
      case 'none':
        return !item.track_by_lot && !item.track_by_serial;
      default:
        return true;
    }
  }

  /**
   * @description Get status badge class
   */
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'reserved': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'damaged': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }

  /**
   * @description View inventory details
   */
  viewInventory(inventory: Inventory): void {
    this.viewingInventory = inventory;
  }

  /**
   * @description Close view modal
   */
  closeViewModal(): void {
    this.viewingInventory = null;
  }

  /**
   * @description Edit inventory
   */
  editInventoryItem(inventory: Inventory): void {
    this.editInventory.emit(inventory);
  }

  /**
   * @description Confirm delete inventory
   */
  confirmDelete(inventory: Inventory): void {
    this.deletingInventoryId = inventory.id;
    this.deletingLocation = inventory.location;
  }

  /**
   * @description Close delete dialog
   */
  closeDeleteDialog(): void {
    this.deletingInventoryId = null;
    this.deletingLocation = null;
  }

  /**
   * @description Delete inventory
   */
  async deleteInventoryItem(): Promise<void> {
    if (!this.deletingInventoryId || !this.deletingLocation) return;

    try {
      this.isDeleting = true;
      const response = await this.inventoryService.delete(this.deletingInventoryId, this.deletingLocation);
      
      if (response.result.success) {
        this.alertService.success(this.t('inventory_deleted_successfully'));
        this.deleteInventory.emit();
        this.closeDeleteDialog();
      } else {
        this.alertService.error(this.t('failed_to_delete_inventory'));
      }
    } catch (error) {
      console.error('Error deleting inventory:', error);
      this.alertService.error(this.t('failed_to_delete_inventory'));
    } finally {
      this.isDeleting = false;
    }
  }

  /**
   * @description Get page numbers for pagination
   */
  getPageNumbers(): (number | string)[] {
    // Not used with infinite scroll; kept for compatibility if needed
    return [];
  }

  /**
   * @description Math object for template access
   */
  get Math() {
    return Math;
  }

  /**
   * @description Handle backdrop click
   */
  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeViewModal();
      this.closeDeleteDialog();
    }
  }

  /**
   * @description Handle internal table scroll to implement infinite loading
   */
  onTableScroll(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target) return;
    const thresholdPx = 200;
    const reachedBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - thresholdPx;
    if (reachedBottom) {
      this.loadMore();
    }
  }

  private loadMore(): void {
    if (this.isLoadingMore || this.allLoaded) return;
    this.isLoadingMore = true;
    // Simulate async to avoid blocking UI; adjust count in next macrotask
    setTimeout(() => {
      const remaining = this.filteredInventory.length - this.visibleCount;
      const toAdd = Math.min(this.itemsPerPage, remaining);
      this.visibleCount += toAdd;
      this.isLoadingMore = false;
    }, 0);
  }

  private resetVisible(): void {
    this.visibleCount = this.itemsPerPage;
  }
}
