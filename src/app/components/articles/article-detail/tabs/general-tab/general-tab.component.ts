import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Article } from '@app/models/article.model';
import { LanguageService } from '@app/services/extras/language.service';

@Component({
  selector: 'app-article-general-tab',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './general-tab.component.html',
})
export class GeneralTabComponent {
  @Input() article: Article | null = null;
  @Input() canEdit = false;
  @Output() editRequested = new EventEmitter<void>();

  constructor(private languageService: LanguageService) {}

  t(key: string): string {
    return this.languageService.t(key);
  }

  onEditClick(): void {
    this.editRequested.emit();
  }

  hasValue(value: unknown): boolean {
    return value !== null && value !== undefined && value !== '';
  }

  formatRelative(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '—';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSec < 60) return this.t('article_detail.general.time.just_now');
    if (diffMin < 60) return this.t('article_detail.general.time.minutes_ago').replace('{n}', String(diffMin));
    if (diffHrs < 24) return this.t('article_detail.general.time.hours_ago').replace('{n}', String(diffHrs));
    if (diffDays < 30) return this.t('article_detail.general.time.days_ago').replace('{n}', String(diffDays));
    if (diffMonths < 12) return this.t('article_detail.general.time.months_ago').replace('{n}', String(diffMonths));
    return this.t('article_detail.general.time.years_ago').replace('{n}', String(diffYears));
  }

  formatAbsolute(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('es', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  get batchSeriesExample(): string {
    const series = this.article?.batch_number_series;
    if (!series) return '—';
    const year = new Date().getFullYear();
    return `${series}-${year}-001`;
  }

  get serialSeriesExample(): string {
    const series = this.article?.serial_number_series;
    if (!series) return '—';
    return `${series}-0001`;
  }

  get statusBadgeClass(): string {
    return this.article?.is_active
      ? 'inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300'
      : 'inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }

  get categoryBadgeClass(): string {
    return 'inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  }
}
