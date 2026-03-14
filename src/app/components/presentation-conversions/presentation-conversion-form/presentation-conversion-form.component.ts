import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PresentationConversion } from '@app/models/presentation-conversion.model';
import { PresentationType } from '@app/models/presentation-type.model';
import { PresentationConversionsService } from '@app/services/presentation-conversions.service';
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
  selector: 'app-presentation-conversion-form',
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
  templateUrl: './presentation-conversion-form.component.html',
  styleUrls: ['./presentation-conversion-form.component.css'],
})
export class PresentationConversionFormComponent implements OnInit, OnChanges {
  @Input() initialData?: PresentationConversion | null;
  @Input() presentationTypes: PresentationType[] = [];
  @Input() isOpen = false;
  /** When opening create from "no rule" feedback, pre-fill from/to. */
  @Input() preselectedFromId = '';
  @Input() preselectedToId = '';
  @Output() success = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  form!: FormGroup;
  isEditing = false;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private conversionsService: PresentationConversionsService,
    private languageService: LanguageService,
    private alertService: AlertService
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  getTypeName(id: string): string {
    return this.presentationTypes.find((pt) => pt.id === id)?.name ?? this.presentationTypes.find((pt) => pt.id === id)?.code ?? id;
  }

  fromTypeError(): string {
    const c = this.form?.get('from_presentation_type_id');
    return c && c.invalid && (c.dirty || c.touched) ? this.t('field_required') : '';
  }

  toTypeError(): string {
    const c = this.form?.get('to_presentation_type_id');
    return c && c.invalid && (c.dirty || c.touched) ? this.t('field_required') : '';
  }

  factorError(): string {
    const c = this.form?.get('conversion_factor');
    return c && c.invalid && (c.dirty || c.touched) ? this.t('conversion_factor_required') : '';
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      from_presentation_type_id: ['', Validators.required],
      to_presentation_type_id: ['', Validators.required],
      conversion_factor: [1, [Validators.required, Validators.min(0.000001)]],
      is_active: [true],
    });
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialData']) {
      this.isEditing = !!this.initialData;
      if (this.form) this.loadData();
    }
    if (changes['preselectedFromId'] || changes['preselectedToId']) {
      if (this.form && !this.initialData) this.loadData();
    }
    if (changes['isOpen'] && this.isOpen && this.form) this.loadData();
    if (changes['isOpen'] && !this.isOpen) this.form?.reset();
  }

  private loadData(): void {
    if (this.initialData && this.form) {
      this.form.patchValue({
        from_presentation_type_id: this.initialData.from_presentation_type_id,
        to_presentation_type_id: this.initialData.to_presentation_type_id,
        conversion_factor: this.initialData.conversion_factor,
        is_active: !!this.initialData.is_active,
      });
      if (this.isEditing) {
        this.form.get('from_presentation_type_id')?.disable();
        this.form.get('to_presentation_type_id')?.disable();
      }
    } else if (this.form) {
      this.form.get('from_presentation_type_id')?.enable();
      this.form.get('to_presentation_type_id')?.enable();
      if (this.preselectedFromId || this.preselectedToId) {
        this.form.patchValue({
          from_presentation_type_id: this.preselectedFromId || this.form.get('from_presentation_type_id')?.value,
          to_presentation_type_id: this.preselectedToId || this.form.get('to_presentation_type_id')?.value,
        });
      }
    }
  }

  close(): void {
    this.form?.reset();
    this.form?.get('from_presentation_type_id')?.enable();
    this.form?.get('to_presentation_type_id')?.enable();
    this.isEditing = false;
    this.closed.emit();
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.isSubmitting) return;
    const fromId = this.form.get('from_presentation_type_id')?.value;
    const toId = this.form.get('to_presentation_type_id')?.value;
    if (fromId === toId) {
      this.alertService.error(this.t('error'), this.t('conversion_from_to_must_differ'));
      return;
    }
    try {
      this.isSubmitting = true;
      const factor = Number(this.form.value.conversion_factor);
      const isActive = !!this.form.value.is_active;
      if (this.isEditing && this.initialData) {
        const res = await this.conversionsService.update(this.initialData.id, {
          conversion_factor: factor,
          is_active: isActive,
        });
        if (res?.result?.success) {
          this.alertService.success(this.t('success'), this.t('presentation_conversion_updated'));
          this.success.emit();
          this.close();
        } else {
          this.alertService.error(this.t('error'), res?.result?.message ?? this.t('failed_to_update_presentation_conversion'));
        }
      } else {
        const res = await this.conversionsService.create({
          from_presentation_type_id: fromId,
          to_presentation_type_id: toId,
          conversion_factor: factor,
          is_active: isActive,
        });
        if (res?.result?.success) {
          this.alertService.success(this.t('success'), this.t('presentation_conversion_created'));
          this.success.emit();
          this.close();
        } else {
          this.alertService.error(this.t('error'), res?.result?.message ?? this.t('failed_to_create_presentation_conversion'));
        }
      }
    } catch (err: unknown) {
      this.alertService.error(this.t('error'), handleApiError(err, this.t('error_saving_presentation_conversion')));
    } finally {
      this.isSubmitting = false;
    }
  }
}
