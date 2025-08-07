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
  @Input() article: Article | null = null;
  @Output() success = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  articleForm: FormGroup;
  isLoading = false;
  isEditMode = false;


  constructor(
    private fb: FormBuilder,
    private articleService: ArticleService,
    private alertService: AlertService,
    private languageService: LanguageService
  ) {
    this.articleForm = this.createForm();
  }

  ngOnInit(): void {
    this.isEditMode = !!this.article;
    if (this.article) {
      this.populateForm(this.article);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['article']) {
      this.isEditMode = !!this.article;
      if (this.article) {
        this.populateForm(this.article);
      } else {
        this.articleForm.reset();
        this.articleForm.patchValue({
          presentation: 'unit',
          is_active: true
        });
      }
    }
  }

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  /**
   * Create reactive form
   */
  private createForm(): FormGroup {
    return this.fb.group({
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
      image_url: ['', Validators.maxLength(500)],
      is_active: [true]
    });
  }

  /**
   * Populate form with article data
   */
  private populateForm(article: Article): void {
    this.articleForm.patchValue({
      sku: article.sku,
      name: article.name,
      description: article.description || '',
      unit_price: article.unit_price,
      presentation: article.presentation,
      track_by_lot: article.track_by_lot,
      track_by_serial: article.track_by_serial,
      track_expiration: article.track_expiration,
      min_quantity: article.min_quantity,
      max_quantity: article.max_quantity,
      image_url: article.image_url || '',
      is_active: article.is_active !== false
    });

    // Disable SKU field in edit mode
    if (this.isEditMode) {
      this.articleForm.get('sku')?.disable();
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

      // Clean up empty values, but always keep 'image_url' and 'is_active' fields
      Object.keys(formData).forEach(key => {
        if ((key !== 'image_url' && key !== 'is_active') && (formData[key] === '' || formData[key] === null)) {
          delete formData[key];
        }
      });
      // Ensure 'image_url' is always a string
      if (typeof formData['image_url'] !== 'string') {
        formData['image_url'] = '';
      }
      // Ensure 'is_active' is always boolean
      formData['is_active'] = !!formData['is_active'];

      if (this.isEditMode && this.article) {
        // Update existing article
        const updateData: UpdateArticleRequest = {
          ...formData,
          sku: this.article.sku // Always include original SKU for update
        };
        await this.articleService.update(this.article.id, updateData);
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

  /**
   * Handle cancel
   */
  onCancel(): void {
    this.cancel.emit();
  }

  /**
   * Handle backdrop click
   */
  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }


  /**
   * Handle track expiration dependency
   */
  onTrackByLotChange(value: boolean): void {
    if (!value) {
      // If lot tracking is disabled, also disable expiration tracking
      this.articleForm.patchValue({ track_expiration: false });
    }
  }
}
