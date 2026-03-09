import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '@app/services/extras/language.service';
import { ZardDialogRef, Z_MODAL_DATA } from '@app/shared/components/dialog';
import { ZardButtonComponent } from '@app/shared/components/button/button.component';
import { ZardSelectComponent } from '@app/shared/components/select/select.component';
import { ZardSelectItemComponent } from '@app/shared/components/select/select-item.component';

export interface ArticleFiltersData {
  presentationFilter: string;
  trackingFilter: string;
  statusFilter: string;
  onApply: (filters: { presentation: string; tracking: string; status: string }) => void;
}

@Component({
  selector: 'app-article-filters-content',
  standalone: true,
  imports: [CommonModule, FormsModule, ZardButtonComponent, ZardSelectComponent, ZardSelectItemComponent],
  template: `
    @if (data) {
      <div class="space-y-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-1">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('presentation') }}</label>
            <z-select [(ngModel)]="presentationFilter" class="block w-full">
              <z-select-item zValue="">{{ t('all_presentations') }}</z-select-item>
              <z-select-item zValue="unit">{{ t('unit') }}</z-select-item>
              <z-select-item zValue="box">{{ t('box') }}</z-select-item>
              <z-select-item zValue="pallet">{{ t('pallet') }}</z-select-item>
              <z-select-item zValue="pack">{{ t('pack') }}</z-select-item>
            </z-select>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('tracking') }}</label>
            <z-select [(ngModel)]="trackingFilter" class="block w-full">
              <z-select-item zValue="">{{ t('all_tracking') }}</z-select-item>
              <z-select-item zValue="lot">{{ t('lot_only') }}</z-select-item>
              <z-select-item zValue="serial">{{ t('serial_only') }}</z-select-item>
              <z-select-item zValue="both">{{ t('lot_and_serial') }}</z-select-item>
              <z-select-item zValue="none">{{ t('no_tracking') }}</z-select-item>
            </z-select>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('status') }}</label>
            <z-select [(ngModel)]="statusFilter" class="block w-full">
              <z-select-item zValue="">{{ t('all_status') }}</z-select-item>
              <z-select-item zValue="active">{{ t('active') }}</z-select-item>
              <z-select-item zValue="inactive">{{ t('inactive') }}</z-select-item>
            </z-select>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
        <button z-button zType="outline" zSize="default" type="button" (click)="reset()">
          {{ t('reset') }}
        </button>
        <button z-button zType="outline" zSize="default" type="button" (click)="cancel()">
          {{ t('cancel') }}
        </button>
        <button z-button zType="default" zSize="default" type="button" (click)="apply()">
          {{ t('apply_filters') }}
        </button>
      </div>
    }
  `,
})
export class ArticleFiltersContentComponent {
  protected readonly language = inject(LanguageService);
  protected readonly dialogRef = inject(ZardDialogRef);
  protected readonly data = inject<ArticleFiltersData>(Z_MODAL_DATA);

  presentationFilter = '';
  trackingFilter = '';
  statusFilter = '';

  constructor() {
    if (this.data) {
      this.presentationFilter = this.data.presentationFilter ?? '';
      this.trackingFilter = this.data.trackingFilter ?? '';
      this.statusFilter = this.data.statusFilter ?? '';
    }
  }

  protected t(key: string): string {
    return this.language.translate(key);
  }

  protected reset(): void {
    this.presentationFilter = '';
    this.trackingFilter = '';
    this.statusFilter = '';
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  protected apply(): void {
    this.data.onApply({
      presentation: this.presentationFilter,
      tracking: this.trackingFilter,
      status: this.statusFilter,
    });
    this.dialogRef.close();
  }
}
