import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Adjustment } from '../../../models/adjustment.model';
import { User } from '../../../models/user.model';
import { UserService } from '../../../services/user.service';
import { LanguageService } from '../../../services/extras/language.service';

@Component({
  selector: 'app-adjustment-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './adjustment-list.component.html',
  styleUrl: './adjustment-list.component.css'
})
export class AdjustmentListComponent implements OnInit {
  @Input() adjustments: Adjustment[] = [];
  @Input() isLoading = false;

  users: User[] = [];

  // Search and filter properties
  searchTerm = '';
  reasonFilter = '';
  sortBy = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';

  // Pagination - Changed to infinite scroll like inventory
  itemsPerPage = 25; // batch size for infinite scroll
  visibleCount = this.itemsPerPage;
  isLoadingMore = false;

  constructor(
    private userService: UserService,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  /**
   * Load users for display
   */
  private async loadUsers(): Promise<void> {
    try {
      const response = await this.userService.getAll();
      this.users = response.data || [];
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  /**
   * Get user display name
   */
  getUserDisplay(userId: string): string {
    const user = this.users.find(u => u.id === userId);
    if (!user) {
      return userId;
    }
    
    // Display full name if available, otherwise email
    const displayName = user.first_name && user.last_name 
      ? `${user.first_name} ${user.last_name}`
      : user.email;

    return displayName;
  }

  /**
   * Get filtered and sorted adjustments
   */
  get filteredAdjustments(): Adjustment[] {
    let filtered = this.adjustments.filter(adjustment => {
      // Search filter
      if (this.searchTerm) {
        const searchLower = this.searchTerm.toLowerCase();
        const matchesSearch = (
          adjustment.sku.toLowerCase().includes(searchLower) ||
          adjustment.location.toLowerCase().includes(searchLower) ||
          (adjustment.notes && adjustment.notes.toLowerCase().includes(searchLower))
        );
        if (!matchesSearch) return false;
      }

      // Reason filter
      if (this.reasonFilter && this.reasonFilter !== 'all') {
        if (adjustment.reason !== this.reasonFilter) return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (this.sortBy) {
        case 'sku':
          aValue = a.sku || '';
          bValue = b.sku || '';
          break;
        case 'location':
          aValue = a.location || '';
          bValue = b.location || '';
          break;
        case 'adjustmentQuantity':
          aValue = a.adjustment_quantity || 0;
          bValue = b.adjustment_quantity || 0;
          break;
        case 'reason':
          aValue = a.reason || '';
          bValue = b.reason || '';
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
      }

      let comparison: number;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return this.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }

  /**
   * Get paginated adjustments
   */
  get visibleAdjustments(): Adjustment[] {
    return this.filteredAdjustments.slice(0, this.visibleCount);
  }

  /**
   * Whether all items are loaded in current view
   */
  get allLoaded(): boolean {
    return this.visibleCount >= this.filteredAdjustments.length;
  }

  /**
   * Handle search
   */
  onSearch(): void {
    this.resetVisible();
  }

  /**
   * Handle sort
   */
  sort(field: string): void {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'asc';
    }
    this.resetVisible();
  }

  /**
   * Handle internal table scroll to implement infinite loading
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
      const remaining = this.filteredAdjustments.length - this.visibleCount;
      const toAdd = Math.min(this.itemsPerPage, remaining);
      this.visibleCount += toAdd;
      this.isLoadingMore = false;
    }, 0);
  }

  private resetVisible(): void {
    this.visibleCount = this.itemsPerPage;
  }

  /**
   * Get adjustment quantity badge class
   */
  getAdjustmentBadgeClass(quantity: number): string {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    
    if (quantity >= 0) {
      return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
    } else {
      return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
    }
  }

  /**
   * Format date
   */
  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}