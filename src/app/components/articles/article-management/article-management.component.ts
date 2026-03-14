import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Article } from '../../../models/article.model';
import { ArticleService } from '../../../services/article.service';
import { AlertService } from '../../../services/extras/alert.service';
import { AuthorizationService } from '../../../services/extras/authorization.service';
import { LanguageService } from '../../../services/extras/language.service';
import { handleApiError, humanizeApiError } from '@app/utils';
import { ZardDialogService } from '@app/shared/components/dialog';
import { MainLayoutComponent } from '../../layout/main-layout.component';
import { DataExportConfig } from '../../shared/data-export/data-export.component';
import { FileImportConfig, ImportResult } from '../../shared/file-import/file-import.component';
import { DataExportContentComponent } from '../../shared/data-export/data-export-content.component';
import { FileImportContentComponent } from '../../shared/file-import/file-import-content.component';
import { ArticleFormComponent } from '../article-form/article-form.component';
import { ArticleListComponent } from '../article-list/article-list.component';

@Component({
  selector: 'app-article-management',
  standalone: true,
  imports: [
    CommonModule,
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
  isCreateDialogOpen = false;
  selectedArticle: Article | null = null;

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
    templateFields: ['sku', 'name', 'description', 'unit_price', 'presentation', 'track_by_lot', 'track_by_serial', 'track_expiration', 'rotation_strategy', 'min_quantity', 'max_quantity', 'image_url', 'is_active'],
    maxFileSize: 10,
    templateType: 'articles'
  };

  constructor(
    private articleService: ArticleService,
    private authorizationService: AuthorizationService,
    private alertService: AlertService,
    private languageService: LanguageService,
    private dialogService: ZardDialogService
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
    } catch (error: any) {
      console.error('Error loading articles:', error);
      this.alertService.error(handleApiError(error, this.t('error_loading_articles')));
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

  openCreateForm(): void {
    this.selectedArticle = null;
    this.isCreateDialogOpen = true;
  }

  openEditForm(article: Article): void {
    this.selectedArticle = { ...article };
    this.isCreateDialogOpen = true;
  }

  closeCreateDialog(): void {
    this.isCreateDialogOpen = false;
    this.selectedArticle = null;
  }

  onArticleSaved(): void {
    this.closeCreateDialog();
    this.loadArticles();
  }

  openImportDialog(): void {
    this.dialogService.create({
      zTitle: this.t('import_data'),
      zContent: FileImportContentComponent,
      zData: {
        config: this.importConfig,
        onSuccess: (res: ImportResult) => this.onImportSuccess(res),
        onError: (err: string) => this.onImportError(err),
      },
      zHideFooter: true,
      zCustomClasses: 'sm:max-w-2xl',
    });
  }

  onImportSuccess(_result: ImportResult): void {
    this.alertService.success(this.t('import_successful'));
    this.loadArticles();
  }

  onImportError(error: string): void {
    this.alertService.error(humanizeApiError(error || '', this.t, 'import_failed'));
  }

  openExportDialog(): void {
    this.exportConfig.data = this.articles;
    this.dialogService.create({
      zTitle: this.t('export_data'),
      zDescription: this.t('export_description'),
      zContent: DataExportContentComponent,
      zData: {
        config: this.exportConfig,
        onExported: () => this.onExportSuccess(),
      },
      zHideFooter: true,
      zCustomClasses: 'sm:max-w-md',
    });
  }

  onExportSuccess(): void {
    this.alertService.success(this.t('export_successful'));
  }


  /**
   * Get translation
   */
  t(key: string, params?: any): string {
    return this.languageService.translate(key);
  }
}
