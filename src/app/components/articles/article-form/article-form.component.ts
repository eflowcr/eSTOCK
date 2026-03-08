import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ZardButtonComponent } from '../../../shared/components/button/button.component';
import { DrawerComponent } from '../../../shared/components/drawer';
import { ZardFormImports } from '../../../shared/components/form/form.imports';
import { ZardInputDirective } from '../../../shared/components/input/input.directive';
import { ZardSelectImports } from '../../../shared/components/select/select.imports';
import { Article, CreateArticleRequest, UpdateArticleRequest } from '../../../models/article.model';
import { ArticleService } from '../../../services/article.service';
import { AlertService } from '../../../services/extras/alert.service';
import { LanguageService } from '../../../services/extras/language.service';
import { getApiErrorMessage } from '@app/utils';

/** Ensures min_quantity <= max_quantity when both are set. */
function minMaxQuantityValidator(group: AbstractControl): Record<string, boolean> | null {
  const min = group.get('min_quantity')?.value;
  const max = group.get('max_quantity')?.value;
  if (min == null || max == null) return null;
  const minNum = Number(min);
  const maxNum = Number(max);
  if (Number.isNaN(minNum) || Number.isNaN(maxNum)) return null;
  if (minNum > maxNum) {
    group.get('min_quantity')?.setErrors({ ...group.get('min_quantity')?.errors, minMaxQuantity: true });
    group.get('max_quantity')?.setErrors({ ...group.get('max_quantity')?.errors, minMaxQuantity: true });
    return { minMaxQuantity: true };
  }
  const minCtrl = group.get('min_quantity');
  const maxCtrl = group.get('max_quantity');
  if (minCtrl?.errors?.['minMaxQuantity']) {
    const { minMaxQuantity: _, ...rest } = minCtrl.errors;
    minCtrl.setErrors(Object.keys(rest).length ? rest : null);
  }
  if (maxCtrl?.errors?.['minMaxQuantity']) {
    const { minMaxQuantity: __, ...rest } = maxCtrl.errors;
    maxCtrl.setErrors(Object.keys(rest).length ? rest : null);
  }
  return null;
}

@Component({
  selector: 'app-article-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DrawerComponent, ZardButtonComponent, ZardFormImports, ZardInputDirective, ZardSelectImports],
  templateUrl: './article-form.component.html',
  styleUrls: ['./article-form.component.css']
})
export class ArticleFormComponent implements OnInit, OnChanges {
  @Input() initialData?: Article | null;
  @Input() isOpen = false;
  @Output() success = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  articleForm!: FormGroup;
  isLoading = false;
  isEditMode = false;
  unitPriceDisplay = '';
  /** Real-time SKU availability: idle | checking | available | in_use | error */
  skuCheckStatus: 'idle' | 'checking' | 'available' | 'in_use' | 'error' = 'idle';

  constructor(
    private fb: FormBuilder,
    private articleService: ArticleService,
    private alertService: AlertService,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialData']) {
      this.isEditMode = !!this.initialData;
      if (this.articleForm) {
        this.loadArticleData();
      }
    }
    if (changes['isOpen'] && this.isOpen && this.articleForm) {
      this.loadArticleData();
    }
    if (changes['isOpen'] && !changes['isOpen'].currentValue) {
      // Reset form when dialog closes
      this.articleForm?.reset();
      this.articleForm?.patchValue({ presentation: 'unit', is_active: true });
      this.isEditMode = false;
      this.skuCheckStatus = 'idle';
    }
  }

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  private initializeForm(): void {
    this.articleForm = this.fb.group(
      {
        sku: ['', [Validators.required, Validators.maxLength(50)]],
        name: ['', [Validators.required, Validators.maxLength(255)]],
        description: ['', Validators.maxLength(500)],
        unit_price: [null, [Validators.min(0)]],
        presentation: ['unit', Validators.required],
        track_by_lot: [false],
        track_by_serial: [false],
        track_expiration: [false],
        min_quantity: [null, [Validators.min(0)]],
        max_quantity: [null, [Validators.min(0)]],
        is_active: [true]
      },
      { validators: [minMaxQuantityValidator] }
    );

    this.loadArticleData();

    this.articleForm.get('unit_price')?.valueChanges.subscribe((value: number | null) => {
      this.unitPriceDisplay = this.formatThousands(value);
    });

    // Enforce dependency: expiration tracking requires lot tracking
    this.articleForm.get('track_by_lot')?.valueChanges.subscribe((enabled: boolean) => {
      if (!enabled) {
        this.articleForm.patchValue({ track_expiration: false });
      }
    });

    // Keep min/max connected after user stops typing (debounce so typing "500" doesn't sync on "5")
    const minMaxDebounceMs = 600;
    this.articleForm.get('min_quantity')?.valueChanges.pipe(debounceTime(minMaxDebounceMs)).subscribe((min: number | null) => {
      const maxCtrl = this.articleForm.get('max_quantity');
      const max = maxCtrl?.value;
      if (min != null && max != null && min > max) {
        maxCtrl?.setValue(min, { emitEvent: false });
      }
    });
    this.articleForm.get('max_quantity')?.valueChanges.pipe(debounceTime(minMaxDebounceMs)).subscribe((max: number | null) => {
      const minCtrl = this.articleForm.get('min_quantity');
      const min = minCtrl?.value;
      if (min != null && max != null && min > max) {
        minCtrl?.setValue(max, { emitEvent: false });
      }
    });

    // Real-time SKU availability check (create mode only, debounced)
    this.articleForm.get('sku')?.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(async (value: string) => {
      const skuCtrl = this.articleForm.get('sku');
      const trimmed = (value || '').trim();
      if (this.isEditMode) {
        this.skuCheckStatus = 'idle';
        this.clearSkuInUseError();
        return;
      }
      if (trimmed.length < 2) {
        this.skuCheckStatus = 'idle';
        this.clearSkuInUseError();
        return;
      }
      this.skuCheckStatus = 'checking';
      this.clearSkuInUseError();
      const result = await this.articleService.checkSkuAvailability(trimmed);
      if (skuCtrl?.value?.trim() !== trimmed) return; // user changed SKU while request was in flight
      this.skuCheckStatus = result;
      if (result === 'in_use') {
        skuCtrl?.setErrors({ ...skuCtrl.errors, skuInUse: true });
      } else {
        this.clearSkuInUseError();
      }
    });
  }

  private clearSkuInUseError(): void {
    const skuCtrl = this.articleForm.get('sku');
    if (!skuCtrl?.errors?.['skuInUse']) return;
    const { skuInUse: _, ...rest } = skuCtrl.errors;
    skuCtrl.setErrors(Object.keys(rest).length ? rest : null);
  }

  private formatThousands(value: number | string | null): string {
    if (value == null || value === '') return '';
    const digits = String(value).replace(/\D/g, '');
    if (!digits) return '';
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  /** Allow only digits so price stays numeric. */
  onUnitPriceKeydown(event: KeyboardEvent): void {
    const key = event.key;
    if (key === 'Backspace' || key === 'Delete' || key === 'Tab' || key === 'Escape' || key === 'Enter') return;
    if (event.ctrlKey || event.metaKey) {
      if (key === 'a' || key === 'c' || key === 'v' || key === 'x') return;
    }
    if (!/^\d$/.test(key)) {
      event.preventDefault();
    }
  }

  onUnitPriceInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');

    if (!digits) {
      this.unitPriceDisplay = '';
      this.articleForm.get('unit_price')?.setValue(null, { emitEvent: false });
      return;
    }

    const numericValue = Number(digits);
    this.articleForm.get('unit_price')?.setValue(numericValue, { emitEvent: false });
    this.unitPriceDisplay = this.formatThousands(numericValue);
    input.value = this.unitPriceDisplay;
  }

  onUnitPriceBlur(event: Event): void {
    const control = this.articleForm.get('unit_price');
    control?.markAsTouched();
    this.unitPriceDisplay = this.formatThousands(control?.value ?? null);
    (event.target as HTMLInputElement).value = this.unitPriceDisplay;
  }

  private loadArticleData(): void {
    if (this.initialData && this.articleForm) {
      let minQ = this.initialData.min_quantity ?? null;
      let maxQ = this.initialData.max_quantity ?? null;
      if (minQ != null && maxQ != null && minQ > maxQ) {
        maxQ = minQ;
      }
      this.articleForm.patchValue({
        sku: this.initialData.sku,
        name: this.initialData.name,
        description: this.initialData.description || '',
        unit_price: this.initialData.unit_price,
        presentation: this.initialData.presentation,
        track_by_lot: this.initialData.track_by_lot,
        track_by_serial: this.initialData.track_by_serial,
        track_expiration: this.initialData.track_expiration,
        min_quantity: minQ,
        max_quantity: maxQ,
        is_active: this.initialData.is_active !== false
      });

      // Coerce invalid combination: expiration without lot
      if (!this.articleForm.get('track_by_lot')?.value && this.articleForm.get('track_expiration')?.value) {
        this.articleForm.patchValue({ track_expiration: false });
      }

      // Disable SKU field in edit mode; reset live check status
      if (this.isEditMode) {
        this.articleForm.get('sku')?.disable();
        this.skuCheckStatus = 'idle';
      } else {
        this.articleForm.get('sku')?.enable();
      }
    } else if (this.articleForm) {
      this.articleForm.reset();
      this.articleForm.patchValue({ presentation: 'unit', is_active: true });
      this.articleForm.get('sku')?.enable();
      this.skuCheckStatus = 'idle';
    }
  }

  /**
   * Check if field has error
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.articleForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  /**
   * Get field error message
   */
  getFieldError(fieldName: string): string {
    const field = this.articleForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) {
        return this.t('field_required');
      }
      if (field.errors['maxlength']) {
        return this.t('field_too_long');
      }
      if (field.errors['min']) {
        return this.t('field_min_value');
      }
      if (field.errors['minMaxQuantity']) {
        return this.t('min_max_quantity_invalid');
      }
      if (field.errors['skuInUse']) {
        return this.t('sku_already_exists');
      }
    }
    return '';
  }

  /**
   * Handle form submission
   */
  async onSubmit(): Promise<void> {
    if (this.articleForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    try {
      this.isLoading = true;
      const raw = this.articleForm.getRawValue();

      // Enforce dependency at submit time
      const trackByLot = !!raw.track_by_lot;
      const trackExpiration = trackByLot && !!raw.track_expiration;

      const payload = this.buildArticlePayload(raw, trackExpiration);

      if (this.isEditMode && this.initialData) {
        const updateData: UpdateArticleRequest = {
          ...payload,
          sku: this.initialData.sku,
        };
        await this.articleService.update(this.initialData.id, updateData);
        this.alertService.success(this.t('article_updated_successfully'));
      } else {
        await this.articleService.create(payload);
        this.alertService.success(this.t('article_created_successfully'));
      }

      this.success.emit();
    } catch (error: any) {
      console.error('Error saving article:', error);
      // Rule: duplicate SKU must always show a clear, explainable message (not the generic "Error al crear el artículo")
      const errorMessage = this.getArticleCreateErrorMessage(error);
      this.alertService.error(errorMessage);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Build request payload with types the backend expects (numbers, booleans, strings).
   * Prevents "Datos de solicitud inválidos" from Go's ShouldBindJSON when form values are strings.
   */
  private buildArticlePayload(raw: Record<string, unknown>, trackExpiration: boolean): CreateArticleRequest {
    const num = (v: unknown): number | undefined => {
      if (v === '' || v === null || v === undefined) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    const int = (v: unknown): number | undefined => {
      const n = num(v);
      return n === undefined ? undefined : Math.floor(n);
    };
    const str = (v: unknown): string => (v != null && String(v).trim() !== '' ? String(v).trim() : '');

    const unitPrice = num(raw['unit_price']);
    const minQ = int(raw['min_quantity']);
    const maxQ = int(raw['max_quantity']);
    const description = str(raw['description']);

    const payload: CreateArticleRequest = {
      sku: str(raw['sku']),
      name: str(raw['name']),
      presentation: str(raw['presentation']) || 'unit',
      track_by_lot: !!raw['track_by_lot'],
      track_by_serial: !!raw['track_by_serial'],
      track_expiration: trackExpiration,
    };
    if (description !== '') payload.description = description;
    if (unitPrice !== undefined && unitPrice !== null) payload.unit_price = unitPrice;
    if (minQ !== undefined && minQ !== null) payload.min_quantity = minQ;
    if (maxQ !== undefined && maxQ !== null) payload.max_quantity = maxQ;
    if (this.isEditMode || raw['is_active'] !== undefined) payload.is_active = !!raw['is_active'];
    return payload;
  }

  /**
   * Rule: feedback for create/update article must be explainable.
   * When the real error is duplicate SKU (code already in the table), always show the clear message.
   */
  private getArticleCreateErrorMessage(error: any): string {
    const status = Number(error?.status);
    const message = getApiErrorMessage(error) || (typeof error?.message === 'string' ? error.message : '');
    const isDuplicateSku = status === 409 || this.isSkuDuplicateMessage(message);

    if (isDuplicateSku) {
      return this.t('sku_already_exists');
    }
    if (message) {
      return message;
    }
    return this.isEditMode ? this.t('error_updating_article') : this.t('error_creating_article');
  }

  private isSkuDuplicateMessage(message: string): boolean {
    const lower = (message || '').toLowerCase();
    const skuKeywords = ['sku', 'código', 'codigo', 'ya existe', 'already exists', 'duplicate', 'duplicado', 'repetido', 'repeated', 'mismo'];
    return skuKeywords.some(k => lower.includes(k));
  }

  /**
   * Mark all form fields as touched
   */
  private markFormGroupTouched(): void {
    Object.keys(this.articleForm.controls).forEach(key => {
      const control = this.articleForm.get(key);
      control?.markAsTouched();
    });
  }

  onClose(): void {
    this.articleForm.reset();
    this.isEditMode = false;
    this.isLoading = false;
    this.closed.emit();
  }

  close(): void {
    this.onClose();
  }

  /**
   * Handle backdrop click
   */
  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }


  /**
   * Handle track expiration dependency
   */
  onTrackByLotChange(event: Event): void {
    const checked = (event.target as HTMLInputElement | null)?.checked ?? false;
    if (!checked) {
      this.articleForm.patchValue({ track_expiration: false });
    }
  }

  /** Toggle tracking/status by clicking the card (card acts as switch) */
  toggleTrackByLot(): void {
    const current = this.articleForm.get('track_by_lot')?.value ?? false;
    this.articleForm.patchValue({ track_by_lot: !current });
    if (current) {
      this.articleForm.patchValue({ track_expiration: false });
    }
  }

  toggleTrackBySerial(): void {
    const current = this.articleForm.get('track_by_serial')?.value ?? false;
    this.articleForm.patchValue({ track_by_serial: !current });
  }

  toggleTrackExpiration(): void {
    if (!this.articleForm.get('track_by_lot')?.value) return;
    const current = this.articleForm.get('track_expiration')?.value ?? false;
    this.articleForm.patchValue({ track_expiration: !current });
  }

  toggleIsActive(): void {
    const current = this.articleForm.get('is_active')?.value ?? false;
    this.articleForm.patchValue({ is_active: !current });
  }
}
