import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Article } from '../../../models/article.model';
import { ArticleService } from '../../../services/article.service';
import { AlertService } from '../../../services/extras/alert.service';
import { AuthorizationService } from '../../../services/extras/authorization.service';
import { LanguageService } from '../../../services/extras/language.service';
import { MainLayoutComponent } from '../../layout/main-layout.component';
import { DataExportComponent, DataExportConfig } from '../../shared/data-export/data-export.component';
import { FileImportComponent, FileImportConfig, ImportResult } from '../../shared/file-import/file-import.component';
import { ArticleFormComponent } from '../article-form/article-form.component';
import { ArticleListComponent } from '../article-list/article-list.component';

@Component({
  selector: 'app-article-management',
  standalone: true,
  imports: [
    CommonModule,
    FileImportComponent,
    DataExportComponent,
    MainLayoutComponent,
    ArticleListComponent,
    ArticleFormComponent
],
  templateUrl: './article-management.component.html',
  styleUrls: ['./article-management.component.css']
})
export class ArticleManagementComponent implements OnInit {
  articles: Article[] = [];
  isLoading = false;
  showImportDialog = false;
  showExportDialog = false;
  showCreateForm = false;
  editingArticle: Article | null = null;

  // Export configuration
  exportConfig: DataExportConfig = {
    title: 'Exportar Artículos',
    endpoint: '/api/articles/export',
    data: [],
    filename: 'articles_export'
  };

  // Import configuration
  importConfig: FileImportConfig = {
    title: 'import_articles',
    endpoint: '/api/articles/import',
    acceptedFormats: ['.csv', '.xlsx', '.xls'],
    templateFields: ['sku', 'name', 'description', 'unit_price', 'presentation', 'track_by_lot', 'track_by_serial', 'track_expiration', 'min_quantity', 'max_quantity', 'image_url', 'is_active'],
    maxFileSize: 10,
    templateType: 'articles'
  };

  constructor(
    private articleService: ArticleService,
    private authorizationService: AuthorizationService,
    private alertService: AlertService,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.loadArticles();
  }

  /**
   * Load all articles
   */
  async loadArticles(): Promise<void> {
    try {
      this.isLoading = true;
      const response = await this.articleService.getAll();
      this.articles = response.data || [];
    } catch (error) {
      console.error('Error loading articles:', error);
      this.alertService.error(this.t('error_loading_articles'));
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.authorizationService.isAdmin();
  }

  /**
   * Open create form
   */
  openCreateForm(): void {
    this.editingArticle = null;
    this.showCreateForm = true;
  }

  /**
   * Open edit form
   */
  openEditForm(article: Article): void {
    this.editingArticle = { ...article };
    this.showCreateForm = true;
  }

  /**
   * Close form
   */
  closeForm(): void {
    this.showCreateForm = false;
    this.editingArticle = null;
  }

  /**
   * Handle form success
   */
  onFormSuccess(): void {
    this.closeForm();
    this.loadArticles();
  }

  /**
   * Open import dialog
   */
  openImportDialog(): void {
    this.showImportDialog = true;
  }

  /**
   * Close import dialog
   */
  closeImportDialog(): void {
    this.showImportDialog = false;
  }

  /**
   * Handle import success
   */
  onImportSuccess(result: ImportResult): void {
    this.alertService.success(
      this.t('import_successful')
    );
    this.closeImportDialog();
    this.loadArticles();
  }

  /**
   * Handle import error
   */
  onImportError(error: string): void {
    this.alertService.error(error);
  }

  /**
   * Open export dialog
   */
  openExportDialog(): void {
    this.exportConfig.data = this.articles;
    this.showExportDialog = true;
  }

  /**
   * Close export dialog
   */
  closeExportDialog(): void {
    this.showExportDialog = false;
  }

  /**
   * Handle export success
   */
  onExportSuccess(): void {
    this.alertService.success(this.t('export_successful'));
    this.closeExportDialog();
  }

  /**
   * Handle export error
   */
  onExportError(error: string): void {
    this.alertService.error(error);
  }

  /**
   * Get translation
   */
  t(key: string, params?: any): string {
    return this.languageService.translate(key);
  }
}
