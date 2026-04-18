import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { StockAlert } from '@app/models/stock-alert.model';
import { AlertLevel } from '@app/models';
import { StockAlertService } from '@app/services';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { handleApiError } from '@app/utils';

@Component({
  selector: 'app-alertas-tab',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './alertas-tab.component.html',
})
export class AlertasTabComponent implements OnInit {
  @Input({ required: true }) sku!: string;

  alerts: StockAlert[] = [];
  isLoading = false;
  isAnalyzing = false;
  resolvingIds = new Set<string>();

  constructor(
    private stockAlertService: StockAlertService,
    private alertService: AlertService,
    private languageService: LanguageService,
  ) {}

  get t() {
    return (key: string) => this.languageService.translate(key);
  }

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    if (!this.sku) return;
    this.isLoading = true;
    try {
      const [active, resolved] = await Promise.all([
        this.stockAlertService.getAll(false),
        this.stockAlertService.getAll(true),
      ]);
      const all = ([
        ...((active.data ?? []) as unknown as StockAlert[]),
        ...((resolved.data ?? []) as unknown as StockAlert[]),
      ]);
      this.alerts = all
        .filter(a => a.sku === this.sku)
        .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    } catch (error: any) {
      this.alertService.error(
        handleApiError(error, this.t('article_detail.alertas.load_error')),
        this.t('article_detail.alertas.error_title'),
      );
    } finally {
      this.isLoading = false;
    }
  }

  async analyze(): Promise<void> {
    if (this.isAnalyzing) return;
    this.isAnalyzing = true;
    try {
      const res = await this.stockAlertService.analyze();
      if (res.result.success) {
        this.alertService.success(
          this.t('article_detail.alertas.analyze_success'),
          this.t('article_detail.alertas.success_title'),
        );
        await this.load();
      } else {
        throw new Error(res.result.message || 'analyze failed');
      }
    } catch (error: any) {
      this.alertService.error(
        handleApiError(error, this.t('article_detail.alertas.analyze_error')),
        this.t('article_detail.alertas.error_title'),
      );
    } finally {
      this.isAnalyzing = false;
    }
  }

  async resolve(id: string): Promise<void> {
    if (this.resolvingIds.has(id)) return;
    this.resolvingIds.add(id);
    try {
      const res = await this.stockAlertService.resolve(id);
      if (res.result.success) {
        this.alerts = this.alerts.map(a =>
          a.id === id ? { ...a, is_resolved: true, resolved_at: new Date().toISOString() } : a
        );
        this.alertService.success(
          this.t('article_detail.alertas.resolve_success'),
          this.t('article_detail.alertas.success_title'),
        );
      } else {
        throw new Error(res.result.message || 'resolve failed');
      }
    } catch (error: any) {
      this.alertService.error(
        handleApiError(error, this.t('article_detail.alertas.resolve_error')),
        this.t('article_detail.alertas.error_title'),
      );
    } finally {
      this.resolvingIds.delete(id);
    }
  }

  levelBadgeClass(level: AlertLevel | string): string {
    const map: Record<string, string> = {
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    };
    return `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[level] ?? 'bg-gray-100 text-gray-700'}`;
  }

  statusBadgeClass(alert: StockAlert): string {
    return alert.is_resolved
      ? 'inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400'
      : 'inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
  }

  formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  }

  activeAlerts(): StockAlert[] {
    return this.alerts.filter(a => !a.is_resolved);
  }
}
