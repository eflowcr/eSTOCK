import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Article, CreateArticleRequest, UpdateArticleRequest } from '../../../models/article.model';
import { ArticleService } from '../../../services/article.service';
import { AlertService } from '../../../services/extras/alert.service';
import { LanguageService } from '../../../services/extras/language.service';

@Component({
  selector: 'app-article-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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
    }
  }

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  private initializeForm(): void {
    this.articleForm = this.fb.group({
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
    });

    this.loadArticleData();

    // Enforce dependency: expiration tracking requires lot tracking
    this.articleForm.get('track_by_lot')?.valueChanges.subscribe((enabled: boolean) => {
      if (!enabled) {
        this.articleForm.patchValue({ track_expiration: false });
      }
    });
  }

  private loadArticleData(): void {
    if (this.initialData && this.articleForm) {
      this.articleForm.patchValue({
        sku: this.initialData.sku,
        name: this.initialData.name,
        description: this.initialData.description || '',
        unit_price: this.initialData.unit_price,
        presentation: this.initialData.presentation,
        track_by_lot: this.initialData.track_by_lot,
        track_by_serial: this.initialData.track_by_serial,
        track_expiration: this.initialData.track_expiration,
        min_quantity: this.initialData.min_quantity,
        max_quantity: this.initialData.max_quantity,
        is_active: this.initialData.is_active !== false
      });

      // Coerce invalid combination: expiration without lot
      if (!this.articleForm.get('track_by_lot')?.value && this.articleForm.get('track_expiration')?.value) {
        this.articleForm.patchValue({ track_expiration: false });
      }

      // Disable SKU field in edit mode
      if (this.isEditMode) {
        this.articleForm.get('sku')?.disable();
      } else {
        this.articleForm.get('sku')?.enable();
      }
    } else if (this.articleForm) {
      this.articleForm.reset();
      this.articleForm.patchValue({ presentation: 'unit', is_active: true });
      this.articleForm.get('sku')?.enable();
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
      const formData = this.articleForm.value;

      // Clean up empty values, but always keep 'is_active' field
      Object.keys(formData).forEach(key => {
        if ((key !== 'is_active') && (formData[key] === '' || formData[key] === null)) {
          delete formData[key];
        }
      });
      // Ensure 'is_active' is always boolean
      formData['is_active'] = !!formData['is_active'];

      // Enforce dependency at submit time
      if (!formData['track_by_lot']) {
        formData['track_expiration'] = false;
      }

      if (this.isEditMode && this.initialData) {
        // Update existing article
        const updateData: UpdateArticleRequest = {
          ...formData,
          sku: this.initialData.sku // Always include original SKU for update
        };
        await this.articleService.update(this.initialData.id, updateData);
        this.alertService.success(this.t('article_updated_successfully'));
      } else {
        // Create new article
        const createData: CreateArticleRequest = formData;
        await this.articleService.create(createData);
        this.alertService.success(this.t('article_created_successfully'));
      }

      this.success.emit();
    } catch (error: any) {
      console.error('Error saving article:', error);
      let errorMessage = this.isEditMode 
        ? this.t('error_updating_article') 
        : this.t('error_creating_article');

      // Handle specific errors
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        errorMessage = this.t('sku_already_exists');
      }

      this.alertService.error(errorMessage);
    } finally {
      this.isLoading = false;
    }
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
}
