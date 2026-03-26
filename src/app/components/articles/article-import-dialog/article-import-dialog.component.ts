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

export interface ArticleImportDialogData {
  onSuccess?: (result: { successful: number; skipped: number; failed: number }) => void;
}

type RowStatus = 'new' | 'exists' | 'similar' | 'error' | 'duplicate';

interface ArticleMatch { id: string; sku: string; name: string; presentation: string; is_active: boolean; }

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
    sku: string; name: string; description: string; unit_price: string;
    presentation: string; track_by_lot: string; track_by_serial: string;
    track_expiration: string; max_quantity: string; min_quantity: string;
    rotation_strategy: string;
  };
}

@Component({
  selector: 'app-article-import-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ZardButtonComponent, ZardIconComponent],
  template: `
    <div class="flex flex-col" [ngClass]="step === 3 ? 'h-[80vh] max-h-[80vh]' : ''">

      <!-- Step indicator -->
      <div class="flex items-center gap-0 px-6 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
        @for (s of steps; track s.n) {
          <div class="flex items-center" [ngClass]="{'flex-1': !$last}">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors"
                [ngClass]="{
                  'bg-blue-600 text-white': step === s.n,
                  'bg-green-500 text-white': step > s.n,
                  'bg-gray-100 text-gray-400 dark:bg-gray-700': step < s.n
                }">
                @if (step > s.n) { ✓ } @else { {{ s.n }} }
              </div>
              <span class="text-xs font-medium hidden sm:block"
                [ngClass]="{'text-blue-600': step === s.n, 'text-green-600': step > s.n, 'text-gray-400': step < s.n}">
                {{ t(s.key) || s.label }}
              </span>
            </div>
            @if (!$last) {
              <div class="flex-1 h-px mx-3 transition-colors"
                [ngClass]="step > s.n ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'"></div>
            }
          </div>
        }
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-auto">

        <!-- ── STEP 1: Upload ── -->
        @if (step === 1) {
          <div class="px-6 py-6 max-w-lg mx-auto space-y-5">

            <!-- Drop zone -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {{ t('select_file') || 'Seleccionar archivo' }}
              </label>
              <div class="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
                [ngClass]="selectedFile ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-300 hover:border-gray-400 dark:border-gray-600'"
                (click)="fileInput.click()" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
                <input #fileInput type="file" class="hidden" accept=".xlsx,.xls,.csv" (change)="onFileSelected($event)" />
                @if (!selectedFile) {
                  <z-icon zType="file" class="mx-auto h-10 w-10 text-gray-300 mb-3" />
                  <p class="text-sm text-gray-500">{{ t('click_to_upload') || 'Haz clic para subir archivo' }}</p>
                  <p class="text-xs text-gray-400 mt-1">.xlsx, .xls, .csv</p>
                } @else {
                  <z-icon zType="circle-check" class="mx-auto h-10 w-10 text-green-500 mb-2" />
                  <p class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ selectedFile.name }}</p>
                  <p class="text-xs text-gray-400 mt-1">{{ formatSize(selectedFile.size) }}</p>
                  <button type="button" class="mt-2 text-xs text-red-500 hover:text-red-700 underline"
                    (click)="removeFile($event)">{{ t('remove') || 'Eliminar' }}</button>
                }
              </div>
            </div>

            <!-- Template download -->
            <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div class="flex items-center justify-between">
                <p class="text-sm font-medium text-blue-800 dark:text-blue-200">{{ t('template_info') || 'Info de Plantilla' }}</p>
                <button type="button" class="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                  (click)="downloadTemplate()">{{ t('download_template') || 'Descargar Plantilla' }}</button>
              </div>
              <p class="text-xs text-blue-600 dark:text-blue-300 mt-2">
                {{ t('template_includes_validations') || 'La plantilla incluye listas desplegables y validaciones de datos.' }}
              </p>
            </div>
          </div>
        }

        <!-- ── STEP 2: Reading & Validating ── -->
        @if (step === 2) {
          <div class="px-6 py-8 max-w-lg mx-auto space-y-6">

            <!-- Parse progress -->
            <div class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-2">
                  @if (parseProgress < 100) {
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 shrink-0"></div>
                  } @else {
                    <z-icon zType="circle-check" class="h-4 w-4 text-green-500 shrink-0" />
                  }
                  <span class="text-gray-600 dark:text-gray-400">{{ t('parsing_file') || 'Leyendo archivo...' }}</span>
                </div>
                <span class="font-semibold" [ngClass]="parseProgress === 100 ? 'text-green-600' : 'text-blue-600'">
                  {{ parseProgress }}%
                </span>
              </div>
              <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div class="h-2 rounded-full transition-all duration-150"
                  [ngClass]="parseProgress === 100 ? 'bg-green-500' : 'bg-blue-600'"
                  [style.width.%]="parseProgress"></div>
              </div>
              @if (totalRows > 0) {
                <p class="text-xs text-gray-400 text-right">{{ parsedCount }} / {{ totalRows }} {{ t('rows') || 'filas' }}</p>
              }
            </div>

            <!-- Validate progress -->
            <div class="space-y-2" [ngClass]="{'opacity-40': parseProgress < 100}">
              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-2">
                  @if (validateProgress > 0 && validateProgress < 100) {
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 shrink-0"></div>
                  } @else if (validateProgress === 100) {
                    <z-icon zType="circle-check" class="h-4 w-4 text-green-500 shrink-0" />
                  } @else {
                    <div class="h-4 w-4 rounded-full border-2 border-gray-300 shrink-0"></div>
                  }
                  <span class="text-gray-600 dark:text-gray-400">{{ t('validating_with_db') || 'Validando con base de datos...' }}</span>
                </div>
                <span class="font-semibold" [ngClass]="validateProgress === 100 ? 'text-green-600' : 'text-purple-600'">
                  {{ validateProgress }}%
                </span>
              </div>
              <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div class="h-2 rounded-full transition-all duration-150"
                  [ngClass]="validateProgress === 100 ? 'bg-green-500' : 'bg-purple-600'"
                  [style.width.%]="validateProgress"></div>
              </div>
              @if (validateProgress > 0) {
                <p class="text-xs text-gray-400 text-right">{{ rows.length }} {{ t('articles_verified') || 'artículos verificados' }}</p>
              }
            </div>
          </div>
        }

        <!-- ── STEP 3: Preview table ── -->
        @if (step === 3) {
          <div class="px-4 py-3">

            <!-- Stats bar -->
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 px-1 text-xs">
              <span class="text-green-600 font-medium">{{ newRows }} {{ t('article_new') || 'Nuevo' }}</span>
              @if (existsRows > 0) { <span class="text-blue-500">· {{ existsRows }} {{ t('article_exists') || 'Ya existe' }}</span> }
              @if (similarRows > 0) { <span class="text-yellow-600">· {{ similarRows }} {{ t('article_similar') || 'Similar' }}</span> }
              @if (errorRows > 0) { <span class="text-red-500">· {{ errorRows }} {{ t('errors') || 'Errores' }}</span> }
              @if (skippedRows > 0) { <span class="text-gray-400">· {{ skippedRows }} {{ t('skipped') || 'Omitidos' }}</span> }
            </div>

            <div class="overflow-auto">
              <table class="w-full text-sm border-collapse min-w-[1200px]">
                <thead>
                  <tr class="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                    <th class="px-2 py-2 text-center w-10 text-gray-500">#</th>
                    <th class="px-2 py-2 text-center w-20 text-gray-500">{{ t('status') || 'Estado' }}</th>
                    <th class="px-2 py-2 text-center w-10 text-gray-500">{{ t('skip') || 'Omit.' }}</th>
                    <th class="px-2 py-2 text-left font-semibold text-red-600 min-w-[100px]">SKU *</th>
                    <th class="px-2 py-2 text-left font-semibold text-red-600 min-w-[160px]">{{ t('name') || 'Nombre' }} *</th>
                    <th class="px-2 py-2 text-left text-gray-600 min-w-[140px]">{{ t('description') || 'Descripción' }}</th>
                    <th class="px-2 py-2 text-left text-gray-600 w-24">{{ t('price') || 'Precio' }}</th>
                    <th class="px-2 py-2 text-left text-gray-600 min-w-[120px]">{{ t('presentation') || 'Presentación' }}</th>
                    <th class="px-2 py-2 text-center text-gray-600 w-20">{{ t('lot') || 'Lote' }}</th>
                    <th class="px-2 py-2 text-center text-gray-600 w-20">{{ t('serial') || 'Serie' }}</th>
                    <th class="px-2 py-2 text-center text-gray-600 w-20">{{ t('exp') || 'Exp.' }}</th>
                    <th class="px-2 py-2 text-left text-gray-600 w-20">Max</th>
                    <th class="px-2 py-2 text-left text-gray-600 w-20">Min</th>
                    <th class="px-2 py-2 text-left text-gray-600 w-24">{{ t('rotation') || 'Rotación' }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of rows; track row.originalRowNum) {
                    <tr class="border-b border-gray-100 dark:border-gray-800"
                      [ngClass]="{
                        'opacity-40 bg-gray-50': row.skip,
                        'bg-red-50 dark:bg-red-900/10': !row.skip && (row.status==='error'||row.status==='duplicate'),
                        'bg-blue-50 dark:bg-blue-900/10': !row.skip && row.status==='exists',
                        'bg-yellow-50 dark:bg-yellow-900/10': !row.skip && row.status==='similar',
                        'hover:bg-gray-50 dark:hover:bg-gray-800/30': !row.skip && row.status==='new'
                      }">
                      <td class="px-2 py-1.5 text-center text-xs text-gray-400">{{ row.originalRowNum }}</td>
                      <td class="px-2 py-1.5 text-center">
                        @switch (row.status) {
                          @case ('new') { <span class="inline-flex px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700">✓ {{ t('article_new') || 'Nuevo' }}</span> }
                          @case ('exists') { <span class="inline-flex px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700">{{ t('article_exists') || 'Ya existe' }}</span> }
                          @case ('similar') { <span class="inline-flex px-1.5 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700">~ {{ t('article_similar') || 'Similar' }}</span> }
                          @case ('duplicate') { <span class="inline-flex px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700">✗ {{ t('article_duplicate') || 'Dup.' }}</span> }
                          @case ('error') { <span class="inline-flex px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700">✗ Error</span> }
                        }
                      </td>
                      <td class="px-2 py-1.5 text-center">
                        <input type="checkbox" [(ngModel)]="row.skip"
                          [disabled]="row.status==='error'||row.status==='duplicate'"
                          class="h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer" />
                      </td>
                      <td class="px-1 py-1">
                        <input type="text" [(ngModel)]="row.data.sku" (input)="validateRow(row)" [disabled]="row.skip"
                          class="w-full px-2 py-1 text-xs border rounded dark:bg-gray-900 dark:border-gray-600"
                          [ngClass]="{'border-red-400': row.fieldErrors['sku']&&!row.skip,'border-gray-200':!row.fieldErrors['sku']||row.skip}" />
                      </td>
                      <td class="px-1 py-1">
                        <input type="text" [(ngModel)]="row.data.name" (input)="validateRow(row)" [disabled]="row.skip"
                          class="w-full px-2 py-1 text-xs border rounded dark:bg-gray-900 dark:border-gray-600"
                          [ngClass]="{'border-red-400': row.fieldErrors['name']&&!row.skip,'border-gray-200':!row.fieldErrors['name']||row.skip}" />
                      </td>
                      <td class="px-1 py-1"><input type="text" [(ngModel)]="row.data.description" [disabled]="row.skip" class="w-full px-2 py-1 text-xs border border-gray-200 rounded dark:bg-gray-900 dark:border-gray-600" /></td>
                      <td class="px-1 py-1"><input type="text" [(ngModel)]="row.data.unit_price" [disabled]="row.skip" class="w-full px-2 py-1 text-xs border border-gray-200 rounded dark:bg-gray-900 dark:border-gray-600" /></td>
                      <td class="px-1 py-1">
                        <select [(ngModel)]="row.data.presentation" [disabled]="row.skip"
                          class="w-full px-2 py-1 text-xs border rounded dark:bg-gray-900 dark:border-gray-600"
                          [ngClass]="{'border-red-400':row.fieldErrors['presentation']&&!row.skip,'border-gray-200':!row.fieldErrors['presentation']||row.skip}">
                          <option value="">–</option>
                          @for (p of presentations; track p) { <option [value]="p">{{ p }}</option> }
                        </select>
                      </td>
                      @for (field of ['track_by_lot','track_by_serial','track_expiration']; track field) {
                        <td class="px-1 py-1 text-center">
                          <select [(ngModel)]="asAny(row.data)[field]" [disabled]="row.skip"
                            class="w-full px-1 py-1 text-xs border border-gray-200 rounded dark:bg-gray-900 dark:border-gray-600">
                            <option value="No">No</option><option value="Si">Si</option>
                          </select>
                        </td>
                      }
                      <td class="px-1 py-1"><input type="text" [(ngModel)]="row.data.max_quantity" [disabled]="row.skip" class="w-full px-2 py-1 text-xs border border-gray-200 rounded dark:bg-gray-900 dark:border-gray-600" /></td>
                      <td class="px-1 py-1"><input type="text" [(ngModel)]="row.data.min_quantity" [disabled]="row.skip" class="w-full px-2 py-1 text-xs border border-gray-200 rounded dark:bg-gray-900 dark:border-gray-600" /></td>
                      <td class="px-1 py-1">
                        <select [(ngModel)]="row.data.rotation_strategy" [disabled]="row.skip"
                          class="w-full px-1 py-1 text-xs border border-gray-200 rounded dark:bg-gray-900 dark:border-gray-600">
                          <option value="">–</option><option value="fifo">fifo</option><option value="fefo">fefo</option>
                        </select>
                      </td>
                    </tr>
                    @if (!row.skip && row.status==='exists' && row.existingArticle) {
                      <tr class="bg-blue-50 dark:bg-blue-900/10">
                        <td colspan="14" class="px-4 py-1.5 text-xs text-blue-700">
                          {{ t('article_exists') }}: <strong>{{ row.existingArticle.sku }}</strong> — "{{ row.existingArticle.name }}"
                        </td>
                      </tr>
                    }
                    @if (!row.skip && row.status==='similar' && row.similarArticles?.length) {
                      <tr class="bg-yellow-50 dark:bg-yellow-900/10 border-b border-yellow-100">
                        <td colspan="14" class="px-4 py-2">
                          <div class="flex items-center gap-3 text-xs">
                            <span class="text-yellow-700">⚠ {{ t('similar_found') || 'Similar encontrado' }}:</span>
                            <div class="flex flex-wrap gap-2 flex-1">
                              @for (s of row.similarArticles; track s.id) {
                                <span class="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded border border-yellow-200">{{ s.sku }} — "{{ s.name }}"</span>
                              }
                            </div>
                            <div class="flex gap-2 shrink-0">
                              <button type="button" class="px-2 py-0.5 text-xs rounded border border-yellow-400 text-yellow-700 hover:bg-yellow-100" (click)="decideSimilar(row,'skip')">{{ t('skip') }}</button>
                              <button type="button" class="px-2 py-0.5 text-xs rounded bg-yellow-500 text-white hover:bg-yellow-600" (click)="decideSimilar(row,'import')">{{ t('import_anyway') }}</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

      </div>

      <!-- Import progress bar (step 3, while importing) -->
      @if (isImporting) {
        <div class="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200">
          <div class="flex justify-between text-xs text-blue-700 mb-1.5">
            <span>{{ t('importing') || 'Importando...' }} {{ validRows.length }} {{ t('articles_label') || 'artículos' }}</span>
            <span class="font-bold">{{ importProgress }}%</span>
          </div>
          <div class="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
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
          <button z-button zType="outline" type="button" (click)="close()" [zDisabled]="isImporting || step===2">
            {{ t('cancel') || 'Cancelar' }}
          </button>
          @if (step === 1) {
            <button z-button zType="default" type="button" [zDisabled]="!selectedFile" (click)="goToStep2()">
              {{ t('next') || 'Siguiente' }} →
            </button>
          }
          @if (step === 3) {
            <button z-button zType="default" type="button"
              [zDisabled]="validRows.length===0||isImporting||!!importResult"
              [zLoading]="isImporting"
              (click)="startImport()">
              {{ t('import') }} {{ validRows.length > 0 ? validRows.length+' '+(t('articles_label')||'artículos') : '' }}
            </button>
          }
        </div>
      </div>
    </div>
  `,
})
export class ArticleImportDialogComponent {
  private readonly dialogRef = inject(ZardDialogRef);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly data = inject<ArticleImportDialogData>(Z_MODAL_DATA);
  private readonly alertService = inject(AlertService);
  private readonly languageService = inject(LanguageService);
  private readonly articleService = inject(ArticleService);

  step: 1 | 2 | 3 = 1;
  steps = [
    { n: 1, key: 'step_upload',   label: 'Subir' },
    { n: 2, key: 'step_verify',   label: 'Verificar' },
    { n: 3, key: 'step_review',   label: 'Revisar' },
  ];

  // Step 1
  selectedFile: File | null = null;

  // Step 2 — parse
  parseProgress = 0;
  parsedCount = 0;
  totalRows = 0;

  // Step 2 — validate
  validateProgress = 0;

  // Step 3
  rows: PreviewRow[] = [];
  presentations: string[] = [];

  // Step 3 — import
  isImporting = false;
  importProgress = 0;
  importResult: { successful: number; skipped: number; failed: number } | null = null;

  get t() { return this.languageService.t.bind(this.languageService); }

  get validRows() {
    return this.rows.filter(r => !r.skip && (r.status==='new' || (r.status==='similar' && r.userDecision==='import')));
  }
  get newRows() { return this.rows.filter(r => !r.skip && r.status==='new').length; }
  get existsRows() { return this.rows.filter(r => r.status==='exists').length; }
  get similarRows() { return this.rows.filter(r => !r.skip && r.status==='similar').length; }
  get errorRows() { return this.rows.filter(r => r.status==='error'||r.status==='duplicate').length; }
  get skippedRows() { return this.rows.filter(r => r.skip && r.status!=='exists').length; }

  // ── Step 1 actions ──

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.selectedFile = file;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.selectedFile = file;
  }

  removeFile(event: MouseEvent): void {
    event.stopPropagation();
    this.selectedFile = null;
  }

  formatSize(bytes: number): string {
    return bytes > 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : (bytes / 1024).toFixed(0) + ' KB';
  }

  downloadTemplate(): void {
    const token = getBearerToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const lang = localStorage.getItem('estock-language') || 'es';
    fetch(`${environment.API.BASE}/articles/import/template?lang=${lang}`, { headers })
      .then(r => r.blob()).then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'ImportArticles.xlsx';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }).catch(() => {
        const a = document.createElement('a');
        a.href = '/assets/files/ImportArticles.xlsx'; a.download = 'ImportArticles.xlsx';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      });
  }

  async goToStep2(): Promise<void> {
    if (!this.selectedFile) return;
    this.step = 2;
    this.cdr.detectChanges();
    await Promise.all([this.loadPresentations(), this.parseFile()]);
    await this.validateWithBackend();
    this.step = 3;
    this.cdr.detectChanges();
  }

  // ── Step 2 logic ──

  private async loadPresentations(): Promise<void> {
    try {
      const resp = await this.articleService.getAll();
      if (resp.data) {
        this.presentations = [...new Set(resp.data.map((a: any) => a.presentation).filter(Boolean))] as string[];
      }
    } catch { /* empty */ }
  }

  private async parseFile(): Promise<void> {
    if (!this.selectedFile) return;
    try {
      this.set(p => p.parseProgress = 5); await this.tick();
      const XLSX = await import('xlsx');
      this.set(p => p.parseProgress = 15);
      const buf = await this.selectedFile!.arrayBuffer();
      this.set(p => p.parseProgress = 30); await this.tick();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      this.set(p => p.parseProgress = 45); await this.tick();

      const dataRows = raw.slice(8).filter(r => r && !r.every((c: any) => c===''||c==null));
      this.totalRows = dataRows.length;
      this.parsedCount = 0;
      const CHUNK = 10;

      for (let i = 8; i < raw.length; i++) {
        const row = raw[i];
        if (!row || row.every((c: any) => c===''||c==null)) continue;
        const sku = String(row[0]??'').trim();
        const name = String(row[1]??'').trim();
        const previewRow: PreviewRow = {
          originalRowNum: i+1, skip: sku.toLowerCase()==='art-001',
          isExample: sku.toLowerCase()==='art-001', status: 'new', fieldErrors: {},
          data: {
            sku, name, description: String(row[2]??'').trim(),
            unit_price: String(row[3]??'').trim(), presentation: String(row[4]??'').trim(),
            track_by_lot: this.normalizeBool(String(row[5]??'')),
            track_by_serial: this.normalizeBool(String(row[6]??'')),
            track_expiration: this.normalizeBool(String(row[7]??'')),
            max_quantity: String(row[8]??'').trim(), min_quantity: String(row[9]??'').trim(),
            rotation_strategy: String(row[10]??'').trim().toLowerCase(),
          },
        };
        this.rows.push(previewRow);
        this.parsedCount++;
        const pct = 45 + Math.round((this.parsedCount / Math.max(this.totalRows,1)) * 50);
        this.set(p => p.parseProgress = pct);
        if (this.parsedCount % CHUNK === 0) await this.tick();
      }
      this.set(p => p.parseProgress = 100); await this.tick();
    } catch { this.alertService.error(this.t('import_parse_error')); }
  }

  private async validateWithBackend(): Promise<void> {
    if (!this.rows.length) return;
    this.set(p => p.validateProgress = 0); await this.tick();
    let anim: ReturnType<typeof setInterval> | null = null;
    anim = setInterval(() => {
      if (this.validateProgress < 90) { this.set(p => p.validateProgress++); }
    }, 30);
    try {
      const payload = this.rows.filter(r => !r.isExample).map(r => r.data);
      const token = getBearerToken();
      const headers: Record<string,string> = {'Content-Type':'application/json'};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${environment.API.BASE}/articles/import/validate`, {method:'POST',headers,body:JSON.stringify(payload)});
      const json = await res.json();
      clearInterval(anim!);
      this.set(p => p.validateProgress = 100);
      await new Promise(r => setTimeout(r, 350));
      const results: any[] = json.data?.results ?? [];
      let ri = 0;
      for (const row of this.rows) {
        if (row.isExample) continue;
        const result = results[ri++];
        if (!result) continue;
        row.status = result.status;
        row.fieldErrors = result.field_errors ?? {};
        row.existingArticle = result.existing_article;
        row.similarArticles = result.similar_articles;
        row.skip = ['exists','duplicate','error'].includes(row.status) || row.status==='similar';
      }
      await this.tick();
    } catch {
      if (anim) clearInterval(anim);
    } finally {
      this.cdr.detectChanges();
    }
  }

  // ── Step 3 actions ──

  validateRow(row: PreviewRow): void {
    row.fieldErrors = {};
    if (!row.data.sku) row.fieldErrors['sku'] = 'SKU requerido';
    if (!row.data.name) row.fieldErrors['name'] = 'Nombre requerido';
    if (!row.data.presentation) row.fieldErrors['presentation'] = 'Presentación requerida';
    row.status = Object.keys(row.fieldErrors).length > 0 ? 'error' : row.status==='error' ? 'new' : row.status;
  }

  decideSimilar(row: PreviewRow, decision: 'skip'|'import'): void {
    row.userDecision = decision;
    row.skip = decision==='skip';
    this.cdr.detectChanges();
  }

  async startImport(): Promise<void> {
    if (!this.validRows.length) return;
    this.isImporting = true;
    this.importProgress = 0;
    const payload = this.validRows.map(r => r.data);
    const token = getBearerToken();
    const headers: Record<string,string> = {'Content-Type':'application/json'};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    let anim: ReturnType<typeof setInterval> | null = null;
    anim = setInterval(() => { if (this.importProgress < 90) { this.set(p => p.importProgress++); } }, 35);
    try {
      const res = await fetch(`${environment.API.BASE}/articles/import/json`, {method:'POST',headers,body:JSON.stringify(payload)});
      const json = await res.json();
      clearInterval(anim!);
      const result = {successful: json.data?.successful??0, skipped: json.data?.skipped??0, failed: json.data?.failed??0};
      this.importResult = result;
      this.set(p => p.importProgress = 100);
      const msg = `${result.successful} ${this.t('imported')}${result.skipped?', '+result.skipped+' '+this.t('skipped'):''}`;
      this.alertService.success(msg, this.t('import_complete'));
      if (this.data.onSuccess) this.data.onSuccess(result);
      setTimeout(() => this.dialogRef.close(), 1500);
    } catch {
      if (anim) clearInterval(anim);
      this.alertService.error(this.t('import_articles_error'));
    } finally {
      this.isImporting = false;
      this.cdr.detectChanges();
    }
  }

  // ── Helpers ──

  private set(fn: (self: this) => void): void { fn(this); this.cdr.detectChanges(); }
  private tick(): Promise<void> { return new Promise(r => setTimeout(r, 0)); }
  private normalizeBool(val: string): string {
    const v = val.trim().toLowerCase();
    return (v==='si'||v==='sí'||v==='yes'||v==='true'||v==='1') ? 'Si' : 'No';
  }
  asAny(val: any): any { return val; }
  close(): void { this.dialogRef.close(); }
}
