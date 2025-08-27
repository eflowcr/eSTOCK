import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { AdjustmentFormData } from '../../../models/adjustment.model';
import { Inventory } from '../../../models/inventory.model';
import { Location } from '../../../models/location.model';
import { AdjustmentService } from '../../../services/adjustment.service';
import { InventoryService } from '../../../services/inventory.service';
import { LocationService } from '../../../services/location.service';
import { AlertService } from '../../../services/extras/alert.service';
import { LanguageService } from '../../../services/extras/language.service';



@Component({
  selector: 'app-adjustment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './adjustment-form.component.html',
  styleUrl: './adjustment-form.component.css'
})
export class AdjustmentFormComponent implements OnInit {
  @Input() isOpen = false;
  @Output() success = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  adjustmentForm!: FormGroup;
  isLoading = false;

  // Data for dropdowns
  inventoryItems: Inventory[] = [];
  locations: Location[] = [];
  
  // Filtered lists and search state for comboboxes
  filteredInventoryItems: Inventory[] = [];
  filteredLocations: Location[] = [];
  skuSearchTerm = '';
  locationSearchTerm = '';
  showSkuDropdown = false;
  showLocationDropdown = false;
  
  // Selected data
  selectedInventoryItem: Inventory | null = null;
  selectedLocation: Location | null = null;

  // Tracking controls
  lotSearchTerm = '';
  serialSearchTerm = '';
  selectedLots: string[] = [];
  selectedSerials: string[] = [];

  constructor(
    private fb: FormBuilder,
    private adjustmentService: AdjustmentService,
    private inventoryService: InventoryService,
    private locationService: LocationService,
    private alertService: AlertService,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadData();
  }

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  private initializeForm(): void {
    this.adjustmentForm = this.fb.group({
      sku: ['', Validators.required],
      location: ['', Validators.required],
      adjustmentQuantity: ['', [Validators.required]],
      reason: ['', Validators.required],
      notes: ['']
    });
  }

  private async loadData(): Promise<void> {
    try {
      const [inventoryResponse, locationsResponse] = await Promise.all([
        this.inventoryService.getAll(),
        this.locationService.getAll()
      ]);
      
      this.inventoryItems = inventoryResponse.data || [];
      this.locations = locationsResponse.data || [];
      
      this.filteredInventoryItems = [...this.inventoryItems];
      this.filteredLocations = [...this.locations];
    } catch (error) {
      this.alertService.error(this.t('error_loading_data'));
    }
  }

  get adjustmentQuantity(): number {
    return Number(this.adjustmentForm.get('adjustmentQuantity')?.value) || 0;
  }

  /**
   * Filter inventory items by search term
   */
  filterInventoryItems(): void {
    const term = (this.skuSearchTerm || '').toLowerCase();
    if (!term) {
      this.filteredInventoryItems = [...this.inventoryItems];
      return;
    }
    this.filteredInventoryItems = this.inventoryItems.filter(item =>
      (item.sku || '').toLowerCase().includes(term) || 
      (item.name || '').toLowerCase().includes(term) ||
      (item.location || '').toLowerCase().includes(term)
    );
  }

  /**
   * Filter locations by search term
   */
  filterLocations(): void {
    const term = (this.locationSearchTerm || '').toLowerCase();
    if (!term) {
      this.filteredLocations = [...this.locations];
      return;
    }
    this.filteredLocations = this.locations.filter(location =>
      (location.location_code || '').toLowerCase().includes(term) || 
      (location.description || '').toLowerCase().includes(term)
    );
  }

  /**
   * Handle inventory item selection
   */
  onInventoryItemSelected(inventoryItem: Inventory): void {
    this.selectedInventoryItem = inventoryItem;
    
    this.adjustmentForm.patchValue({
      sku: inventoryItem.sku,
      location: inventoryItem.location
    });

    // Update search terms
    this.skuSearchTerm = `${inventoryItem.sku} - ${inventoryItem.name} (${inventoryItem.location})`;
    this.locationSearchTerm = `${inventoryItem.location}`;
    
    // Update selected location
    const location = this.locations.find(l => l.location_code === inventoryItem.location);
    if (location) {
      this.selectedLocation = location;
      this.locationSearchTerm = `${location.location_code} - ${location.description}`;
    }
    
    // Reset tracking data when item changes
    this.selectedLots = [];
    this.selectedSerials = [];
    this.lotSearchTerm = '';
    this.serialSearchTerm = '';
    
    // Close dropdown
    this.showSkuDropdown = false;
  }

  /**
   * Handle location selection
   */
  onLocationSelected(location: Location): void {
    this.selectedLocation = location;
    this.adjustmentForm.patchValue({ location: location.location_code });
    this.locationSearchTerm = `${location.location_code} - ${location.description}`;
    this.showLocationDropdown = false;
  }

  /**
   * Confirm first filtered option with Enter key
   */
  confirmFirstInventoryItemIfAny(): void {
    if (this.filteredInventoryItems.length > 0) {
      this.onInventoryItemSelected(this.filteredInventoryItems[0]);
    }
  }

  confirmFirstLocationIfAny(): void {
    if (this.filteredLocations.length > 0) {
      this.onLocationSelected(this.filteredLocations[0]);
    }
  }

  /**
   * Close dropdowns with delay to allow clicks
   */
  closeSkuDropdownLater(): void {
    setTimeout(() => (this.showSkuDropdown = false), 150);
  }

  closeLocationDropdownLater(): void {
    setTimeout(() => (this.showLocationDropdown = false), 150);
  }

  // Advanced dropdown pattern methods for SKU
  isSkuValid(): boolean {
    const formValue = this.adjustmentForm.get('sku')?.value;
    const locationValue = this.adjustmentForm.get('location')?.value;
    return !!formValue && !!locationValue && this.inventoryItems.some(item => 
      item.sku === formValue && item.location === locationValue
    );
  }

  enableSkuEdit(): void {
    this.skuSearchTerm = '';
    this.showSkuDropdown = true;
    this.adjustmentForm.patchValue({ sku: '', location: '' });
    this.selectedInventoryItem = null;
    this.selectedLocation = null;
    this.locationSearchTerm = '';
  }

  clearSkuManually(): void {
    this.skuSearchTerm = '';
    this.locationSearchTerm = '';
    this.adjustmentForm.patchValue({ sku: '', location: '' });
    this.showSkuDropdown = false;
    this.selectedInventoryItem = null;
    this.selectedLocation = null;
  }

  hasValidSkuSelection(): boolean {
    return this.isSkuValid();
  }

  getSelectedSkuName(): string {
    const skuValue = this.adjustmentForm.get('sku')?.value;
    const locationValue = this.adjustmentForm.get('location')?.value;
    const inventoryItem = this.inventoryItems.find(item => 
      item.sku === skuValue && item.location === locationValue
    );
    return inventoryItem ? `${inventoryItem.sku} - ${inventoryItem.name} (${inventoryItem.location})` : '';
  }

  onSkuBlur(): void {
    setTimeout(() => {
      this.showSkuDropdown = false;
    }, 150);
  }

  // Advanced dropdown pattern methods for Location
  isLocationValid(): boolean {
    const formValue = this.adjustmentForm.get('location')?.value;
    return !!formValue && this.locations.some(l => l.location_code === formValue);
  }

  enableLocationEdit(): void {
    this.locationSearchTerm = '';
    this.showLocationDropdown = true;
    this.adjustmentForm.patchValue({ location: '' });
    this.selectedLocation = null;
  }

  clearLocationManually(): void {
    this.locationSearchTerm = '';
    this.adjustmentForm.patchValue({ location: '' });
    this.showLocationDropdown = false;
    this.selectedLocation = null;
  }

  hasValidLocationSelection(): boolean {
    return this.isLocationValid();
  }

  getSelectedLocationName(): string {
    const locationValue = this.adjustmentForm.get('location')?.value;
    const location = this.locations.find(l => l.location_code === locationValue);
    return location ? `${location.location_code} - ${location.description}` : '';
  }

  onLocationBlur(): void {
    setTimeout(() => {
      this.showLocationDropdown = false;
    }, 150);
  }

  // Lot and Serial tracking methods
  getExpectedQuantity(): number {
    const adjustmentQty = Number(this.adjustmentForm.get('adjustmentQuantity')?.value) || 0;
    return adjustmentQty > 0 ? adjustmentQty : 0;
  }

  getSelectedLots(): string[] {
    return this.selectedLots;
  }

  getSelectedSerials(): string[] {
    return this.selectedSerials;
  }

  getSelectedLotCount(): number {
    return this.selectedLots.length;
  }

  getSelectedSerialCount(): number {
    return this.selectedSerials.length;
  }

  isLotSelectionComplete(): boolean {
    const expectedQty = this.getExpectedQuantity();
    return expectedQty > 0 && this.selectedLots.length === expectedQty;
  }

  isSerialSelectionComplete(): boolean {
    const expectedQty = this.getExpectedQuantity();
    return expectedQty > 0 && this.selectedSerials.length === expectedQty;
  }

  handleLotEnter(): void {
    const searchTerm = (this.lotSearchTerm || '').trim();
    if (searchTerm) {
      this.addManualLot(searchTerm);
    }
  }

  handleSerialEnter(): void {
    const searchTerm = (this.serialSearchTerm || '').trim();
    if (searchTerm) {
      this.addManualSerial(searchTerm);
    }
  }

  addManualLot(lotNumber: string): void {
    if (!lotNumber.trim()) return;
    
    const expectedQty = this.getExpectedQuantity();
    if (!this.selectedLots.includes(lotNumber.trim()) && this.selectedLots.length < expectedQty) {
      this.selectedLots.push(lotNumber.trim());
      this.lotSearchTerm = '';
    } else if (this.selectedLots.length >= expectedQty) {
      this.alertService.warning(
        this.t('lot_selection_limit_reached') || 'Límite de lotes alcanzado',
        this.t('warning') || 'Advertencia'
      );
    }
  }

  addManualSerial(serialNumber: string): void {
    if (!serialNumber.trim()) return;
    
    const expectedQty = this.getExpectedQuantity();
    if (!this.selectedSerials.includes(serialNumber.trim()) && this.selectedSerials.length < expectedQty) {
      this.selectedSerials.push(serialNumber.trim());
      this.serialSearchTerm = '';
    } else if (this.selectedSerials.length >= expectedQty) {
      this.alertService.warning(
        this.t('serial_selection_limit_reached') || 'Límite de series alcanzado',
        this.t('warning') || 'Advertencia'
      );
    }
  }

  removeLot(lotNumber: string): void {
    const index = this.selectedLots.indexOf(lotNumber);
    if (index > -1) {
      this.selectedLots.splice(index, 1);
    }
  }

  removeSerial(serialNumber: string): void {
    const index = this.selectedSerials.indexOf(serialNumber);
    if (index > -1) {
      this.selectedSerials.splice(index, 1);
    }
  }

  shouldShowTrackingSection(): boolean {
    const adjustmentQty = Number(this.adjustmentForm.get('adjustmentQuantity')?.value) || 0;
    return !!(this.selectedInventoryItem && 
           (this.selectedInventoryItem.track_by_lot || this.selectedInventoryItem.track_by_serial) &&
           adjustmentQty > 0);
  }

  isTrackingValid(): boolean {
    // Tracking is always optional for adjustments
    // Users can choose to adjust inventory without specifying lots/serials
    return true;
  }


  /**
   * Check if field has error
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.adjustmentForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  /**
   * Get field error message
   */
  getFieldError(fieldName: string): string {
    const field = this.adjustmentForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) {
        return this.t('field_required');
      }
    }
    return '';
  }

  /**
   * Handle form submission
   */
  async onSubmit(): Promise<void> {
    if (this.adjustmentForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    try {
      this.isLoading = true;
      const formData = this.adjustmentForm.value;

      // Prepare adjustment data
      const adjustmentData: AdjustmentFormData = {
        sku: formData.sku,
        location: formData.location,
        adjustment_quantity: Number(formData.adjustmentQuantity), // Map to snake_case
        reason: formData.reason,
        notes: formData.notes || "",  // Send empty string instead of undefined
        lots: this.selectedLots.length > 0 ? this.selectedLots.map(lot => ({
          lotNumber: lot,
          quantity: 1, // For adjustments, each lot gets quantity 1
          expirationDate: null
        })) : undefined,
        serials: this.selectedSerials.length > 0 ? this.selectedSerials : undefined
      };


      await this.adjustmentService.create(adjustmentData);
      this.alertService.success(this.t('stock_adjustment_created_successfully'));
      
      this.resetForm();
      
      this.success.emit();
    } catch (error: any) {
      console.error('Error creating adjustment:', error);
      this.alertService.error(this.t('failed_to_create_stock_adjustment'));
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Reset form to initial state
   */
  private resetForm(): void {
    this.adjustmentForm.reset();
    this.skuSearchTerm = '';
    this.locationSearchTerm = '';
    this.selectedInventoryItem = null;
    this.selectedLocation = null;
    this.showSkuDropdown = false;
    this.showLocationDropdown = false;
    this.lotSearchTerm = '';
    this.serialSearchTerm = '';
    this.selectedLots = [];
    this.selectedSerials = [];
  }

  /**
   * Mark all form fields as touched
   */
  private markFormGroupTouched(): void {
    Object.keys(this.adjustmentForm.controls).forEach(key => {
      const control = this.adjustmentForm.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Get absolute value for template
   */
  abs(value: number): number {
    return Math.abs(value);
  }

  /**
   * Handle backdrop click to close modal
   */
  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  /**
   * Close modal
   */
  closeModal(): void {
    this.resetForm();
    this.close.emit();
  }

  /**
   * Handle cancel button
   */
  onCancel(): void {
    this.closeModal();
  }
}