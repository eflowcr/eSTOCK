import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Location } from '../../../models/location.model';
import { LocationService } from '../../../services/location.service';
import { LocationTypesService } from '../../../services/location-types.service';
import { LanguageService } from '../../../services/extras/language.service';
import { AlertService } from '../../../services/extras/alert.service';
import { getDisplayableApiError, humanizeApiError } from '@app/utils';
import { ZardSelectComponent } from '../../../shared/components/select/select.component';
import { ZardSelectItemComponent } from '../../../shared/components/select/select-item.component';
import { DrawerComponent } from '../../../shared/components/drawer';
import { ZardButtonComponent } from '../../../shared/components/button/button.component';
import { ZardFormImports } from '../../../shared/components/form/form.imports';
import { ZardInputDirective } from '../../../shared/components/input/input.directive';

@Component({
  selector: 'app-location-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DrawerComponent,
    ZardButtonComponent,
    ZardFormImports,
    ZardInputDirective,
    ZardSelectComponent,
    ZardSelectItemComponent
  ],
  templateUrl: './location-form.component.html',
  styleUrls: ['./location-form.component.css']
})
export class LocationFormComponent implements OnInit, OnChanges {
  @Input() initialData?: Location | null;
  @Input() isOpen = false;
  @Output() success = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  locationForm!: FormGroup;
  isEditing = false;
  isSubmitting = false;

  /** Location type options from API (value = code, label = name); fallback to defaults if API fails. */
  locationTypes: { value: string; label: string }[] = [
    { value: 'PALLET', label: 'Pallet' },
    { value: 'SHELF', label: 'Shelf' },
    { value: 'BIN', label: 'Bin' },
    { value: 'FLOOR', label: 'Floor' },
    { value: 'BLOCK', label: 'Block' }
  ];

  constructor(
    private fb: FormBuilder,
    private locationService: LocationService,
    private locationTypesService: LocationTypesService,
    private languageService: LanguageService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadLocationTypes();
  }

  private async loadLocationTypes(): Promise<void> {
    try {
      const res = await this.locationTypesService.getList();
      if (res?.result?.success && Array.isArray(res.data) && res.data.length > 0) {
        this.locationTypes = res.data.map((lt) => ({ value: lt.code, label: lt.name }));
      }
    } catch {
      // Keep default locationTypes
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialData']) {
      this.isEditing = !!this.initialData;
      if (this.locationForm) {
        this.loadLocationData();
      }
    }
    if (changes['isOpen'] && this.isOpen && this.locationForm) {
      this.loadLocationData();
    }
    if (changes['isOpen'] && !changes['isOpen'].currentValue) {
      // Reset form when dialog closes
      this.locationForm?.reset();
    }
  }

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  private initializeForm(): void {
    this.locationForm = this.fb.group({
      location_code: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(255)]],
      zone: ['', [Validators.maxLength(100)]],
      type: ['SHELF', [Validators.required]],
      is_active: [true],
      is_way_out: [false],
    });

    this.loadLocationData();
  }

  private loadLocationData(): void {
    if (this.initialData && this.locationForm) {
      this.locationForm.patchValue({
        location_code: this.initialData.location_code || '',
        description: this.initialData.description || '',
        zone: this.initialData.zone || '',
        type: this.initialData.type || 'SHELF',
        is_active: !!this.initialData.is_active,
        is_way_out: !!this.initialData.is_way_out,
      });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.locationForm.invalid || this.isSubmitting) {
      this.markFormGroupTouched();
      return;
    }

    try {
      this.isSubmitting = true;
      const formData = {
        ...this.locationForm.value,
        is_active: !!this.locationForm.value.is_active,
        is_way_out: !!this.locationForm.value.is_way_out,
      };

      let response;
      if (this.isEditing && this.initialData) {
        response = await this.locationService.update(this.initialData.id.toString(), formData);
      } else {
        response = await this.locationService.create(formData);
      }

      if (response.result.success) {
        this.alertService.success(
          this.t('success'),
          this.isEditing ? this.t('location_updated_successfully') : this.t('location_created_successfully')
        );
        this.success.emit();
        this.onClose();
      } else {
        const msg = response.result.message || '';
        const fallbackKey = this.isEditing ? 'failed_to_update_location' : 'failed_to_create_location';
        this.alertService.error(this.t('error'), humanizeApiError(msg, this.t, fallbackKey));
      }
    } catch (error: any) {
      console.error('Error saving location:', error);
      const fallbackKey = this.isEditing ? 'failed_to_update_location' : 'failed_to_create_location';
      this.alertService.error(this.t('error'), getDisplayableApiError(error, this.t, fallbackKey));
    } finally {
      this.isSubmitting = false;
    }
  }

  onClose(): void {
    this.locationForm.reset();
    this.isEditing = false;
    this.isSubmitting = false;
    this.closed.emit();
  }

  close(): void {
    this.onClose();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.locationForm.controls).forEach(key => {
      const control = this.locationForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string | null {
    const field = this.locationForm.get(fieldName);
    if (field && field.invalid && (field.dirty || field.touched)) {
      const errors = field.errors;
      if (errors) {
        if (errors['required']) {
          return this.t('field_required');
        }
        if (errors['maxlength']) {
          return this.t('field_too_long');
        }
      }
    }
    return null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.locationForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  toggleIsActive(): void {
    const current = !!this.locationForm.get('is_active')?.value;
    this.locationForm.patchValue({ is_active: !current });
  }

  toggleIsWayOut(): void {
    const current = !!this.locationForm.get('is_way_out')?.value;
    this.locationForm.patchValue({ is_way_out: !current });
  }
}
