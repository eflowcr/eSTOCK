import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PresentationType } from '@app/models/presentation-type.model';
import { PresentationTypesService } from '@app/services/presentation-types.service';
import { LanguageService } from '@app/services/extras/language.service';
import { AlertService } from '@app/services/extras/alert.service';
import { handleApiError } from '@app/utils';
import { DrawerComponent } from '@app/shared/components/drawer';
import { ZardButtonComponent } from '@app/shared/components/button/button.component';
import {
  ZardFormControlComponent,
  ZardFormFieldComponent,
  ZardFormLabelComponent,
} from '@app/shared/components/form/form.component';
import { ZardInputDirective } from '@app/shared/components/input/input.directive';
import { ZardSwitchComponent } from '@app/shared/components/switch';

@Component({
  selector: 'app-presentation-type-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DrawerComponent,
    ZardButtonComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardInputDirective,
    ZardSwitchComponent,
  ],
  templateUrl: './presentation-type-form.component.html',
  styleUrls: ['./presentation-type-form.component.css'],
})
export class PresentationTypeFormComponent implements OnInit, OnChanges {
  @Input() initialData?: PresentationType | null;
  @Input() isOpen = false;
  @Output() success = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  form!: FormGroup;
  isEditing = false;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private presentationTypesService: PresentationTypesService,
    private languageService: LanguageService,
    private alertService: AlertService
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(20)]],
      name: ['', [Validators.required, Validators.maxLength(100)]],
      is_active: [true],
    });
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialData']) {
      this.isEditing = !!this.initialData;
      if (this.form) this.loadData();
    }
    if (changes['isOpen'] && this.isOpen && this.form) this.loadData();
    if (changes['isOpen'] && !changes['isOpen'].currentValue) this.form?.reset();
  }

  private loadData(): void {
    if (this.initialData && this.form) {
      this.form.patchValue({
        code: this.initialData.code ?? '',
        name: this.initialData.name ?? '',
        is_active: !!this.initialData.is_active,
      });
    }
  }

  close(): void {
    this.form?.reset();
    this.isEditing = false;
    this.closed.emit();
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.isSubmitting) return;
    try {
      this.isSubmitting = true;
      const payload: { code: string; name: string; sort_order?: number; is_active: boolean } = {
        code: this.form.value.code,
        name: this.form.value.name,
        is_active: !!this.form.value.is_active,
      };
      if (this.isEditing && this.initialData) {
        payload.sort_order = this.initialData.sort_order ?? 0;
      } else {
        payload.sort_order = 999;
      }
      if (this.isEditing && this.initialData) {
        const res = await this.presentationTypesService.update(this.initialData.id, payload);
        if (res?.result?.success) {
          this.alertService.success(this.t('success'), this.t('presentation_type_updated'));
          this.success.emit();
          this.close();
        } else {
          this.alertService.error(this.t('error'), res?.result?.message ?? this.t('failed_to_update_presentation_type'));
        }
      } else {
        const res = await this.presentationTypesService.create(payload);
        if (res?.result?.success) {
          this.alertService.success(this.t('success'), this.t('presentation_type_created'));
          this.success.emit();
          this.close();
        } else {
          this.alertService.error(this.t('error'), res?.result?.message ?? this.t('failed_to_create_presentation_type'));
        }
      }
    } catch (err: unknown) {
      this.alertService.error(this.t('error'), handleApiError(err, this.t('error_saving_presentation_type')));
    } finally {
      this.isSubmitting = false;
    }
  }
}
