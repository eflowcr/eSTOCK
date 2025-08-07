import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Location } from '../../../models/location.model';
import { AlertService } from '../../../services/extras/alert.service';
import { AuthorizationService } from '../../../services/extras/authorization.service';
import { LanguageService } from '../../../services/extras/language.service';
import { LocationService } from '../../../services/location.service';


@Component({
  selector: 'app-location-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-list.component.html',
  styleUrls: ['./location-list.component.css']
})
export class LocationListComponent {
  @Input() locations: Location[] = [];
  @Input() isLoading = false;
  @Output() refresh = new EventEmitter<void>();
  @Output() edit = new EventEmitter<Location>();
  @Output() updated = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();

  editingLocation: Location | null = null;
  viewingLocation: Location | null = null;
  deletingLocationId: string | null = null;
  isDeleting = false;

  // Search and filter properties
  searchTerm = '';
  typeFilter = '';
  zoneFilter = '';
  statusFilter = '';
  sortBy = 'location_code';
  sortOrder: 'asc' | 'desc' = 'asc';
  filtersExpanded = false;

  constructor(
    private locationService: LocationService,
    private languageService: LanguageService,
    private alertService: AlertService,
    private authService: AuthorizationService
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  getTypeBadgeClass(type: string): string {
    const variants = {
      'PALLET': "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      'SHELF': "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      'BIN': "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      'FLOOR': "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
      'BLOCK': "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    } as const;
    
    return variants[type.toUpperCase() as keyof typeof variants] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
  }

  getStatusBadgeClass(isActive: boolean): string {
    return isActive 
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
  }

  get filteredAndSortedLocations(): Location[] {
    let filtered = this.locations.filter(location => {
      // Search filter
      if (this.searchTerm) {
        const searchLower = this.searchTerm.toLowerCase();
        const matchesSearch = (
          location.location_code.toLowerCase().includes(searchLower) ||
          (location.description && location.description.toLowerCase().includes(searchLower)) ||
          (location.zone && location.zone.toLowerCase().includes(searchLower))
        );
        if (!matchesSearch) return false;
      }

      // Type filter
      if (this.typeFilter && this.typeFilter !== 'all') {
        if (location.type.toUpperCase() !== this.typeFilter.toUpperCase()) return false;
      }

      // Zone filter
      if (this.zoneFilter && this.zoneFilter !== 'all') {
        if (!location.zone || location.zone.toUpperCase() !== this.zoneFilter.toUpperCase()) return false;
      }

      // Status filter
      if (this.statusFilter && this.statusFilter !== 'all') {
        const isActive = this.statusFilter === 'active';
        if (location.is_active !== isActive) return false;
      }

      return true;
    });

    // Sort
    return filtered.sort((a, b) => {
      let aValue: string;
      let bValue: string;

      switch (this.sortBy) {
        case 'location_code':
          aValue = a.location_code || '';
          bValue = b.location_code || '';
          break;
        case 'description':
          aValue = a.description || '';
          bValue = b.description || '';
          break;
        case 'zone':
          aValue = a.zone || '';
          bValue = b.zone || '';
          break;
        case 'type':
          aValue = a.type || '';
          bValue = b.type || '';
          break;
        default:
          aValue = a.location_code || '';
          bValue = b.location_code || '';
      }

      const comparison = aValue.localeCompare(bValue);
      return this.sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  get uniqueTypes(): string[] {
    const types = [...new Set(this.locations.map(l => l.type.toUpperCase()))];
    return types.sort();
  }

  get uniqueZones(): string[] {
    const zones = [...new Set(this.locations.map(l => l.zone).filter(z => z && z.trim() !== ''))] as string[];
    return zones.sort();
  }

  onSort(field: string): void {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'asc';
    }
  }

  onEdit(location: Location): void {
    this.edit.emit(location);
  }

  onView(location: Location): void {
    this.viewingLocation = location;
  }

  closeViewDialog(): void {
    this.viewingLocation = null;
  }

  onDelete(location: Location): void {
    this.deletingLocationId = location.id.toString();
  }

  async confirmDelete(): Promise<void> {
    if (!this.deletingLocationId) return;

    try {
      this.isDeleting = true;
      const response = await this.locationService.delete(this.deletingLocationId);
      
      if (response.result.success) {
        this.alertService.success(
          this.t('success'),
          this.t('location_deleted_successfully')
        );
        this.deleted.emit();
      } else {
        this.alertService.error(
          this.t('error'),
          response.result.message || this.t('failed_to_delete_location')
        );
      }
    } catch (error: any) {
      console.error('Error deleting location:', error);
      let errorMessage = this.t('failed_to_delete_location');
      
      // Handle specific error messages from backend
      if (error?.message) {
        if (error.message.includes('Cannot delete location')) {
          errorMessage = error.message;
        }
      }
      
      this.alertService.error(this.t('error'), errorMessage);
    } finally {
      this.isDeleting = false;
      this.deletingLocationId = null;
    }
  }

  closeDeleteDialog(): void {
    this.deletingLocationId = null;
  }

  toggleFilters(): void {
    this.filtersExpanded = !this.filtersExpanded;
  }

  hasActiveFilters(): boolean {
    return this.typeFilter !== '' || this.zoneFilter !== '' || this.statusFilter !== '';
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.typeFilter = '';
    this.zoneFilter = '';
    this.statusFilter = '';
  }

  trackByLocationId(index: number, location: Location): number {
    return location.id;
  }

  onSearch(term: string): void {
    this.searchTerm = term;
  }
}
