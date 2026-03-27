import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ZardDialogRef, Z_MODAL_DATA } from '@app/shared/components/dialog';
import { ZardButtonComponent } from '@app/shared/components/button/button.component';
import { LanguageService } from '@app/services/extras/language.service';

export interface InventoryFiltersData {
  statusFilter: string;
  locationFilter: string;
  presentationFilter: string;
  trackingFilter: string;
  locations: string[];
  presentations: string[];
  onApply: (filters: {
    statusFilter: string;
    locationFilter: string;
    presentationFilter: string;
    trackingFilter: string;
  }) => void;
}

@Component({
  selector: 'app-inventory-filters-content',
  standalone: true,
  imports: [CommonModule, FormsModule, ZardButtonComponent],
  template: `
    <div class="space-y-5 p-1">

      <!-- Status -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('status') || 'Estado' }}</label>
        <div class="flex gap-2">
          @for (opt of statusOptions; track opt.value) {
            <button type="button"
              class="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
              [ngClass]="statusFilter===opt.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'"
              (click)="statusFilter=opt.value">
              {{ t(opt.key) || opt.label }}
            </button>
          }
        </div>
      </div>

      <!-- Location -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('location_code') || 'Ubicación' }}</label>
        <select [(ngModel)]="locationFilter"
          class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-gray-200">
          <option value="">{{ t('all') || 'Todas' }}</option>
          @for (loc of data.locations; track loc) { <option [value]="loc">{{ loc }}</option> }
        </select>
      </div>

      <!-- Presentation -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('presentation') || 'Presentación' }}</label>
        <select [(ngModel)]="presentationFilter"
          class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-gray-200">
          <option value="">{{ t('all') || 'Todas' }}</option>
          @for (p of data.presentations; track p) { <option [value]="p">{{ p }}</option> }
        </select>
      </div>

      <!-- Tracking -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('tracking') || 'Rastreo' }}</label>
        <div class="flex flex-wrap gap-2">
          @for (opt of trackingOptions; track opt.value) {
            <button type="button"
              class="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
              [ngClass]="trackingFilter===opt.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'"
              (click)="trackingFilter=opt.value">
              {{ t(opt.key) || opt.label }}
            </button>
          }
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <button z-button zType="outline" type="button" class="flex-1" (click)="reset()">{{ t('clear_filters') || 'Limpiar' }}</button>
        <button z-button zType="default" type="button" class="flex-1" (click)="apply()">{{ t('apply') || 'Aplicar' }}</button>
      </div>
    </div>
  `,
})
export class InventoryFiltersContentComponent {
  private readonly dialogRef = inject(ZardDialogRef);
  readonly data = inject<InventoryFiltersData>(Z_MODAL_DATA);
  private readonly languageService = inject(LanguageService);

  statusFilter = this.data.statusFilter;
  locationFilter = this.data.locationFilter;
  presentationFilter = this.data.presentationFilter;
  trackingFilter = this.data.trackingFilter;

  statusOptions = [
    { value: '', key: 'all', label: 'Todos' },
    { value: 'available', key: 'available', label: 'Disponible' },
    { value: 'reserved', key: 'reserved', label: 'Reservado' },
    { value: 'damaged', key: 'damaged', label: 'Dañado' },
  ];

  trackingOptions = [
    { value: '', key: 'all', label: 'Todos' },
    { value: 'lot_only', key: 'lot_tracking', label: 'Solo Lote' },
    { value: 'serial_only', key: 'serial_tracking', label: 'Solo Serie' },
    { value: 'both', key: 'lot_and_serial', label: 'Lote y Serie' },
    { value: 'none', key: 'no_tracking', label: 'Sin rastreo' },
  ];

  get t() { return this.languageService.t.bind(this.languageService); }

  apply(): void {
    this.data.onApply({
      statusFilter: this.statusFilter,
      locationFilter: this.locationFilter,
      presentationFilter: this.presentationFilter,
      trackingFilter: this.trackingFilter,
    });
    this.dialogRef.close();
  }

  reset(): void {
    this.statusFilter = ''; this.locationFilter = '';
    this.presentationFilter = ''; this.trackingFilter = '';
  }
}
