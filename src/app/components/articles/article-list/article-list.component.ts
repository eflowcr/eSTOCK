import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ColumnDef,
  PaginationState,
  SortingState,
  createAngularTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/angular-table';
import { computed, signal } from '@angular/core';
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
  @Input() set articles(value: Article[]) {
    this.articlesSignal.set(value ?? []);
  }
  @Input() isLoading = false;
  @Output() articlesChanged = new EventEmitter<void>();
  @Output() editArticle = new EventEmitter<Article>();

  viewingArticle: Article | null = null;
  deletingArticleId: number | null = null;
  isDeleting = false;

  // Search and filter state
  searchTerm = '';
  presentationFilter = '';
  trackingFilter = '';
  statusFilter = '';
  sortBy = 'sku';
  sortOrder: 'asc' | 'desc' = 'asc';
  filtersExpanded = false;

  private readonly articlesSignal = signal<Article[]>([]);
  private readonly searchTermSignal = signal('');
  private readonly presentationFilterSignal = signal('');
  private readonly trackingFilterSignal = signal('');
  private readonly statusFilterSignal = signal('');
  private readonly sorting = signal<SortingState>([{ id: 'sku', desc: false }]);
  private readonly pagination = signal<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  readonly filteredArticles = computed(() => {
    const rows = this.articlesSignal();
    const search = this.searchTermSignal().toLowerCase();
    const presentation = this.presentationFilterSignal();
    const tracking = this.trackingFilterSignal();
    const status = this.statusFilterSignal();

    return rows.filter((article) => {
      if (search) {
        const matchesSearch =
          article.sku.toLowerCase().includes(search) ||
          article.name.toLowerCase().includes(search) ||
          (article.description || '').toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      if (presentation && presentation !== 'all') {
        if (article.presentation !== presentation) return false;
      }

      if (tracking && tracking !== 'all') {
        if (tracking === 'lot' && !article.track_by_lot) return false;
        if (tracking === 'serial' && !article.track_by_serial) return false;
        if (tracking === 'both' && (!article.track_by_lot || !article.track_by_serial)) return false;
        if (tracking === 'none' && (article.track_by_lot || article.track_by_serial)) return false;
      }

      if (status && status !== 'all') {
        if (status === 'active' && !article.is_active) return false;
        if (status === 'inactive' && article.is_active) return false;
      }

      return true;
    });
  });

  readonly columns: ColumnDef<Article>[] = [
    {
      id: 'sku',
      accessorKey: 'sku',
      enableSorting: true,
    },
    {
      id: 'name',
      accessorKey: 'name',
      enableSorting: true,
    },
    {
      id: 'description',
      accessorKey: 'description',
      enableSorting: false,
    },
    {
      id: 'unit_price',
      accessorKey: 'unit_price',
      enableSorting: true,
    },
    {
      id: 'presentation',
      accessorKey: 'presentation',
      enableSorting: true,
    },
    {
      id: 'stock_range',
      accessorFn: (row) => `${row.min_quantity || 0}-${row.max_quantity || 0}`,
      enableSorting: false,
    },
    {
      id: 'tracking',
      accessorFn: () => '',
      enableSorting: false,
    },
    {
      id: 'status',
      accessorFn: (row) => (row.is_active ? 'active' : 'inactive'),
      enableSorting: false,
    },
    {
      id: 'actions',
      accessorFn: () => '',
      enableSorting: false,
    },
  ];

  readonly table = createAngularTable<Article>(() => ({
    data: this.filteredArticles(),
    columns: this.columns,
    state: {
      sorting: this.sorting(),
      pagination: this.pagination(),
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(this.sorting()) : updater;
      this.sorting.set(next);
      const first = next[0];
      if (first) {
        this.sortBy = first.id;
        this.sortOrder = first.desc ? 'desc' : 'asc';
      }
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(this.pagination()) : updater;
      this.pagination.set(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  }));

  constructor(
    private articleService: ArticleService,
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

  toggleFilters(): void {
    this.filtersExpanded = !this.filtersExpanded;
  }

  hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.presentationFilter || this.trackingFilter || this.statusFilter);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.presentationFilter = '';
    this.trackingFilter = '';
    this.statusFilter = '';
    this.searchTermSignal.set('');
    this.presentationFilterSignal.set('');
    this.trackingFilterSignal.set('');
    this.statusFilterSignal.set('');
    this.setPageIndex(0);
  }

  onSearch(): void {
    this.searchTermSignal.set(this.searchTerm);
    this.setPageIndex(0);
  }

  sort(field: string): void {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'asc';
    }
    this.sorting.set([{ id: this.sortBy, desc: this.sortOrder === 'desc' }]);
    this.setPageIndex(0);
  }

  onFiltersChanged(): void {
    this.presentationFilterSignal.set(this.presentationFilter);
    this.trackingFilterSignal.set(this.trackingFilter);
    this.statusFilterSignal.set(this.statusFilter);
    this.setPageIndex(0);
  }

  get pageIndex(): number {
    return this.table.getState().pagination.pageIndex;
  }

  get pageSize(): number {
    return this.table.getState().pagination.pageSize;
  }

  get totalFilteredRows(): number {
    return this.filteredArticles().length;
  }

  setPageSize(size: number): void {
    const current = this.pagination();
    this.pagination.set({
      ...current,
      pageSize: size,
      pageIndex: 0,
    });
  }

  nextPage(): void {
    this.table.nextPage();
  }

  previousPage(): void {
    this.table.previousPage();
  }

  private setPageIndex(pageIndex: number): void {
    const current = this.pagination();
    this.pagination.set({
      ...current,
      pageIndex,
    });
  }

  getSortIcon(columnId: string): 'none' | 'asc' | 'desc' {
    const active = this.sorting().find((s) => s.id === columnId);
    if (!active) return 'none';
    return active.desc ? 'desc' : 'asc';
  }

  getHeaderLabel(columnId: string): string {
    switch (columnId) {
      case 'sku':
        return this.t('sku');
      case 'name':
        return this.t('product_name');
      case 'description':
        return this.t('description');
      case 'unit_price':
        return this.t('price');
      case 'presentation':
        return this.t('presentation');
      case 'stock_range':
        return this.t('stock_range');
      case 'tracking':
        return this.t('tracking');
      case 'status':
        return this.t('status');
      case 'actions':
        return this.t('actions');
      default:
        return columnId;
    }
  }

  openEditForm(article: Article): void {
    this.editArticle.emit(article);
  }

  viewArticle(article: Article): void {
    this.viewingArticle = article;
  }

  closeViewModal(): void {
    this.viewingArticle = null;
  }

  openDeleteDialog(articleId: number): void {
    this.deletingArticleId = articleId;
  }

  closeDeleteDialog(): void {
    this.deletingArticleId = null;
  }

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

  getStatusBadgeClass(isActive: boolean): string {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    
    if (isActive) {
      return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
    } else {
      return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
    }
  }

  formatPrice(price: number | null): string {
    if (!price || price === 0) return '-';
    return price.toFixed(2);
  }

  readonly Math = Math;
}
