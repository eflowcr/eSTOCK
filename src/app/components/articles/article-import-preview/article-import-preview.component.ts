import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ZardDialogRef, Z_MODAL_DATA } from '@app/shared/components/dialog';
import { ZardButtonComponent } from '@app/shared/components/button/button.component';
import { ZardIconComponent } from '@app/shared/components/icon/icon.component';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { ArticleService } from '@app/services/article.service';
import { FetchService } from '@app/services/extras/fetch.service';
import { environment } from '@environment';
import { getBearerToken } from '@app/utils/get-token';
import { returnCustomURI } from '@app/utils';

export interface ArticleImportPreviewData {
  file: File;
  onSuccess?: (result: { successful: number; skipped: number; failed: number }) => void;
}

interface PreviewRow {
  originalRowNum: number;
  skip: boolean;
  isExample: boolean;
  status: 'valid' | 'warning' | 'error';
  errors: Record<string, string>;
  data: {
    sku: string;
    name: string;
    description: string;
    unit_price: string;
    presentation: string;
    track_by_lot: string;
    track_by_serial: string;
    track_expiration: string;
    max_quantity: string;
    min_quantity: string;
    rotation_strategy: string;
  };
}

@Component({
  selector: 'app-article-import-preview',
  standalone: true,
  imports: [CommonModule, FormsModule, ZardButtonComponent, ZardIconComponent],
  template: `
    <div class="flex flex-col h-full max-h-[80vh]">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ t('preview_import') || 'Vista Previa — Importar Artículos' }}
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {{ validRows.length }} {{ t('ready') || 'listos' }} ·
            <span class="text-red-500">{{ errorRows }} {{ t('errors') || 'errores' }}</span> ·
            <span class="text-yellow-500">{{ skippedRows }} {{ t('skipped') || 'omitidos' }}</span>
          </p>
        </div>
        <button type="button" class="text-gray-400 hover:text-gray-500" (click)="cancel()">
          <z-icon zType="x" class="h-5 w-5" />
        </button>
      </div>

      <!-- Table -->
      <div class="flex-1 overflow-auto px-4 py-3">
        @if (isLoading) {
          <div class="flex flex-col items-center justify-center h-40 gap-4 px-8">
            <div class="flex items-center gap-3 w-full">
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 shrink-0"></div>
              <span class="text-sm text-gray-600 dark:text-gray-400">{{ t('parsing_file') }}</span>
              <span class="ml-auto text-sm font-semibold text-blue-600">{{ parseProgress }}%</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <div class="h-2.5 rounded-full bg-blue-600 transition-all duration-150"
                [style.width.%]="parseProgress"></div>
            </div>
            @if (totalRows > 0) {
              <p class="text-xs text-gray-400">{{ parsedCount }} / {{ totalRows }} {{ t('rows') || 'filas' }}</p>
            }
          </div>
        } @else if (rows.length === 0) {
          <div class="text-center py-12 text-gray-500">
            {{ t('no_data_rows') || 'No se encontraron filas de datos en el archivo.' }}
          </div>
        } @else {
          <table class="w-full text-sm border-collapse min-w-[1200px]">
            <thead>
              <tr class="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                <th class="px-2 py-2 text-center w-10 font-medium text-gray-500">#</th>
                <th class="px-2 py-2 text-center w-16 font-medium text-gray-500">{{ t('status') || 'Estado' }}</th>
                <th class="px-2 py-2 text-center w-10 font-medium text-gray-500">{{ t('skip') || 'Omit.' }}</th>
                <th class="px-2 py-2 text-left font-semibold text-red-600 min-w-[100px]">SKU *</th>
                <th class="px-2 py-2 text-left font-semibold text-red-600 min-w-[160px]">{{ t('name') || 'Nombre' }} *</th>
                <th class="px-2 py-2 text-left font-medium text-gray-600 min-w-[140px]">{{ t('description') || 'Descripción' }}</th>
                <th class="px-2 py-2 text-left font-medium text-gray-600 w-24">{{ t('price') || 'Precio' }}</th>
                <th class="px-2 py-2 text-left font-medium text-gray-600 min-w-[120px]">{{ t('presentation') || 'Presentación' }}</th>
                <th class="px-2 py-2 text-center font-medium text-gray-600 w-20">{{ t('lot') || 'Lote' }}</th>
                <th class="px-2 py-2 text-center font-medium text-gray-600 w-20">{{ t('serial') || 'Serie' }}</th>
                <th class="px-2 py-2 text-center font-medium text-gray-600 w-20">{{ t('exp') || 'Exp.' }}</th>
                <th class="px-2 py-2 text-left font-medium text-gray-600 w-20">Max</th>
                <th class="px-2 py-2 text-left font-medium text-gray-600 w-20">Min</th>
                <th class="px-2 py-2 text-left font-medium text-gray-600 w-24">{{ t('rotation') || 'Rotación' }}</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows; track row.originalRowNum) {
                <tr
                  class="border-b border-gray-100 dark:border-gray-800 transition-colors"
                  [ngClass]="{
                    'opacity-40 bg-gray-50 dark:bg-gray-800/50': row.skip,
                    'bg-red-50 dark:bg-red-900/10': !row.skip && row.status === 'error',
                    'bg-yellow-50 dark:bg-yellow-900/10': !row.skip && row.isExample,
                    'hover:bg-gray-50 dark:hover:bg-gray-800/30': !row.skip && row.status === 'valid'
                  }"
                >
                  <!-- Row num -->
                  <td class="px-2 py-1.5 text-center text-xs text-gray-400">{{ row.originalRowNum }}</td>

                  <!-- Status -->
                  <td class="px-2 py-1.5 text-center">
                    @if (row.isExample && !row.skip) {
                      <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700">{{ t('example_row') }}</span>
                    } @else if (row.skip) {
                      <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500">–</span>
                    } @else if (row.status === 'error') {
                      <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700">✗ Error</span>
                    } @else {
                      <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700">✓ OK</span>
                    }
                  </td>

                  <!-- Skip toggle -->
                  <td class="px-2 py-1.5 text-center">
                    <input type="checkbox" [(ngModel)]="row.skip" (change)="onSkipToggle()"
                      class="h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer" />
                  </td>

                  <!-- SKU -->
                  <td class="px-1 py-1">
                    <input type="text" [(ngModel)]="row.data.sku" (input)="validateRow(row)"
                      [disabled]="row.skip"
                      class="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-600"
                      [ngClass]="{'border-red-400': row.errors['sku'] && !row.skip, 'border-gray-200': !row.errors['sku'] || row.skip}"
                      [title]="row.errors['sku'] || ''" />
                  </td>

                  <!-- Name -->
                  <td class="px-1 py-1">
                    <input type="text" [(ngModel)]="row.data.name" (input)="validateRow(row)"
                      [disabled]="row.skip"
                      class="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-600"
                      [ngClass]="{'border-red-400': row.errors['name'] && !row.skip, 'border-gray-200': !row.errors['name'] || row.skip}"
                      [title]="row.errors['name'] || ''" />
                  </td>

                  <!-- Description -->
                  <td class="px-1 py-1">
                    <input type="text" [(ngModel)]="row.data.description" [disabled]="row.skip"
                      class="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-600" />
                  </td>

                  <!-- Unit Price -->
                  <td class="px-1 py-1">
                    <input type="text" [(ngModel)]="row.data.unit_price" [disabled]="row.skip"
                      class="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-600" />
                  </td>

                  <!-- Presentation -->
                  <td class="px-1 py-1">
                    <select [(ngModel)]="row.data.presentation" (change)="validateRow(row)"
                      [disabled]="row.skip"
                      class="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-600"
                      [ngClass]="{'border-red-400': row.errors['presentation'] && !row.skip, 'border-gray-200': !row.errors['presentation'] || row.skip}">
                      <option value="">–</option>
                      @for (p of presentations; track p) {
                        <option [value]="p">{{ p }}</option>
                      }
                    </select>
                  </td>

                  <!-- Track by Lot -->
                  <td class="px-1 py-1 text-center">
                    <select [(ngModel)]="row.data.track_by_lot" [disabled]="row.skip"
                      class="w-full px-1 py-1 text-xs border border-gray-200 rounded dark:bg-gray-900 dark:border-gray-600">
                      <option value="No">No</option>
                      <option value="Si">Si</option>
                    </select>
                  </td>

                  <!-- Track by Serial -->
                  <td class="px-1 py-1 text-center">
                    <select [(ngModel)]="row.data.track_by_serial" [disabled]="row.skip"
                      class="w-full px-1 py-1 text-xs border border-gray-200 rounded dark:bg-gray-900 dark:border-gray-600">
                      <option value="No">No</option>
                      <option value="Si">Si</option>
                    </select>
                  </td>

                  <!-- Track Expiration -->
                  <td class="px-1 py-1 text-center">
                    <select [(ngModel)]="row.data.track_expiration" [disabled]="row.skip"
                      class="w-full px-1 py-1 text-xs border border-gray-200 rounded dark:bg-gray-900 dark:border-gray-600">
                      <option value="No">No</option>
                      <option value="Si">Si</option>
                    </select>
                  </td>

                  <!-- Max Qty -->
                  <td class="px-1 py-1">
                    <input type="text" [(ngModel)]="row.data.max_quantity" [disabled]="row.skip"
                      class="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-600" />
                  </td>

                  <!-- Min Qty -->
                  <td class="px-1 py-1">
                    <input type="text" [(ngModel)]="row.data.min_quantity" [disabled]="row.skip"
                      class="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-600" />
                  </td>

                  <!-- Rotation -->
                  <td class="px-1 py-1">
                    <select [(ngModel)]="row.data.rotation_strategy" [disabled]="row.skip"
                      class="w-full px-1 py-1 text-xs border border-gray-200 rounded dark:bg-gray-900 dark:border-gray-600">
                      <option value="">–</option>
                      <option value="fifo">fifo</option>
                      <option value="fefo">fefo</option>
                    </select>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <!-- Import progress bar (shows while importing) -->
      @if (isImporting) {
        <div class="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-xs text-blue-700 dark:text-blue-300 font-medium">
              {{ t('importing') || 'Importando...' }} {{ importedCount }} / {{ validRows.length }}
            </span>
            <span class="text-xs font-bold text-blue-700 dark:text-blue-300">{{ importProgress }}%</span>
          </div>
          <div class="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 overflow-hidden">
            <div class="h-2 rounded-full bg-blue-600 transition-all duration-200"
              [style.width.%]="importProgress"></div>
          </div>
        </div>
      }

      <!-- Footer -->
      <div class="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div class="text-sm text-gray-500">
          @if (importResult) {
            <span class="text-green-600 font-medium">✓ {{ importResult.successful }} {{ t('imported') }}</span>
            @if (importResult.skipped > 0) { · <span class="text-yellow-600">{{ importResult.skipped }} {{ t('skipped') }}</span> }
            @if (importResult.failed > 0) { · <span class="text-red-600">{{ importResult.failed }} {{ t('failed') }}</span> }
          }
        </div>
        <div class="flex gap-3">
          <button z-button zType="outline" type="button" (click)="cancel()" [zDisabled]="isImporting">
            {{ t('cancel') || 'Cancelar' }}
          </button>
          <button z-button zType="default" type="button"
            [zDisabled]="validRows.length === 0 || isImporting || !!importResult"
            [zLoading]="isImporting"
            (click)="startImport()">
            {{ t('import') || 'Importar' }} {{ validRows.length > 0 ? validRows.length + ' ' + (t('articles') || 'artículos') : '' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ArticleImportPreviewComponent implements OnInit {
  private readonly dialogRef = inject(ZardDialogRef);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly data = inject<ArticleImportPreviewData>(Z_MODAL_DATA);
  private readonly alertService = inject(AlertService);
  private readonly languageService = inject(LanguageService);
  private readonly articleService = inject(ArticleService);
  private readonly fetchService = inject(FetchService);

  rows: PreviewRow[] = [];
  presentations: string[] = [];
  isLoading = true;
  isImporting = false;
  importResult: { successful: number; skipped: number; failed: number } | null = null;

  // Parsing progress
  parseProgress = 0;      // 0-100
  parsedCount = 0;
  totalRows = 0;

  // Import progress
  importProgress = 0;     // 0-100
  importedCount = 0;

  get t() { return this.languageService.t.bind(this.languageService); }

  private setParseProgress(val: number): void {
    this.parseProgress = val;
    this.cdr.detectChanges();
  }

  private setImportProgress(val: number, count: number): void {
    this.importProgress = val;
    this.importedCount = count;
    this.cdr.detectChanges();
  }

  // Yields to the event loop so Angular can render the updated progress
  private tick(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  get validRows(): PreviewRow[] {
    return this.rows.filter(r => !r.skip && r.status !== 'error');
  }
  get errorRows(): number { return this.rows.filter(r => !r.skip && r.status === 'error').length; }
  get skippedRows(): number { return this.rows.filter(r => r.skip).length; }

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadPresentations(), this.parseFile()]);
    this.isLoading = false;
  }

  private async loadPresentations(): Promise<void> {
    try {
      const resp = await this.articleService.getAll();
      if (resp.data) {
        const unique = [...new Set(resp.data.map((a: any) => a.presentation).filter(Boolean))];
        this.presentations = unique as string[];
      }
    } catch { /* use empty list */ }
  }

  private async parseFile(): Promise<void> {
    try {
      this.setParseProgress(5);
      await this.tick();

      const XLSX = await import('xlsx');
      this.setParseProgress(15);

      const buf = await this.data.file.arrayBuffer();
      this.setParseProgress(30);
      await this.tick();

      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      this.setParseProgress(45);
      await this.tick();

      // Count data rows first for progress calculation
      const dataRows = raw.slice(8).filter(r => r && !r.every((c: any) => c === '' || c == null));
      this.totalRows = dataRows.length;
      this.parsedCount = 0;

      // Process rows in small chunks to keep UI responsive
      const CHUNK = 10;
      for (let i = 8; i < raw.length; i++) {
        const row = raw[i];
        if (!row || row.every((c: any) => c === '' || c == null)) continue;

        const sku = String(row[0] ?? '').trim();
        const name = String(row[1] ?? '').trim();
        const isExample = sku.toLowerCase() === 'art-001';

        const previewRow: PreviewRow = {
          originalRowNum: i + 1,
          skip: isExample,
          isExample,
          status: 'valid',
          errors: {},
          data: {
            sku,
            name,
            description: String(row[2] ?? '').trim(),
            unit_price: String(row[3] ?? '').trim(),
            presentation: String(row[4] ?? '').trim(),
            track_by_lot: this.normalizeBool(String(row[5] ?? '')),
            track_by_serial: this.normalizeBool(String(row[6] ?? '')),
            track_expiration: this.normalizeBool(String(row[7] ?? '')),
            max_quantity: String(row[8] ?? '').trim(),
            min_quantity: String(row[9] ?? '').trim(),
            rotation_strategy: String(row[10] ?? '').trim().toLowerCase(),
          },
        };
        this.validateRow(previewRow);
        this.rows.push(previewRow);

        this.parsedCount++;
        const pct = 45 + Math.round((this.parsedCount / Math.max(this.totalRows, 1)) * 50);
        this.setParseProgress(pct);

        // Yield every CHUNK rows so Angular can render progress
        if (this.parsedCount % CHUNK === 0) await this.tick();
      }
      this.setParseProgress(100);
      await this.tick();
    } catch (e) {
      this.alertService.error(this.t('import_parse_error'));
    }
  }

  private normalizeBool(val: string): string {
    const v = val.trim().toLowerCase();
    if (v === 'si' || v === 'sí' || v === 'yes' || v === 'true' || v === '1') return 'Si';
    return 'No';
  }

  validateRow(row: PreviewRow): void {
    row.errors = {};
    if (!row.data.sku) row.errors['sku'] = 'SKU requerido';
    if (!row.data.name) row.errors['name'] = 'Nombre requerido';
    row.status = Object.keys(row.errors).length > 0 ? 'error' : 'valid';
  }

  onSkipToggle(): void {
    // re-count stats (handled reactively via getters)
  }

  async startImport(): Promise<void> {
    if (this.validRows.length === 0) return;
    this.isImporting = true;
    this.importProgress = 0;
    this.importedCount = 0;

    const payload = this.validRows.map(r => r.data);
    const total = payload.length;
    const BATCH_SIZE = 20;
    const token = getBearerToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let successful = 0, skipped = 0, failed = 0;

    try {
      for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = payload.slice(i, i + BATCH_SIZE);

        const res = await fetch(`${environment.API.BASE}/articles/import/json`, {
          method: 'POST',
          headers,
          body: JSON.stringify(batch),
        });
        const json = await res.json();

        successful += json.data?.successful ?? 0;
        skipped    += json.data?.skipped    ?? 0;
        failed     += json.data?.failed     ?? 0;

        const count = Math.min(i + BATCH_SIZE, total);
        this.setImportProgress(Math.round((count / total) * 100), count);
      }

      const result = { successful, skipped, failed };
      this.importResult = result;
      this.importProgress = 100;

      const msg = `${successful} ${this.t('imported')}${skipped ? ', ' + skipped + ' ' + this.t('skipped') : ''}`;
      this.alertService.success(msg, this.t('import_complete'));
      if (this.data.onSuccess) this.data.onSuccess(result);
    } catch (e) {
      this.alertService.error(this.t('import_articles_error'));
    } finally {
      this.isImporting = false;
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
