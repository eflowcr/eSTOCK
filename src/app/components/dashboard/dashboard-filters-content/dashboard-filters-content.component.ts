import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ZardDialogRef, Z_MODAL_DATA } from '@app/shared/components/dialog';
import { ZardButtonComponent } from '@app/shared/components/button/button.component';
import { LanguageService } from '@app/services/extras/language.service';

export interface DashboardFiltersData {
  lowStockThreshold: number;
  onApply: (filters: { lowStockThreshold: number }) => void;
}

@Component({
  selector: 'app-dashboard-filters-content',
  standalone: true,
  imports: [CommonModule, FormsModule, ZardButtonComponent],
  template: `
    <div class="space-y-5 p-1">

      <!-- Low stock threshold -->
      <div>
        <label class="block text-sm font-medium text-foreground mb-1">
          {{ t('dashboard.low_stock_threshold') }}
        </label>
        <p class="text-xs text-muted-foreground mb-3">
          {{ t('dashboard.low_stock_threshold_description') }}
        </p>
        <div class="flex items-center gap-3">
          <input
            type="number"
            [(ngModel)]="lowStockThreshold"
            [min]="1"
            [max]="10000"
            class="w-28 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <span class="text-sm text-muted-foreground">{{ t('units') }}</span>
        </div>
        <div class="mt-2 flex gap-2">
          @for (preset of thresholdPresets; track preset) {
            <button type="button"
              class="rounded px-2 py-1 text-xs font-medium border transition-colors"
              [class.bg-primary]="lowStockThreshold === preset"
              [class.text-primary-foreground]="lowStockThreshold === preset"
              [class.border-primary]="lowStockThreshold === preset"
              [class.border-border]="lowStockThreshold !== preset"
              [class.text-muted-foreground]="lowStockThreshold !== preset"
              [class.hover:border-primary]="lowStockThreshold !== preset"
              (click)="lowStockThreshold = preset">
              {{ preset }}
            </button>
          }
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-between border-t border-border pt-4">
        <button z-button zType="ghost" type="button" (click)="reset()">
          {{ t('reset') }}
        </button>
        <div class="flex gap-2">
          <button z-button zType="outline" type="button" (click)="cancel()">
            {{ t('cancel') }}
          </button>
          <button z-button zType="default" type="button" (click)="apply()">
            {{ t('apply') }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class DashboardFiltersContentComponent {
  private readonly dialogRef = inject(ZardDialogRef);
  private readonly data = inject<DashboardFiltersData>(Z_MODAL_DATA);
  private readonly languageService = inject(LanguageService);

  lowStockThreshold = this.data.lowStockThreshold;
  readonly thresholdPresets = [5, 10, 20, 50, 100];

  t(key: string): string {
    return this.languageService.t(key);
  }

  apply(): void {
    this.data.onApply({ lowStockThreshold: this.lowStockThreshold });
    this.dialogRef.close();
  }

  reset(): void {
    this.lowStockThreshold = 20;
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
