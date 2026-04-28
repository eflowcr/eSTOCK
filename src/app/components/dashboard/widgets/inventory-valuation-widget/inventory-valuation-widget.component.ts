import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LanguageService } from '@app/services/extras/language.service';
import { InventoryValuationService } from '@app/services/inventory-valuation.service';
import { InventoryValuation, ValuationGroupBy } from '@app/models/inventory-valuation.model';

@Component({
  selector: 'app-inventory-valuation-widget',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inventory-valuation-widget.component.html',
})
export class InventoryValuationWidgetComponent implements OnInit {
  valuation: InventoryValuation | null = null;
  isLoading = true;
  hasError = false;
  groupBy: ValuationGroupBy = 'article';

  readonly groups: { key: ValuationGroupBy; labelKey: string }[] = [
    { key: 'article',  labelKey: 'dashboard.valuation.by_article' },
    { key: 'location', labelKey: 'dashboard.valuation.by_location' },
    { key: 'category', labelKey: 'dashboard.valuation.by_category' },
  ];

  constructor(
    private valuationService: InventoryValuationService,
    private languageService: LanguageService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.isLoading = true;
    this.hasError = false;
    try {
      const response = await this.valuationService.get(this.groupBy);
      if (response?.result?.success && response.data) {
        this.valuation = response.data;
      } else {
        this.hasError = true;
      }
    } catch {
      this.hasError = true;
    } finally {
      this.isLoading = false;
    }
  }

  async onGroupByChange(group: ValuationGroupBy): Promise<void> {
    if (this.groupBy === group) return;
    this.groupBy = group;
    await this.load();
  }

  get topBreakdown() {
    return this.valuation?.breakdown?.slice(0, 3) ?? [];
  }

  get hasMoreBreakdown(): boolean {
    return (this.valuation?.breakdown?.length ?? 0) > 3;
  }

  linkFor(item: { id: string; label: string }): string[] {
    if (this.groupBy === 'article') return ['/articles', item.label];
    if (this.groupBy === 'location') return ['/inventory'];
    return ['/articles'];
  }

  queryParamsFor(item: { id: string; label: string }): Record<string, string> {
    if (this.groupBy === 'location') return { location: item.label };
    if (this.groupBy === 'category') return { category_id: item.id };
    return {};
  }

  /**
   * B6 fix: guard against NaN/null/undefined/Infinity before format.
   * Returns localized "₡0" instead of "₡NaN" when value is not a finite number.
   * B8 fix: tenant locale defaults to es-CR (CRC) — single source of truth for currency
   * across the dashboard. KPI cards must use this same formatter (no $ mixing).
   */
  formatCurrency(value: number | null | undefined): string {
    const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      maximumFractionDigits: 0,
    }).format(n);
  }

  t(key: string): string {
    return this.languageService.t(key);
  }
}
