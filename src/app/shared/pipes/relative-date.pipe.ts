import { Pipe, PipeTransform } from '@angular/core';
import { LanguageService } from '@app/services/extras/language.service';

/**
 * Transforms an ISO date string or Date into a human-readable relative time string.
 * Uses the LanguageService for i18n (reuses `article_detail.general.time.*` keys).
 *
 * Impure pipe: re-evaluates on every CD cycle to keep relative timestamps
 * current without requiring input reference changes. Cost is negligible
 * for the small number of timestamps typically displayed.
 *
 * Preferred usage in templates: `{{ notif.created_at | relativeDate }}`
 */
@Pipe({ name: 'relativeDate', standalone: true, pure: false })
export class RelativeDatePipe implements PipeTransform {
  constructor(private languageService: LanguageService) {}

  transform(value: string | Date | null | undefined): string {
    if (!value) return '';
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return '';

    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    const t = (key: string) => this.languageService.t(key);

    if (diffSec < 60) return t('article_detail.general.time.just_now');
    if (diffMin < 60) return t('article_detail.general.time.minutes_ago').replace('{n}', String(diffMin));
    if (diffHrs < 24) return t('article_detail.general.time.hours_ago').replace('{n}', String(diffHrs));
    if (diffDays < 30) return t('article_detail.general.time.days_ago').replace('{n}', String(diffDays));
    if (diffMonths < 12) return t('article_detail.general.time.months_ago').replace('{n}', String(diffMonths));
    return t('article_detail.general.time.years_ago').replace('{n}', String(diffYears));
  }
}
