import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Location } from '../../../models/location.model';
import { LocationService } from '../../../services/location.service';
import { LanguageService } from '../../../services/extras/language.service';
import { AlertService } from '../../../services/extras/alert.service';
import { DialogComponent } from '../../shared/dialog/dialog.component';

@Component({
  selector: 'app-location-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DialogComponent],
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

  locationTypes = [
    { value: 'PALLET', label: 'pallet' },
    { value: 'SHELF', label: 'shelf' },
    { value: 'BIN', label: 'bin' },
    { value: 'FLOOR', label: 'floor' },
    { value: 'BLOCK', label: 'block' }
  ];

  constructor(
    private fb: FormBuilder,
    private locationService: LocationService,
    private languageService: LanguageService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialData'] && this.locationForm) {
      this.isEditing = !!this.initialData;
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
      is_active: [true]
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
        is_active: this.initialData.is_active ?? true
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
      const formData = this.locationForm.value;

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
        this.alertService.error(
          this.t('error'),
          response.result.message || (this.isEditing ? this.t('failed_to_update_location') : this.t('failed_to_create_location'))
        );
      }
    } catch (error: any) {
      console.error('Error saving location:', error);
      let errorMessage = this.isEditing ? this.t('failed_to_update_location') : this.t('failed_to_create_location');
      
      if (error?.message) {
        errorMessage = error.message;
      }
      
      this.alertService.error(this.t('error'), errorMessage);
    } finally {
      this.isSubmitting = false;
    }
  }

  onClose(): void {
    this.locationForm.reset();
    this.closed.emit();
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
}
