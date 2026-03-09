import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Article } from '@app/models/article.model';
import { LanguageService } from '@app/services/extras/language.service';
import { Z_MODAL_DATA } from '@app/shared/components/dialog';

@Component({
  selector: 'app-article-details-content',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (article) {
      <div class="max-h-[70vh] overflow-y-auto">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="rounded-lg border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/30">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('sku') }}</p>
            <p class="mt-1 font-mono text-base font-semibold text-gray-900 dark:text-white">{{ article.sku }}</p>
          </div>
          <div class="rounded-lg border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/30">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('name') }}</p>
            <p class="mt-1 text-base font-semibold text-gray-900 dark:text-white">{{ article.name }}</p>
          </div>

          <div class="rounded-lg border border-gray-200 bg-gray-50/70 p-4 md:col-span-2 dark:border-gray-700 dark:bg-gray-900/30">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('description') }}</p>
            <p class="mt-1 text-sm leading-relaxed text-gray-800 dark:text-gray-100">{{ article.description || '-' }}</p>
          </div>

          <div class="rounded-lg border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/30">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('price') }}</p>
            <p class="mt-1 text-base font-semibold text-gray-900 dark:text-white">{{ formatPrice(article.unit_price || 0) }}</p>
          </div>
          <div class="rounded-lg border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/30">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('presentation') }}</p>
            <p class="mt-1 text-base font-semibold text-gray-900 dark:text-white">{{ t(article.presentation) }}</p>
          </div>

          <div class="rounded-lg border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/30">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('min_quantity') }}</p>
            <p class="mt-1 text-base font-semibold text-gray-900 dark:text-white">{{ article.min_quantity ?? 0 }}</p>
          </div>
          <div class="rounded-lg border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/30">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('max_quantity') }}</p>
            <p class="mt-1 text-base font-semibold text-gray-900 dark:text-white">{{ article.max_quantity ?? 0 }}</p>
          </div>

          <div class="rounded-lg border border-gray-200 bg-gray-50/70 p-4 md:col-span-2 dark:border-gray-700 dark:bg-gray-900/30">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('tracking_options') }}</p>
            <div class="mt-2 flex flex-wrap gap-2">
              @if (article.track_by_lot) {
                <span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">{{ t('lot_tracking') }}</span>
              }
              @if (article.track_by_serial) {
                <span class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">{{ t('serial_tracking') }}</span>
              }
              @if (article.track_expiration) {
                <span class="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">{{ t('expiration_tracking') }}</span>
              }
              @if (!article.track_by_lot && !article.track_by_serial && !article.track_expiration) {
                <span class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">{{ t('no_tracking') }}</span>
              }
            </div>
          </div>

          <div class="rounded-lg border border-gray-200 bg-gray-50/70 p-4 md:col-span-2 dark:border-gray-700 dark:bg-gray-900/30">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('status') }}</p>
            <div class="mt-2">
              <span [class]="getStatusBadgeClass(article.is_active ?? false)">{{ article.is_active ? t('active') : t('inactive') }}</span>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class ArticleDetailsContentComponent {
  protected readonly language = inject(LanguageService);
  protected readonly article = inject<Article>(Z_MODAL_DATA);

  protected t(key: string): string {
    return this.language.translate(key);
  }

  protected formatPrice(price: number): string {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(price);
  }

  protected getStatusBadgeClass(isActive: boolean): string {
    return isActive
      ? 'inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200';
  }
}
