import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EnhancedInventory } from '../../../models/inventory.model';
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
  @Input() inventory: EnhancedInventory[] = [];
  @Input() isLoading = false;
  @Output() refresh = new EventEmitter<void>();
  @Output() editInventory = new EventEmitter<EnhancedInventory>();
  @Output() deleteInventory = new EventEmitter<void>();

  viewingInventory: EnhancedInventory | null = null;
  deletingInventoryId: string | null = null;
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
  currentPage = 1;
  itemsPerPage = 25;

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
    this.currentPage = 1;
  }

  /**
   * @description Handle search input
   */
  onSearch(term: string): void {
    this.searchTerm = term;
    this.currentPage = 1;
  }

  /**
   * @description Get filtered and sorted inventory
   */
  get filteredInventory(): EnhancedInventory[] {
    let filtered = this.inventory.filter(item => {
      const matchesSearch = !this.searchTerm || 
        item.sku.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (item.name && item.name.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        item.location.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus = !this.statusFilter || item.status === this.statusFilter;
      const matchesLocation = !this.locationFilter || item.location === this.locationFilter;
      const matchesPresentation = !this.presentationFilter || item.presentation === this.presentationFilter;
      
      let matchesTracking = true;
      if (this.trackingFilter === 'lot') {
        matchesTracking = item.track_by_lot === true;
      } else if (this.trackingFilter === 'serial') {
        matchesTracking = item.track_by_serial === true;
      } else if (this.trackingFilter === 'both') {
        matchesTracking = item.track_by_lot === true && item.track_by_serial === true;
      } else if (this.trackingFilter === 'none') {
        matchesTracking = !item.track_by_lot && !item.track_by_serial;
      }

      return matchesSearch && matchesStatus && matchesLocation && matchesPresentation && matchesTracking;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[this.sortBy as keyof EnhancedInventory];
      let bValue: any = b[this.sortBy as keyof EnhancedInventory];

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
   * @description Get paginated inventory
   */
  get paginatedInventory(): EnhancedInventory[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredInventory.slice(startIndex, endIndex);
  }

  /**
   * @description Get total pages
   */
  get totalPages(): number {
    return Math.ceil(this.filteredInventory.length / this.itemsPerPage);
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
    this.currentPage = 1;
  }

  /**
   * @description Change page
   */
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  /**
   * @description Change items per page
   */
  changeItemsPerPage(items: number): void {
    this.itemsPerPage = items;
    this.currentPage = 1;
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
  viewInventory(inventory: EnhancedInventory): void {
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
  editInventoryItem(inventory: EnhancedInventory): void {
    this.editInventory.emit(inventory);
  }

  /**
   * @description Confirm delete inventory
   */
  confirmDelete(inventory: EnhancedInventory): void {
    this.deletingInventoryId = inventory.id.toString();
  }

  /**
   * @description Close delete dialog
   */
  closeDeleteDialog(): void {
    this.deletingInventoryId = null;
  }

  /**
   * @description Delete inventory
   */
  async deleteInventoryItem(): Promise<void> {
    if (!this.deletingInventoryId) return;

    try {
      this.isDeleting = true;
      const response = await this.inventoryService.delete(this.deletingInventoryId);
      
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
   * @description Handle backdrop click
   */
  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeViewModal();
      this.closeDeleteDialog();
    }
  }
}
