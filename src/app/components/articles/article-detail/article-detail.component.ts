import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Article } from '@app/models/article.model';
import { ArticleService } from '@app/services/article.service';
import { AlertService } from '@app/services/extras/alert.service';
import { AuthorizationService } from '@app/services/extras/authorization.service';
import { LanguageService } from '@app/services/extras/language.service';
import { MainLayoutComponent } from '../../layout/main-layout.component';
import { ArticleFormComponent } from '../article-form/article-form.component';
import { GeneralTabComponent } from './tabs/general-tab/general-tab.component';
import { InventarioTabComponent } from './tabs/inventario-tab/inventario-tab.component';
import { AlertasTabComponent } from './tabs/alertas-tab/alertas-tab.component';
import { ProveedoresTabComponent } from './tabs/proveedores-tab/proveedores-tab.component';

export type ArticleDetailTab = 'general' | 'inventario' | 'historial' | 'trazabilidad' | 'alertas' | 'proveedores';

const VALID_TABS: ArticleDetailTab[] = ['general', 'inventario', 'historial', 'trazabilidad', 'alertas', 'proveedores'];

@Component({
  selector: 'app-article-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MainLayoutComponent,
    ArticleFormComponent,
    GeneralTabComponent,
    InventarioTabComponent,
    AlertasTabComponent,
    ProveedoresTabComponent,
  ],
  templateUrl: './article-detail.component.html',
})
export class ArticleDetailComponent implements OnInit {
  article: Article | null = null;
  isLoading = false;
  notFound = false;
  isEditOpen = false;
  activeTab: ArticleDetailTab = 'general';

  readonly tabs: { key: ArticleDetailTab; labelKey: string }[] = [
    { key: 'general',       labelKey: 'article_detail.tab.general' },
    { key: 'inventario',    labelKey: 'article_detail.tab.inventario' },
    { key: 'historial',     labelKey: 'article_detail.tab.historial' },
    { key: 'trazabilidad',  labelKey: 'article_detail.tab.trazabilidad' },
    { key: 'alertas',       labelKey: 'article_detail.tab.alertas' },
    { key: 'proveedores',   labelKey: 'article_detail.tab.proveedores' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private articleService: ArticleService,
    private alertService: AlertService,
    private authorizationService: AuthorizationService,
    private languageService: LanguageService,
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  ngOnInit(): void {
    const sku = this.route.snapshot.paramMap.get('sku');
    const tabParam = this.route.snapshot.queryParamMap.get('tab') as ArticleDetailTab | null;
    if (tabParam && VALID_TABS.includes(tabParam)) {
      this.activeTab = tabParam;
    }
    if (sku) this.loadArticle(sku);
  }

  async loadArticle(sku: string): Promise<void> {
    this.isLoading = true;
    this.notFound = false;
    try {
      const res = await this.articleService.getBySku(sku);
      this.article = res.data ?? null;
      if (!this.article) this.notFound = true;
    } catch (error: any) {
      const status = Number(error?.status);
      if (status === 404) {
        this.notFound = true;
      } else {
        this.alertService.error(this.t('article_detail.error_loading'));
      }
    } finally {
      this.isLoading = false;
    }
  }

  selectTab(tab: ArticleDetailTab): void {
    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  isAdmin(): boolean {
    return this.authorizationService.isAdmin();
  }

  openEdit(): void {
    this.isEditOpen = true;
  }

  closeEdit(): void {
    this.isEditOpen = false;
  }

  onArticleSaved(): void {
    this.closeEdit();
    const sku = this.route.snapshot.paramMap.get('sku');
    if (sku) this.loadArticle(sku);
  }

  categoryBadgeClass(): string {
    return 'inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  }

  statusBadgeClass(): string {
    return this.article?.is_active
      ? 'inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300'
      : 'inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
}
