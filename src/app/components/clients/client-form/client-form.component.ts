import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Client } from '@app/models/client.model';
import { ClientsService } from '@app/services/clients.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { getApiErrorMessage } from '@app/utils';
import { DrawerComponent } from '@app/shared/components/drawer';
import { ZardButtonComponent } from '@app/shared/components/button/button.component';
import { ZardFormFieldComponent, ZardFormLabelComponent, ZardFormControlComponent } from '@app/shared/components/form/form.component';
import { ZardInputDirective } from '@app/shared/components/input/input.directive';
import { ZardSelectImports } from '@app/shared/components/select/select.imports';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DrawerComponent, ZardButtonComponent, ZardFormFieldComponent, ZardFormLabelComponent, ZardFormControlComponent, ZardInputDirective, ZardSelectImports],
  templateUrl: './client-form.component.html',
})
export class ClientFormComponent implements OnInit, OnChanges {
  @Input() initialData?: Client | null;
  @Input() isOpen = false;
  @Output() success = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  form!: FormGroup;
  isLoading = false;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private clientsService: ClientsService,
    private alertService: AlertService,
    private languageService: LanguageService,
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  ngOnInit(): void {
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialData']) {
      this.isEditMode = !!this.initialData;
      if (this.form) this.populateForm();
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.form?.reset();
      this.isEditMode = false;
    }
    if (changes['isOpen'] && this.isOpen && this.form) {
      this.populateForm();
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      type: ['supplier', Validators.required],
      code: ['', [Validators.required, Validators.maxLength(50)]],
      name: ['', [Validators.required, Validators.maxLength(255)]],
      email: ['', [Validators.email, Validators.maxLength(255)]],
      phone: ['', Validators.maxLength(50)],
      address: ['', Validators.maxLength(500)],
      tax_id: ['', Validators.maxLength(50)],
      notes: ['', Validators.maxLength(1000)],
      is_active: [true],
    });
    this.populateForm();
  }

  private populateForm(): void {
    if (!this.form) return;
    if (this.initialData) {
      this.form.patchValue({
        type: this.initialData.type,
        code: this.initialData.code,
        name: this.initialData.name,
        email: this.initialData.email ?? '',
        phone: this.initialData.phone ?? '',
        address: this.initialData.address ?? '',
        tax_id: this.initialData.tax_id ?? '',
        notes: this.initialData.notes ?? '',
        is_active: this.initialData.is_active,
      });
      if (this.isEditMode) this.form.get('code')?.disable();
    } else {
      this.form.reset({ type: 'supplier', is_active: true });
      this.form.get('code')?.enable();
    }
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
    if (f.errors['email']) return this.t('clients.email_invalid');
    return '';
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach((k) => this.form.get(k)?.markAsTouched());
      return;
    }
    this.isLoading = true;
    try {
      const raw = this.form.getRawValue();
      const payload = {
        type: raw.type,
        code: raw.code,
        name: raw.name,
        email: raw.email || undefined,
        phone: raw.phone || undefined,
        address: raw.address || undefined,
        tax_id: raw.tax_id || undefined,
        notes: raw.notes || undefined,
        is_active: !!raw.is_active,
      };

      if (this.isEditMode && this.initialData) {
        await this.clientsService.update(this.initialData.id, payload);
        this.alertService.success(this.t('clients.updated_success'));
      } else {
        await this.clientsService.create(payload);
        this.alertService.success(this.t('clients.created_success'));
      }
      this.success.emit();
    } catch (error: any) {
      const msg = getApiErrorMessage(error) || (this.isEditMode ? this.t('clients.error_updating') : this.t('clients.error_creating'));
      this.alertService.error(msg);
    } finally {
      this.isLoading = false;
    }
  }

  onClose(): void {
    this.form.reset();
    this.isEditMode = false;
    this.closed.emit();
  }
}
