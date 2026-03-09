import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '@app/services/extras/language.service';
import { AlertService } from '@app/services/extras/alert.service';
import { ZardDialogRef, Z_MODAL_DATA } from '@app/shared/components/dialog';
import { ZardButtonComponent } from '@app/shared/components/button/button.component';
import { ZardIconComponent } from '@app/shared/components/icon/icon.component';
import { handleApiError } from '@app/utils';
import type { DataExportConfig } from './data-export.component';

export interface DataExportContentData {
  config: DataExportConfig;
  onExported?: () => void;
}

@Component({
  selector: 'app-data-export-content',
  standalone: true,
  imports: [CommonModule, FormsModule, ZardButtonComponent, ZardIconComponent],
  template: `
    <div class="space-y-5">
      <div>
        <p class="text-sm text-muted-foreground mb-4">{{ t('export_description') }}</p>
        <div class="flex items-center text-sm text-muted-foreground">
          <svg class="h-4 w-4 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          {{ t('total_records') }}: {{ dataCount }}
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-foreground mb-3">{{ t('export_format') }}</label>
        <div class="space-y-2">
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="radio" name="format" value="csv" [(ngModel)]="format"
              class="h-4 w-4 text-primary border-gray-300 focus:ring-primary">
            <span class="text-sm">
              <span class="font-medium">CSV</span>
              <span class="text-muted-foreground ml-1">({{ t('csv_description') }})</span>
            </span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="radio" name="format" value="xlsx" [(ngModel)]="format"
              class="h-4 w-4 text-primary border-gray-300 focus:ring-primary">
            <span class="text-sm">
              <span class="font-medium">XLSX</span>
              <span class="text-muted-foreground ml-1">({{ t('xlsx_description') }})</span>
            </span>
          </label>
        </div>
      </div>

      @if (isExporting) {
        <div class="flex items-center justify-center py-4">
          <z-icon zType="loader-circle" class="animate-spin h-6 w-6 text-primary mr-3" />
          <span class="text-sm text-muted-foreground">{{ t('exporting') }}...</span>
        </div>
      }
    </div>

    <div class="flex flex-wrap items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
      <button z-button zType="outline" type="button" [disabled]="isExporting" (click)="cancel()">
        {{ t('cancel') }}
      </button>
      <button z-button zType="default" type="button"
        [zDisabled]="isExporting || dataCount === 0"
        [zLoading]="isExporting"
        (click)="startExport()">
        {{ t('export') }}
      </button>
    </div>
  `,
})
export class DataExportContentComponent {
  private readonly languageService = inject(LanguageService);
  private readonly alertService = inject(AlertService);
  private readonly dialogRef = inject(ZardDialogRef);
  private readonly data = inject<DataExportContentData>(Z_MODAL_DATA);

  format: 'csv' | 'xlsx' = 'csv';
  isExporting = false;

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  get dataCount(): number {
    return this.data.config.data?.length || 0;
  }

  cancel(): void {
    this.dialogRef.close();
  }

  startExport(): void {
    this.export();
  }

  async export(): Promise<void> {
    if (this.dataCount === 0) {
      this.alertService.error(this.t('no_data'), this.t('no_data_to_export'));
      return;
    }

    this.isExporting = true;

    try {
      if (this.format === 'xlsx') {
        await this.exportXLSX();
      } else {
        await this.exportCSV();
      }

      this.alertService.success(
        `${this.t('export_successful')} - ${this.data.config.title} (${this.format.toUpperCase()})`,
        this.t('export_successful')
      );

      this.data.onExported?.();
      this.dialogRef.close();
    } catch (error: unknown) {
      console.error('Export error:', error);
      this.alertService.error(
        this.t('export_failed'),
        handleApiError(error, this.t('failed_to_export_data'))
      );
    } finally {
      this.isExporting = false;
    }
  }

  private async exportXLSX(): Promise<void> {
    const XLSX = await import('xlsx');
    let jsonData = this.data.config.data || [];

    if (jsonData.length === 0) {
      const response = await fetch(`${this.data.config.endpoint}?format=json`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error(this.t('failed_to_export_data_error'));
      jsonData = await response.json();
    }

    const ws = XLSX.utils.json_to_sheet(jsonData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, this.data.config.title);
    const filename = `${this.data.config.filename || `${this.data.config.title.toLowerCase().replace(/\s+/g, '_')}_export`}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  private async exportCSV(): Promise<void> {
    let data = this.data.config.data || [];

    if (data.length === 0) {
      const response = await fetch(`${this.data.config.endpoint}?format=csv`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error(this.t('failed_to_export_data_error'));
      if (response.headers.get('content-type')?.includes('text/csv')) {
        this.downloadCSV(await response.text());
        return;
      }
      data = await response.json();
    }

    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map((row) =>
          headers
            .map((header) => {
              const value = row[header];
              if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            })
            .join(',')
        ),
      ].join('\n');
      this.downloadCSV(csvContent);
    }
  }

  private downloadCSV(csvContent: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.data.config.filename || `${this.data.config.title.toLowerCase().replace(/\s+/g, '_')}_export`}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
