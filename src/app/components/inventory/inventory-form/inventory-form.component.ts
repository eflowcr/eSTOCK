import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EnhancedInventory } from '../../../models/inventory.model';
import { InventoryService } from '../../../services/inventory.service';
import { LocationService } from '../../../services/location.service';
import { LanguageService } from '../../../services/extras/language.service';
import { AlertService } from '../../../services/extras/alert.service';

@Component({
  selector: 'app-inventory-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './inventory-form.component.html',
  styleUrls: ['./inventory-form.component.css']
})
export class InventoryFormComponent implements OnInit, OnChanges {
  @Input() inventory?: EnhancedInventory | null;
  @Input() isOpen = false;
  @Output() success = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  inventoryForm!: FormGroup;
  isEditing = false;
  isSubmitting = false;
  locations: any[] = [];

  statusOptions = [
    { value: 'available', label: 'available' },
    { value: 'reserved', label: 'reserved' },
    { value: 'damaged', label: 'damaged' }
  ];

  presentationOptions = [
    { value: 'unit', label: 'unit' },
    { value: 'box', label: 'box' },
    { value: 'pallet', label: 'pallet' },
    { value: 'pack', label: 'pack' },
    { value: 'kg', label: 'kilogram' },
    { value: 'g', label: 'gram' },
    { value: 'lbs', label: 'pound' },
    { value: 'oz', label: 'ounce' }
  ];

  constructor(
    private fb: FormBuilder,
    private inventoryService: InventoryService,
    private locationService: LocationService,
    private languageService: LanguageService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadLocations();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['inventory']) {
      this.isEditing = !!this.inventory;
      if (this.inventoryForm) {
        this.loadInventoryData();
      }
    }
  }

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  /**
   * @description Initialize form
   */
  private initializeForm(): void {
    this.inventoryForm = this.fb.group({
      sku: ['', [Validators.required, Validators.maxLength(50)]],
      name: ['', [Validators.maxLength(255)]],
      description: ['', [Validators.maxLength(500)]],
      location: ['', [Validators.required, Validators.maxLength(50)]],
      quantity: [0, [Validators.required, Validators.min(0)]],
      status: ['available', [Validators.required]],
      presentation: ['unit', [Validators.required]],
      unit_price: [0, [Validators.min(0)]],
      track_by_lot: [false],
      track_by_serial: [false],
      track_expiration: [false],
      image_url: ['', [Validators.maxLength(500)]],
      min_quantity: [0, [Validators.min(0)]],
      max_quantity: [0, [Validators.min(0)]]
    });

    this.loadInventoryData();
  }

  /**
   * @description Load locations for dropdown
   */
  private async loadLocations(): Promise<void> {
    try {
      const response = await this.locationService.getAll();
      if (response.result.success) {
        this.locations = response.data;
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  }

  /**
   * @description Load inventory data into form
   */
  private loadInventoryData(): void {
    if (this.inventory && this.inventoryForm) {
      this.inventoryForm.patchValue({
        sku: this.inventory.sku || '',
        name: this.inventory.name || '',
        description: this.inventory.description || '',
        location: this.inventory.location || '',
        quantity: this.inventory.quantity || 0,
        status: this.inventory.status || 'available',
        presentation: this.inventory.presentation || 'unit',
        unit_price: this.inventory.unit_price || 0,
        track_by_lot: this.inventory.track_by_lot || false,
        track_by_serial: this.inventory.track_by_serial || false,
        track_expiration: this.inventory.track_expiration || false,
        image_url: this.inventory.image_url || '',
        min_quantity: this.inventory.min_quantity || 0,
        max_quantity: this.inventory.max_quantity || 0
      });
    }
  }

  /**
   * @description Check if field is invalid
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.inventoryForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  /**
   * @description Get field error message
   */
  getFieldError(fieldName: string): string {
    const field = this.inventoryForm.get(fieldName);
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
   * @description Handle form submission
   */
  async onSubmit(): Promise<void> {
    if (this.inventoryForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    try {
      this.isSubmitting = true;
      const formData = this.inventoryForm.value;

      let response;
      if (this.isEditing && this.inventory) {
        response = await this.inventoryService.update(this.inventory.id.toString(), formData);
      } else {
        response = await this.inventoryService.create(formData);
      }

      if (response.result.success) {
        this.success.emit();
        this.resetForm();
      } else {
        this.alertService.error(response.result.message || this.t('operation_failed'));
      }
    } catch (error) {
      console.error('Error saving inventory:', error);
      this.alertService.error(this.t('operation_failed'));
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * @description Mark all form fields as touched
   */
  private markFormGroupTouched(): void {
    Object.keys(this.inventoryForm.controls).forEach(key => {
      const control = this.inventoryForm.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * @description Reset form
   */
  private resetForm(): void {
    this.inventoryForm.reset();
    this.isEditing = false;
    this.inventory = null;
  }

  /**
   * @description Handle cancel
   */
  onCancel(): void {
    this.cancel.emit();
    this.resetForm();
  }

  /**
   * @description Close modal
   */
  close(): void {
    this.cancel.emit();
  }

  /**
   * @description Handle backdrop click
   */
  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
