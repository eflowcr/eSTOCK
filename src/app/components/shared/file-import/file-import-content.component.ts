import { CommonModule } from '@angular/common';
import { Component, inject, ViewChild, ElementRef } from '@angular/core';
import { LanguageService } from '@app/services/extras/language.service';
import { AlertService } from '@app/services/extras/alert.service';
import { FetchService } from '@app/services/extras/fetch.service';
import { ApiResponse } from '@app/models';
import { ZardDialogRef, Z_MODAL_DATA } from '@app/shared/components/dialog';
import { ZardButtonComponent } from '@app/shared/components/button/button.component';
import { ZardIconComponent } from '@app/shared/components/icon/icon.component';
import { handleApiError, returnCustomURI } from '@app/utils';
import { environment } from '@environment';
import type { FileImportConfig, ImportResult } from './file-import.component';

export interface FileImportContentData {
  config: FileImportConfig;
  onSuccess?: (result: ImportResult) => void;
  onError?: (msg: string) => void;
}

@Component({
  selector: 'app-file-import-content',
  standalone: true,
  imports: [CommonModule, ZardButtonComponent, ZardIconComponent],
  template: `
    <div class="space-y-5">
      <div>
        <label class="block text-sm font-medium text-foreground mb-2">{{ t('select_file') }}</label>
        <div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
          <input
            #fileInput
            type="file"
            class="hidden"
            [accept]="data.config.acceptedFormats.join(',') || '.csv,.xlsx'"
            (change)="onFileSelected($event)"
          />
          @if (!selectedFile) {
            <div class="cursor-pointer" (click)="fileInput.click()">
              <z-icon zType="file" class="mx-auto h-12 w-12 text-muted-foreground" />
              <p class="mt-2 text-sm text-muted-foreground">{{ t('click_to_upload') }}</p>
              <p class="text-xs text-muted-foreground/80">{{ data.config.acceptedFormats.join(', ') || 'CSV, XLSX' }}</p>
            </div>
          } @else {
            <div class="flex items-center justify-center gap-2">
              <z-icon zType="circle-check" class="h-6 w-6 text-green-500 shrink-0" />
              <span class="text-sm text-foreground">{{ selectedFile.name }}</span>
              <button type="button" class="text-red-500 hover:text-red-700 p-1" (click)="removeFile(); $event.stopPropagation()">
                <z-icon zType="x" class="h-4 w-4" />
              </button>
            </div>
          }
        </div>
      </div>

      @if (data.config.templateFields.length) {
        <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-medium text-blue-900 dark:text-blue-200">{{ t('template_info') }}</h4>
            <button type="button" class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline" (click)="downloadTemplate()">
              {{ t('download_template') }}
            </button>
          </div>
          <p class="text-xs text-blue-700 dark:text-blue-300 mb-2">{{ t('required_fields') }}:</p>
          <div class="flex flex-wrap gap-1">
            @for (field of data.config.templateFields; track field) {
              <span class="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded">
                {{ field }}
              </span>
            }
          </div>
        </div>
      }

      @if (isImporting) {
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-foreground">{{ t('importing') }}...</span>
            <span class="text-sm text-muted-foreground">{{ importProgress }}%</span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div class="bg-primary h-2 rounded-full transition-all duration-300" [style.width.%]="importProgress"></div>
          </div>
        </div>
      }

      @if (importResult) {
        <div class="p-4 rounded-lg border" [ngClass]="importResult.failed === 0 ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'">
          <h4 class="text-sm font-medium mb-2" [ngClass]="importResult.failed === 0 ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'">
            {{ t('import_results') }}
          </h4>
          <div class="text-sm" [ngClass]="importResult.failed === 0 ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'">
            <p>{{ t('successful') }}: {{ importResult.successful }}</p>
            <p>{{ t('failed') }}: {{ importResult.failed }}</p>
          </div>
          @if (importResult.errors.length > 0) {
            <div class="mt-2">
              <p class="text-xs text-red-600 dark:text-red-400 font-medium">{{ t('errors') }}:</p>
              <ul class="text-xs text-red-600 dark:text-red-400 list-disc list-inside">
                @for (err of importResult.errors; track err) {
                  <li>{{ err }}</li>
                }
              </ul>
            </div>
          }
        </div>
      }
    </div>

    <div class="flex flex-wrap items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
      <button z-button zType="outline" type="button" (click)="cancel()">
        {{ t('cancel') }}
      </button>
      <button z-button zType="default" type="button"
        [zDisabled]="!selectedFile || isImporting"
        [zLoading]="isImporting"
        (click)="startImport()">
        {{ t('import') }}
      </button>
    </div>
  `,
})
export class FileImportContentComponent {
  private readonly languageService = inject(LanguageService);
  private readonly alertService = inject(AlertService);
  private readonly fetchService = inject(FetchService);
  private readonly dialogRef = inject(ZardDialogRef);
  readonly data = inject<FileImportContentData>(Z_MODAL_DATA);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectedFile: File | null = null;
  isImporting = false;
  importProgress = 0;
  importResult: ImportResult | null = null;

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  removeFile(): void {
    this.selectedFile = null;
    this.importResult = null;
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const isValidFormat = this.data.config.acceptedFormats.some(
      (fmt) =>
        file.name.toLowerCase().endsWith(fmt.toLowerCase()) ||
        file.type.includes(fmt.replace('.', ''))
    );
    const maxSize = (this.data.config.maxFileSize || 10) * 1024 * 1024;

    if (!isValidFormat) {
      this.alertService.error(
        `${this.t('invalid_file_format')} - ${this.t('select_valid_format')}: ${this.data.config.acceptedFormats.join(', ')}`,
        this.t('file_error')
      );
      this.removeFile();
      return;
    }
    if (file.size > maxSize) {
      this.alertService.error(
        `${this.t('file_too_large')} - ${this.t('max_file_size')}: ${this.data.config.maxFileSize || 10}MB`,
        this.t('file_error')
      );
      this.removeFile();
      return;
    }

    this.selectedFile = file;
    this.importResult = null;
  }

  downloadTemplate(): void {
    if (!this.data.config.templateFields.length) return;

    const templateType = this.data.config.templateType;
    const assetMap: Record<string, string> = {
      users: '/assets/files/ImportUsers.xlsx',
      locations: '/assets/files/ImportLocations.xlsx',
      articles: '/assets/files/ImportArticles.xlsx',
      receiving_tasks: '/assets/files/ImportReceivingTasks.xlsx',
      picking_tasks: '/assets/files/ImportPickingTasks.xlsx',
      inventory: '/assets/files/ImportInventory.xlsx',
    };

    if (templateType && assetMap[templateType]) {
      const link = document.createElement('a');
      link.href = assetMap[templateType];
      link.download = assetMap[templateType].split('/').pop()!;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const csvContent = this.data.config.templateFields.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.data.config.title.toLowerCase().replace(/\s+/g, '_')}_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async startImport(): Promise<void> {
    if (!this.selectedFile || !this.data.config.endpoint) return;

    this.isImporting = true;
    this.importProgress = 0;
    this.importResult = null;

    try {
      const formData = new FormData();
      formData.append('file', this.selectedFile);

      const progressInterval = setInterval(() => {
        if (this.importProgress < 90) this.importProgress += 10;
      }, 200);

      const completeUri = returnCustomURI({
        URI: environment.API.BASE,
        API_Gateway: this.data.config.endpoint,
      });

      const response = await this.fetchService.upload<ApiResponse<unknown>>({
        API_Gateway: completeUri,
        data: formData,
      });

      clearInterval(progressInterval);
      this.importProgress = 100;

      if (!response.result.success) {
        throw new Error(response.result.message || this.t('import_failed'));
      }

      const respData = response.data as { successful?: number; failed?: number; errors?: string[] };
      const result: ImportResult = {
        successful: respData?.successful ?? 0,
        failed: respData?.failed ?? 0,
        errors: respData?.errors ?? [],
      };

      this.importResult = result;

      this.alertService.success(
        `${this.t('import_complete')} - ${this.t('successful')}: ${result.successful}, ${this.t('failed')}: ${result.failed}`,
        this.t('import_complete')
      );

      this.data.onSuccess?.(result);
      this.dialogRef.close();
    } catch (error: unknown) {
      console.error('Import error:', error);
      const msg = handleApiError(error, this.t('import_failed'));
      this.alertService.error(msg, this.t('import_error'));
      this.data.onError?.(msg);
    } finally {
      this.isImporting = false;
    }
  }
}
