import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Article } from '../../../models/article.model';
import { AlertService } from '../../../services/extras/alert.service';
import { AuthorizationService } from '../../../services/extras/authorization.service';
import { LanguageService } from '../../../services/extras/language.service';
import { ArticleService } from '../../../services/article.service';

@Component({
  selector: 'app-article-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './article-list.component.html',
  styleUrls: ['./article-list.component.css']
})
export class ArticleListComponent {
  @Input() articles: Article[] = [];
  @Input() isLoading = false;
  @Output() articlesChanged = new EventEmitter<void>();
  @Output() editArticle = new EventEmitter<Article>();

  viewingArticle: Article | null = null;
  deletingArticleId: number | null = null;
  isDeleting = false;

  // Search and filter properties
  searchTerm = '';
  presentationFilter = '';
  trackingFilter = '';
  statusFilter = '';
  sortBy = 'sku';
  sortOrder: 'asc' | 'desc' = 'asc';
  filtersExpanded = false;

  // Pagination
  currentPage = 1;
  itemsPerPage = 25;

  constructor(
    private articleService: ArticleService,
    private languageService: LanguageService,
    private alertService: AlertService,
    private authService: AuthorizationService
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  /**
   * Get filtered and sorted articles
   */
  get filteredArticles(): Article[] {
    let filtered = this.articles.filter(article => {
      // Search filter
      if (this.searchTerm) {
        const searchLower = this.searchTerm.toLowerCase();
        const matchesSearch = (
          article.sku.toLowerCase().includes(searchLower) ||
          article.name.toLowerCase().includes(searchLower) ||
          (article.description && article.description.toLowerCase().includes(searchLower))
        );
        if (!matchesSearch) return false;
      }

      // Presentation filter
      if (this.presentationFilter && this.presentationFilter !== 'all') {
        if (article.presentation !== this.presentationFilter) return false;
      }

      // Tracking filter
      if (this.trackingFilter && this.trackingFilter !== 'all') {
        if (this.trackingFilter === 'lot' && !article.track_by_lot) return false;
        if (this.trackingFilter === 'serial' && !article.track_by_serial) return false;
        if (this.trackingFilter === 'both' && (!article.track_by_lot || !article.track_by_serial)) return false;
        if (this.trackingFilter === 'none' && (article.track_by_lot || article.track_by_serial)) return false;
      }

      // Status filter
      if (this.statusFilter && this.statusFilter !== 'all') {
        if (this.statusFilter === 'active' && !article.is_active) return false;
        if (this.statusFilter === 'inactive' && article.is_active) return false;
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
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'unit_price':
          aValue = a.unit_price || 0;
          bValue = b.unit_price || 0;
          break;
        case 'presentation':
          aValue = a.presentation || '';
          bValue = b.presentation || '';
          break;
        default:
          aValue = a.sku || '';
          bValue = b.sku || '';
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
   * Get paginated articles
   */
  get paginatedArticles(): Article[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredArticles.slice(startIndex, endIndex);
  }

  /**
   * Get total pages
   */
  get totalPages(): number {
    return Math.ceil(this.filteredArticles.length / this.itemsPerPage);
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  /**
   * Toggle filters
   */
  toggleFilters(): void {
    this.filtersExpanded = !this.filtersExpanded;
  }

  /**
   * Check if there are active filters
   */
  hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.presentationFilter || this.trackingFilter || this.statusFilter);
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.searchTerm = '';
    this.presentationFilter = '';
    this.trackingFilter = '';
    this.statusFilter = '';
    this.currentPage = 1;
  }

  /**
   * Handle search
   */
  onSearch(): void {
    this.currentPage = 1;
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
    this.currentPage = 1;
  }

  /**
   * Change page
   */
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  /**
   * Open edit form
   */
  openEditForm(article: Article): void {
    this.editArticle.emit(article);
  }

  /**
   * View article details
   */
  viewArticle(article: Article): void {
    this.viewingArticle = article;
  }

  /**
   * Close view modal
   */
  closeViewModal(): void {
    this.viewingArticle = null;
  }

  /**
   * Open delete dialog
   */
  openDeleteDialog(articleId: number): void {
    this.deletingArticleId = articleId;
  }

  /**
   * Close delete dialog
   */
  closeDeleteDialog(): void {
    this.deletingArticleId = null;
  }

  /**
   * Delete article
   */
  async deleteArticle(): Promise<void> {
    if (!this.deletingArticleId) return;

    try {
      this.isDeleting = true;
      await this.articleService.delete(this.deletingArticleId);
      this.alertService.success(this.t('article_deleted_successfully'));
      this.articlesChanged.emit();
      this.closeDeleteDialog();
    } catch (error) {
      console.error('Error deleting article:', error);
      this.alertService.error(this.t('error_deleting_article'));
    } finally {
      this.isDeleting = false;
    }
  }



  /**
   * Get presentation badge class
   */
  getPresentationBadgeClass(presentation: string): string {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    
    switch (presentation) {
      case 'unit':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`;
      case 'box':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
      case 'pallet':
        return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200`;
      case 'pack':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200`;
    }
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(isActive: boolean): string {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    
    if (isActive) {
      return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
    } else {
      return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
    }
  }

  /**
   * Format price
   */
  formatPrice(price: number | null): string {
    if (!price || price === 0) return '-';
    return price.toFixed(2);
  }

  /**
   * Get tracking status
   */
  getTrackingStatus(article: Article): { lot: boolean; serial: boolean; expiration: boolean } {
    return {
      lot: article.track_by_lot,
      serial: article.track_by_serial,
      expiration: article.track_expiration
    };
  }

  /**
   * Math object for template access
   */
  get Math() {
    return Math;
  }
}
