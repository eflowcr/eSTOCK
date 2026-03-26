import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ZardDialogRef, Z_MODAL_DATA } from '@app/shared/components/dialog';
import { ZardButtonComponent } from '@app/shared/components/button/button.component';
import { ZardIconComponent } from '@app/shared/components/icon/icon.component';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { ArticleService } from '@app/services/article.service';
import { environment } from '@environment';
import { getBearerToken } from '@app/utils/get-token';

export interface ArticleImportPreviewData {
  file: File;
  onSuccess?: (result: { successful: number; skipped: number; failed: number }) => void;
}

type RowStatus = 'new' | 'exists' | 'similar' | 'error' | 'duplicate';

interface ArticleMatch {
  id: string;
  sku: string;
  name: string;
  presentation: string;
  is_active: boolean;
}

interface PreviewRow {
  originalRowNum: number;
  skip: boolean;
  isExample: boolean;
  status: RowStatus;
  fieldErrors: Record<string, string>;
  userDecision?: 'skip' | 'import';
  existingArticle?: ArticleMatch;
  similarArticles?: ArticleMatch[];
  data: {
    sku: string; name: string; description: string;
    unit_price: string; presentation: string;
    track_by_lot: string; track_by_serial: string; track_expiration: string;
    max_quantity: string; min_quantity: string; rotation_strategy: string;
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
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('preview_import') }}</h2>
          @if (!isLoading && !isValidating) {
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex flex-wrap gap-x-3">
              <span class="text-green-600 font-medium">{{ newRows }} {{ t('article_new') }}</span>
              @if (existsRows > 0) { <span class="text-blue-500">· {{ existsRows }} {{ t('article_exists') }}</span> }
              @if (similarRows > 0) { <span class="text-yellow-600">· {{ similarRows }} {{ t('article_similar') }}</span> }
              @if (errorRows > 0) { <span class="text-red-500">· {{ errorRows }} {{ t('errors') }}</span> }
              @if (skippedRows > 0) { <span class="text-gray-400">· {{ skippedRows }} {{ t('skipped') }}</span> }
            </p>
          }
        </div>
      </div>

      <!-- Body: loading / validating / table -->
      <div class="flex-1 overflow-auto px-4 py-3">

        <!-- Step 1: Parsing file -->
        @if (isLoading) {
          <div class="flex flex-col items-center justify-center h-40 gap-4 px-8">
            <div class="flex items-center gap-3 w-full">
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 shrink-0"></div>
              <span class="text-sm text-gray-600">{{ t('parsing_file') }}</span>
              <span class="ml-auto text-sm font-semibold text-blue-600">{{ parseProgress }}%</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <div class="h-2.5 rounded-full bg-blue-600 transition-all duration-150" [style.width.%]="parseProgress"></div>
            </div>
            @if (totalRows > 0) {
              <p class="text-xs text-gray-400">{{ parsedCount }} / {{ totalRows }} {{ t('rows') }}</p>
            }
          </div>
        }

        <!-- Step 2: Validating against DB -->
        @else if (isValidating) {
          <div class="flex flex-col items-center justify-center h-40 gap-4 px-8">
            <div class="flex items-center gap-3 w-full">
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 shrink-0"></div>
              <span class="text-sm text-gray-600">{{ t('validating_with_db') }}</span>
              <span class="ml-auto text-sm font-semibold text-purple-600">{{ validateProgress }}%</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <div class="h-2.5 rounded-full bg-purple-600 transition-all duration-150" [style.width.%]="validateProgress"></div>
            </div>
            <p class="text-xs text-gray-400">{{ rows.length }} {{ t('articles_verified') }}</p>
          </div>
        }

        <!-- Step 3: Table -->
        @else if (rows.length === 0) {
          <div class="text-center py-12 text-gray-500">{{ t('no_data_rows') }}</div>
        }

        @else {
          <table class="w-full text-sm border-collapse min-w-[1200px]">
            <thead>
              <tr class="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                <th class="px-2 py-2 text-center w-10 text-gray-500">#</th>
                <th class="px-2 py-2 text-center w-20 text-gray-500">{{ t('status') }}</th>
                <th class="px-2 py-2 text-center w-10 text-gray-500">{{ t('skip') }}</th>
                <th class="px-2 py-2 text-left font-semibold text-red-600 min-w-[100px]">SKU *</th>
                <th class="px-2 py-2 text-left font-semibold text-red-600 min-w-[160px]">{{ t('name') }} *</th>
                <th class="px-2 py-2 text-left text-gray-600 min-w-[140px]">{{ t('description') }}</th>
                <th class="px-2 py-2 text-left text-gray-600 w-24">{{ t('price') }}</th>
                <th class="px-2 py-2 text-left text-gray-600 min-w-[120px]">{{ t('presentation') }}</th>
                <th class="px-2 py-2 text-center text-gray-600 w-20">{{ t('lot') }}</th>
                <th class="px-2 py-2 text-center text-gray-600 w-20">{{ t('serial') }}</th>
                <th class="px-2 py-2 text-center text-gray-600 w-20">{{ t('exp') }}</th>
                <th class="px-2 py-2 text-left text-gray-600 w-20">Max</th>
                <th class="px-2 py-2 text-left text-gray-600 w-20">Min</th>
                <th class="px-2 py-2 text-left text-gray-600 w-24">{{ t('rotation') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows; track row.originalRowNum) {
                <!-- Main row -->
                <tr class="border-b border-gray-100 dark:border-gray-800 transition-colors"
                  [ngClass]="{
                    'opacity-40 bg-gray-50 dark:bg-gray-800/50': row.skip,
                    'bg-red-50 dark:bg-red-900/10': !row.skip && (row.status === 'error' || row.status === 'duplicate'),
                    'bg-blue-50 dark:bg-blue-900/10': !row.skip && row.status === 'exists',
                    'bg-yellow-50 dark:bg-yellow-900/10': !row.skip && row.status === 'similar',
                    'hover:bg-gray-50 dark:hover:bg-gray-800/30': !row.skip && row.status === 'new'
                  }">

                  <td class="px-2 py-1.5 text-center text-xs text-gray-400">{{ row.originalRowNum }}</td>

                  <!-- Status badge -->
                  <td class="px-2 py-1.5 text-center">
                    @switch (row.status) {
                      @case ('new') {
                        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700">✓ {{ t('article_new') }}</span>
                      }
                      @case ('exists') {
                        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700">{{ t('article_exists') }}</span>
                      }
                      @case ('similar') {
                        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700">~ {{ t('article_similar') }}</span>
                      }
                      @case ('duplicate') {
                        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700">✗ {{ t('article_duplicate') }}</span>
                      }
                      @case ('error') {
                        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700">✗ Error</span>
                      }
                    }
                  </td>

                  <!-- Skip -->
                  <td class="px-2 py-1.5 text-center">
                    <input type="checkbox" [(ngModel)]="row.skip"
                      [disabled]="row.status === 'error' || row.status === 'duplicate'"
                      class="h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer" />
                  </td>

                  <!-- SKU -->
                  <td class="px-1 py-1">
                    <input type="text" [(ngModel)]="row.data.sku" (input)="validateRow(row)" [disabled]="row.skip"
                      class="w-full px-2 py-1 text-xs border rounded dark:bg-gray-900 dark:border-gray-600"
                      [ngClass]="{'border-red-400': row.fieldErrors['sku'] && !row.skip, 'border-gray-200': !row.fieldErrors['sku'] || row.skip}"
                      [title]="row.fieldErrors['sku'] || ''" />
                  </td>

                  <!-- Name -->
                  <td class="px-1 py-1">
                    <input type="text" [(ngModel)]="row.data.name" (input)="validateRow(row)" [disabled]="row.skip"
                      class="w-full px-2 py-1 text-xs border rounded dark:bg-gray-900 dark:border-gray-600"
                      [ngClass]="{'border-red-400': row.fieldErrors['name'] && !row.skip, 'border-gray-200': !row.fieldErrors['name'] || row.skip}"
                      [title]="row.fieldErrors['name'] || ''" />
                  </td>

                  <!-- Description -->
                  <td class="px-1 py-1">
                    <input type="text" [(ngModel)]="row.data.description" [disabled]="row.skip"
                      class="w-full px-2 py-1 text-xs border border-gray-200 rounded dark:bg-gray-900 dark:border-gray-600" />
                  </td>

                  <!-- Unit Price -->
                  <td class="px-1 py-1">
                    <input type="text" [(ngModel)]="row.data.unit_price" [disabled]="row.skip"
                      class="w-full px-2 py-1 text-xs border border-gray-200 rounded dark:bg-gray-900 dark:border-gray-600" />
                  </td>

                  <!-- Presentation -->
                  <td class="px-1 py-1">
                    <select [(ngModel)]="row.data.presentation" [disabled]="row.skip"
                      class="w-full px-2 py-1 text-xs border rounded dark:bg-gray-900 dark:border-gray-600"
                      [ngClass]="{'border-red-400': row.fieldErrors['presentation'] && !row.skip, 'border-gray-200': !row.fieldErrors['presentation'] || row.skip}">
                      <option value="">–</option>
                      @for (p of presentations; track p) { <option [value]="p">{{ p }}</option> }
                    </select>
                  </td>

                  <!-- Booleans -->
                  @for (field of ['track_by_lot','track_by_serial','track_expiration']; track field) {
                    <td class="px-1 py-1 text-center">
                      <select [(ngModel)]="asAny(row.data)[field]" [disabled]="row.skip"
                        class="w-full px-1 py-1 text-xs border border-gray-200 rounded dark:bg-gray-900 dark:border-gray-600">
                        <option value="No">No</option>
                        <option value="Si">Si</option>
                      </select>
                    </td>
                  }

                  <!-- Max / Min -->
                  <td class="px-1 py-1"><input type="text" [(ngModel)]="row.data.max_quantity" [disabled]="row.skip" class="w-full px-2 py-1 text-xs border border-gray-200 rounded dark:bg-gray-900 dark:border-gray-600" /></td>
                  <td class="px-1 py-1"><input type="text" [(ngModel)]="row.data.min_quantity" [disabled]="row.skip" class="w-full px-2 py-1 text-xs border border-gray-200 rounded dark:bg-gray-900 dark:border-gray-600" /></td>

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

                <!-- Conflict panel for "exists" rows -->
                @if (!row.skip && row.status === 'exists' && row.existingArticle) {
                  <tr class="bg-blue-50 dark:bg-blue-900/10">
                    <td colspan="14" class="px-4 py-2">
                      <div class="flex items-center gap-3 text-xs text-blue-700 dark:text-blue-300">
                        <z-icon zType="info" class="h-4 w-4 shrink-0" />
                        <span>{{ t('article_exists') }}: <strong>{{ row.existingArticle.sku }}</strong> — "{{ row.existingArticle.name }}" ({{ row.existingArticle.presentation }})</span>
                      </div>
                    </td>
                  </tr>
                }

                <!-- Conflict panel for "similar" rows -->
                @if (!row.skip && row.status === 'similar' && row.similarArticles?.length) {
                  <tr class="bg-yellow-50 dark:bg-yellow-900/10 border-b border-yellow-100">
                    <td colspan="14" class="px-4 py-2">
                      <div class="flex items-start gap-3 text-xs">
                        <z-icon zType="triangle-alert" class="h-4 w-4 shrink-0 text-yellow-600 mt-0.5" />
                        <div class="flex-1">
                          <p class="text-yellow-700 font-medium mb-1.5">{{ t('similar_found') }}:</p>
                          <div class="flex flex-wrap gap-2">
                            @for (s of row.similarArticles; track s.id) {
                              <span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded border border-yellow-200">
                                {{ s.sku }} — "{{ s.name }}"
                              </span>
                            }
                          </div>
                        </div>
                        <div class="flex gap-2 shrink-0">
                          <button type="button"
                            class="px-2 py-1 text-xs rounded border border-yellow-400 text-yellow-700 hover:bg-yellow-100"
                            (click)="decideSimilar(row, 'skip')">
                            {{ t('skip') }}
                          </button>
                          <button type="button"
                            class="px-2 py-1 text-xs rounded bg-yellow-500 text-white hover:bg-yellow-600"
                            (click)="decideSimilar(row, 'import')">
                            {{ t('import_anyway') }}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        }
      </div>

      <!-- Import progress bar -->
      @if (isImporting) {
        <div class="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-xs text-blue-700 font-medium">{{ t('importing') }} {{ validRows.length }} {{ t('articles_label') || 'artículos' }}</span>
            <span class="text-xs font-bold text-blue-700">{{ importProgress }}%</span>
          </div>
          <div class="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 overflow-hidden">
            <div class="h-2 rounded-full bg-blue-600 transition-all duration-200" [style.width.%]="importProgress"></div>
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
          <button z-button zType="outline" type="button" (click)="cancel()" [zDisabled]="isImporting">{{ t('cancel') }}</button>
          <button z-button zType="default" type="button"
            [zDisabled]="validRows.length === 0 || isImporting || isLoading || isValidating || !!importResult"
            [zLoading]="isImporting"
            (click)="startImport()">
            {{ t('import') }} {{ validRows.length > 0 ? validRows.length + ' ' + (t('articles_label') || 'artículos') : '' }}
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

  rows: PreviewRow[] = [];
  presentations: string[] = [];

  // Step 1 — parse
  isLoading = true;
  parseProgress = 0;
  parsedCount = 0;
  totalRows = 0;

  // Step 2 — validate
  isValidating = false;
  validateProgress = 0;

  // Step 4 — import
  isImporting = false;
  importProgress = 0;
  importResult: { successful: number; skipped: number; failed: number } | null = null;

  get t() { return this.languageService.t.bind(this.languageService); }

  get validRows(): PreviewRow[] {
    return this.rows.filter(r =>
      !r.skip &&
      (r.status === 'new' || (r.status === 'similar' && r.userDecision === 'import'))
    );
  }
  get newRows(): number { return this.rows.filter(r => !r.skip && r.status === 'new').length; }
  get existsRows(): number { return this.rows.filter(r => r.status === 'exists').length; }
  get similarRows(): number { return this.rows.filter(r => !r.skip && r.status === 'similar').length; }
  get errorRows(): number { return this.rows.filter(r => r.status === 'error' || r.status === 'duplicate').length; }
  get skippedRows(): number { return this.rows.filter(r => r.skip && r.status !== 'exists').length; }

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadPresentations(), this.parseFile()]);
    await this.validateWithBackend();
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  private async loadPresentations(): Promise<void> {
    try {
      const resp = await this.articleService.getAll();
      if (resp.data) {
        this.presentations = [...new Set(resp.data.map((a: any) => a.presentation).filter(Boolean))] as string[];
      }
    } catch { /* empty */ }
  }

  private async parseFile(): Promise<void> {
    try {
      this.setParseProgress(5); await this.tick();
      const XLSX = await import('xlsx');
      this.setParseProgress(15);
      const buf = await this.data.file.arrayBuffer();
      this.setParseProgress(30); await this.tick();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      this.setParseProgress(45); await this.tick();

      const dataRows = raw.slice(8).filter(r => r && !r.every((c: any) => c === '' || c == null));
      this.totalRows = dataRows.length;
      this.parsedCount = 0;
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
          status: 'new',    // will be overwritten by validateWithBackend
          fieldErrors: {},
          data: {
            sku, name,
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
        this.rows.push(previewRow);
        this.parsedCount++;
        const pct = 45 + Math.round((this.parsedCount / Math.max(this.totalRows, 1)) * 50);
        this.setParseProgress(pct);
        if (this.parsedCount % CHUNK === 0) await this.tick();
      }
      this.setParseProgress(100); await this.tick();
    } catch (e) {
      this.alertService.error(this.t('import_parse_error'));
    }
  }

  private async validateWithBackend(): Promise<void> {
    if (this.rows.length === 0) return;
    this.isLoading = false;
    this.isValidating = true;
    this.validateProgress = 0;
    this.cdr.detectChanges();

    // Animate 0→90% while request is in-flight
    let anim: ReturnType<typeof setInterval> | null = null;
    anim = setInterval(() => {
      if (this.validateProgress < 90) {
        this.validateProgress++;
        this.cdr.detectChanges();
      }
    }, 30);

    try {
      const payload = this.rows
        .filter(r => !r.isExample)
        .map(r => r.data);

      const token = getBearerToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${environment.API.BASE}/articles/import/validate`, {
        method: 'POST', headers, body: JSON.stringify(payload),
      });
      const json = await res.json();
      clearInterval(anim!);
      this.validateProgress = 100;
      this.cdr.detectChanges();

      // Map backend results back to rows (skipping example rows)
      const results: any[] = json.data?.results ?? [];
      let resultIdx = 0;
      for (const row of this.rows) {
        if (row.isExample) continue;
        const result = results[resultIdx++];
        if (!result) continue;
        row.status = result.status as RowStatus;
        row.fieldErrors = result.field_errors ?? {};
        row.existingArticle = result.existing_article ?? undefined;
        row.similarArticles = result.similar_articles ?? undefined;
        // Auto-skip exists, duplicates, errors; similar rows default to skip until user decides
        row.skip = ['exists', 'duplicate', 'error'].includes(row.status) ||
                   (row.status === 'similar');
      }

      await this.tick();
    } catch (e) {
      if (anim) clearInterval(anim);
      this.alertService.error(this.t('import_articles_error'));
    } finally {
      this.isValidating = false;
      this.cdr.detectChanges();
    }
  }

  private normalizeBool(val: string): string {
    const v = val.trim().toLowerCase();
    return (v === 'si' || v === 'sí' || v === 'yes' || v === 'true' || v === '1') ? 'Si' : 'No';
  }

  validateRow(row: PreviewRow): void {
    row.fieldErrors = {};
    if (!row.data.sku) row.fieldErrors['sku'] = 'SKU requerido';
    if (!row.data.name) row.fieldErrors['name'] = 'Nombre requerido';
    if (!row.data.presentation) row.fieldErrors['presentation'] = 'Presentación requerida';
    if (Object.keys(row.fieldErrors).length > 0) row.status = 'error';
    else if (row.status === 'error') row.status = 'new'; // user fixed it
  }

  decideSimilar(row: PreviewRow, decision: 'skip' | 'import'): void {
    row.userDecision = decision;
    row.skip = decision === 'skip';
    this.cdr.detectChanges();
  }

  private setParseProgress(val: number): void {
    this.parseProgress = val;
    this.cdr.detectChanges();
  }

  private tick(): Promise<void> { return new Promise(r => setTimeout(r, 0)); }

  async startImport(): Promise<void> {
    if (this.validRows.length === 0) return;
    this.isImporting = true;
    this.importProgress = 0;

    const payload = this.validRows.map(r => r.data);
    const token = getBearerToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let anim: ReturnType<typeof setInterval> | null = null;
    anim = setInterval(() => {
      if (this.importProgress < 90) { this.importProgress++; this.cdr.detectChanges(); }
    }, 35);

    try {
      const res = await fetch(`${environment.API.BASE}/articles/import/json`, {
        method: 'POST', headers, body: JSON.stringify(payload),
      });
      const json = await res.json();
      clearInterval(anim!);
      const result = {
        successful: json.data?.successful ?? 0,
        skipped:    json.data?.skipped    ?? 0,
        failed:     json.data?.failed     ?? 0,
      };
      this.importResult = result;
      this.importProgress = 100;
      this.cdr.detectChanges();
      const msg = `${result.successful} ${this.t('imported')}${result.skipped ? ', ' + result.skipped + ' ' + this.t('skipped') : ''}`;
      this.alertService.success(msg, this.t('import_complete'));
      if (this.data.onSuccess) this.data.onSuccess(result);
    } catch (e) {
      if (anim) clearInterval(anim);
      this.alertService.error(this.t('import_articles_error'));
    } finally {
      this.isImporting = false;
      this.cdr.detectChanges();
    }
  }

  asAny(val: any): any { return val; }

  cancel(): void { this.dialogRef.close(); }
}
