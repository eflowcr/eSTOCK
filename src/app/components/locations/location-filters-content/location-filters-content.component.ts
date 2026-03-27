import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ZardDialogRef, Z_MODAL_DATA } from '@app/shared/components/dialog';
import { ZardButtonComponent } from '@app/shared/components/button/button.component';
import { LanguageService } from '@app/services/extras/language.service';

export interface LocationFiltersData {
  typeFilter: string;
  zoneFilter: string;
  statusFilter: string;
  onApply: (filters: { typeFilter: string; zoneFilter: string; statusFilter: string }) => void;
}

const LOCATION_TYPES = ['PALLET', 'SHELF', 'BIN', 'FLOOR', 'BLOCK'];

@Component({
  selector: 'app-location-filters-content',
  standalone: true,
  imports: [CommonModule, FormsModule, ZardButtonComponent],
  template: `
    <div class="space-y-5 p-1">

      <!-- Type filter -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('type') || 'Tipo' }}</label>
        <div class="flex flex-wrap gap-2">
          <button type="button"
            class="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
            [ngClass]="typeFilter==='' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'"
            (click)="typeFilter=''">
            {{ t('all') || 'Todos' }}
          </button>
          @for (locType of locationTypes; track locType) {
            <button type="button"
              class="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
              [ngClass]="typeFilter===locType ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'"
              (click)="typeFilter=locType">
              {{ locType }}
            </button>
          }
        </div>
      </div>

      <!-- Zone filter -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ t('zone') || 'Zona' }}</label>
        <input type="text" [(ngModel)]="zoneFilter"
          [placeholder]="t('filter_by_zone') || 'Filtrar por zona...'"
          class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>

      <!-- Status filter -->
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

      <!-- Actions -->
      <div class="flex gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <button z-button zType="outline" type="button" class="flex-1" (click)="reset()">{{ t('clear_filters') || 'Limpiar' }}</button>
        <button z-button zType="default" type="button" class="flex-1" (click)="apply()">{{ t('apply') || 'Aplicar' }}</button>
      </div>
    </div>
  `,
})
export class LocationFiltersContentComponent {
  private readonly dialogRef = inject(ZardDialogRef);
  readonly data = inject<LocationFiltersData>(Z_MODAL_DATA);
  private readonly languageService = inject(LanguageService);

  locationTypes = LOCATION_TYPES;
  statusOptions = [
    { value: '', key: 'all', label: 'Todos' },
    { value: 'active', key: 'active', label: 'Activo' },
    { value: 'inactive', key: 'inactive', label: 'Inactivo' },
  ];

  typeFilter = this.data.typeFilter;
  zoneFilter = this.data.zoneFilter;
  statusFilter = this.data.statusFilter;

  get t() { return this.languageService.t.bind(this.languageService); }

  apply(): void {
    this.data.onApply({ typeFilter: this.typeFilter, zoneFilter: this.zoneFilter, statusFilter: this.statusFilter });
    this.dialogRef.close();
  }

  reset(): void {
    this.typeFilter = ''; this.zoneFilter = ''; this.statusFilter = '';
  }
}
