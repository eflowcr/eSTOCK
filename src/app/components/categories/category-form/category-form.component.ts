import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Category } from '@app/models/category.model';
import { CategoriesService } from '@app/services/categories.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { getApiErrorMessage } from '@app/utils';
import { DrawerComponent } from '@app/shared/components/drawer';
import { ZardButtonComponent } from '@app/shared/components/button/button.component';
import { ZardFormFieldComponent, ZardFormLabelComponent, ZardFormControlComponent } from '@app/shared/components/form/form.component';
import { ZardInputDirective } from '@app/shared/components/input/input.directive';
import { ZardSelectImports } from '@app/shared/components/select/select.imports';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DrawerComponent, ZardButtonComponent, ZardFormFieldComponent, ZardFormLabelComponent, ZardFormControlComponent, ZardInputDirective, ZardSelectImports],
  templateUrl: './category-form.component.html',
})
export class CategoryFormComponent implements OnInit, OnChanges {
  @Input() initialData?: Category | null;
  @Input() parentId?: string | null;
  @Input() allCategories: Category[] = [];
  @Input() isOpen = false;
  @Output() success = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  form!: FormGroup;
  isLoading = false;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private categoriesService: CategoriesService,
    private alertService: AlertService,
    private languageService: LanguageService,
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  get rootCategories(): Category[] {
    return this.allCategories.filter((c) => !c.parent_id && c.is_active);
  }

  ngOnInit(): void {
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialData'] || changes['parentId']) {
      this.isEditMode = !!this.initialData;
      if (this.form) this.populateForm();
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.form?.reset({ is_active: true });
      this.isEditMode = false;
    }
    if (changes['isOpen'] && this.isOpen && this.form) {
      this.populateForm();
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      parent_id: [null],
      is_active: [true],
    });
    this.populateForm();
  }

  private populateForm(): void {
    if (!this.form) return;
    if (this.initialData) {
      this.form.patchValue({
        name: this.initialData.name,
        parent_id: this.initialData.parent_id ?? null,
        is_active: this.initialData.is_active,
      });
    } else {
      this.form.reset({
        name: '',
        parent_id: this.parentId ?? null,
        is_active: true,
      });
    }
  }

  /** Validate: cannot set parent if this category already has children (would create 3-level hierarchy). */
  private hasChildren(): boolean {
    if (!this.initialData) return false;
    return this.allCategories.some((c) => c.parent_id === this.initialData!.id);
  }

  isFieldInvalid(name: string): boolean {
    const f = this.form.get(name);
    return !!(f && f.invalid && (f.dirty || f.touched));
  }

  getFieldError(name: string): string {
    const f = this.form.get(name);
    if (!f?.errors) return '';
    if (f.errors['required']) return this.t('field_required');
    if (f.errors['maxlength']) return this.t('field_too_long');
    return '';
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach((k) => this.form.get(k)?.markAsTouched());
      return;
    }
    const raw = this.form.getRawValue();

    // Enforce 2-level hierarchy
    if (raw.parent_id && this.hasChildren()) {
      this.alertService.error(this.t('categories.error_three_levels'));
      return;
    }

    this.isLoading = true;
    try {
      const payload = {
        name: raw.name,
        parent_id: raw.parent_id || null,
        is_active: !!raw.is_active,
      };

      if (this.isEditMode && this.initialData) {
        await this.categoriesService.update(this.initialData.id, payload);
        this.alertService.success(this.t('categories.updated_success'));
      } else {
        await this.categoriesService.create(payload);
        this.alertService.success(this.t('categories.created_success'));
      }
      this.success.emit();
    } catch (error: any) {
      const msg = getApiErrorMessage(error) || (this.isEditMode ? this.t('categories.error_updating') : this.t('categories.error_creating'));
      this.alertService.error(msg);
    } finally {
      this.isLoading = false;
    }
  }

  onClose(): void {
    this.form.reset({ is_active: true });
    this.isEditMode = false;
    this.closed.emit();
  }
}
