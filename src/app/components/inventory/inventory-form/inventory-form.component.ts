import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Inventory } from '../../../models/inventory.model';
import { ArticleService } from '../../../services/article.service';
import { AlertService } from '../../../services/extras/alert.service';
import { LanguageService } from '../../../services/extras/language.service';
import { InventoryService } from '../../../services/inventory.service';
import { LocationService } from '../../../services/location.service';
import { LotService } from '../../../services/lot.service';
import { SerialService } from '../../../services/serial.service';

@Component({
  selector: 'app-inventory-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './inventory-form.component.html',
  styleUrls: ['./inventory-form.component.css']
})
export class InventoryFormComponent implements OnInit, OnChanges {
  @Input() inventory?: Inventory | null;
  @Output() success = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  inventoryForm!: FormGroup;
  isEditing = false;
  isSubmitting = false;
  
  // Data for dropdowns
  locations: any[] = [];
  articles: any[] = [];
  
  // Filtered lists and search state for comboboxes
  filteredArticles: any[] = [];
  filteredLocations: any[] = [];
  skuSearchTerm = '';
  locationSearchTerm = '';
  showSkuDropdown = false;
  showLocationDropdown = false;
  
  // Selected article data
  selectedArticle: any = null;
  
  // Existing lots and serials for editing
  existingLots: any[] = [];
  existingSerials: any[] = [];

  statusOptions = [
    { value: 'available', label: 'available' },
    { value: 'reserved', label: 'reserved' },
    { value: 'damaged', label: 'damaged' }
  ];

  constructor(
    private fb: FormBuilder,
    private inventoryService: InventoryService,
    private locationService: LocationService,
    private articleService: ArticleService,
    private lotService: LotService,
    private serialService: SerialService,
    private languageService: LanguageService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadInitialData();
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

  get lotsArray() {
    return this.inventoryForm.get('lots') as FormArray;
  }

  get serialNumbersArray() {
    return this.inventoryForm.get('serialNumbers') as FormArray;
  }

  /**
   * @description Calculate total quantity summed from lots
   */
  private calculateTotalLotQuantity(): number {
    return this.lotsArray.controls.reduce((sum, control) => {
      return sum + (control.get('quantity')?.value || 0);
    }, 0);
  }

  get totalLotsQuantity(): number {
    return this.calculateTotalLotQuantity();
  }

  /**
   * @description Remaining quantity that can still be assigned to lots
   */
  private getRemainingLotQuantity(excludeIndex: number | null = null): number {
    const totalQuantity = this.inventoryForm.get('quantity')?.value || 0;
    const assignedQuantity = this.lotsArray.controls.reduce((sum, control, idx) => {
      if (excludeIndex !== null && idx === excludeIndex) {
        return sum;
      }
      return sum + (control.get('quantity')?.value || 0);
    }, 0);
    return Math.max(0, totalQuantity - assignedQuantity);
  }

  /**
   * @description Initialize form
   */
  private initializeForm(): void {
    this.inventoryForm = this.fb.group({
      sku: ['', [Validators.required]],
      name: ['', [Validators.required]],
      description: [''],
      location: ['', [Validators.required]],
      quantity: [0, [Validators.required, Validators.min(0)]],
      status: ['available', [Validators.required]],
      presentation: ['', [Validators.required]],
      unitPrice: ['', [Validators.required]],
      trackByLot: [false],
      trackBySerial: [false],
      trackExpiration: [false],
      lots: this.fb.array([]),
      serialNumbers: this.fb.array([])
    });

    this.loadInventoryData();
  }

  /**
   * @description Load initial data for dropdowns
   */
  private async loadInitialData(): Promise<void> {
    try {
      await Promise.all([
        this.loadLocations(),
        this.loadArticles()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  }

  /**
   * @description Load locations for dropdown
   */
  private async loadLocations(): Promise<void> {
    try {
      const response = await this.locationService.getAll();
      if (response.result.success && response.data) {
        this.locations = response.data;
        this.filteredLocations = [...this.locations];
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  }

  /**
   * @description Load articles for SKU dropdown
   */
  private async loadArticles(): Promise<void> {
    try {
      const response = await this.articleService.getAll();
      if (response.result.success && response.data) {
        this.articles = response.data;
        this.filteredArticles = [...this.articles];
      }
    } catch (error) {
      console.error('Error loading articles:', error);
    }
  }

  /**
   * @description Load existing lots and serials for editing
   */
  private async loadExistingTrackingData(sku: string): Promise<void> {
    if (!this.isEditing) return;
    
    try {
      const [lotsResponse, serialsResponse] = await Promise.all([
        this.lotService.getBySku(sku),
        this.serialService.getBySku(sku)
      ]);

      if (lotsResponse.result.success && lotsResponse.data) {
        this.existingLots = lotsResponse.data;
      }

      if (serialsResponse.result.success && serialsResponse.data) {
        this.existingSerials = serialsResponse.data;
      }
    } catch (error) {
      console.error('Error loading existing tracking data:', error);
    }
  }

  /**
   * @description Handle SKU selection and auto-fill fields
   */
  onSkuSelected(article: any): void {
    this.selectedArticle = article;
    
    // Auto-fill form fields
    this.inventoryForm.patchValue({
      sku: article.sku,
      name: article.name,
      description: article.description || '',
      presentation: article.presentation || 'unit',
      unitPrice: article.unit_price?.toString() || '0',
      trackByLot: article.track_by_lot || false,
      trackBySerial: article.track_by_serial || false,
      trackExpiration: article.track_expiration || false
    });

    // Update combobox display and close dropdown
    this.skuSearchTerm = `${article.sku} - ${article.name}`;
    this.showSkuDropdown = false;

    // Clear existing lots and serials
    this.lotsArray.clear();
    this.serialNumbersArray.clear();

    // Load existing tracking data if editing
    if (this.isEditing) {
      this.loadExistingTrackingData(article.sku);
    }
  }

  /**
   * @description Handle SKU dropdown change
   */
  onSkuChange(): void {
    const selectedSku = this.inventoryForm.get('sku')?.value;
    if (selectedSku) {
      const article = this.articles.find(a => a.sku === selectedSku);
      if (article) {
        this.onSkuSelected(article);
      }
    }
  }

  /**
   * @description Filtrar artículos por término de búsqueda
   */
  filterArticles(): void {
    const term = (this.skuSearchTerm || '').toLowerCase();
    if (!term) {
      this.filteredArticles = [...this.articles];
      return;
    }
    this.filteredArticles = this.articles.filter(a =>
      (a.sku || '').toLowerCase().includes(term) || (a.name || '').toLowerCase().includes(term)
    );
  }

  /**
   * @description Filtrar ubicaciones por término de búsqueda
   */
  filterLocations(): void {
    const term = (this.locationSearchTerm || '').toLowerCase();
    if (!term) {
      this.filteredLocations = [...this.locations];
      return;
    }
    this.filteredLocations = this.locations.filter(l =>
      (l.location_code || '').toLowerCase().includes(term) || (l.description || '').toLowerCase().includes(term)
    );
  }

  /**
   * @description Seleccionar ubicación desde el buscador
   */
  onLocationSelected(location: any): void {
    this.inventoryForm.patchValue({ location: location.location_code });
    this.locationSearchTerm = `${location.location_code} - ${location.description}`;
    this.showLocationDropdown = false;
  }

  /**
   * @description Confirmar selección con Enter: toma la primera opción filtrada
   */
  confirmFirstArticleIfAny(): void {
    if (this.filteredArticles.length > 0) {
      this.onSkuSelected(this.filteredArticles[0]);
    }
  }

  confirmFirstLocationIfAny(): void {
    if (this.filteredLocations.length > 0) {
      this.onLocationSelected(this.filteredLocations[0]);
    }
  }

  /**
   * @description Cerrar dropdowns con pequeño retardo para permitir clic en opción
   */
  closeSkuDropdownLater(): void {
    setTimeout(() => (this.showSkuDropdown = false), 150);
  }

  closeLocationDropdownLater(): void {
    setTimeout(() => (this.showLocationDropdown = false), 150);
  }

  /**
   * @description Validate quantity vs tracking items
   */
  validateTrackingQuantity(): boolean {
    const quantity = this.inventoryForm.get('quantity')?.value || 0;
    const trackByLot = this.inventoryForm.get('trackByLot')?.value;
    const trackBySerial = this.inventoryForm.get('trackBySerial')?.value;

    if (trackByLot && this.lotsArray.length > 0) {
      const totalLotQuantity = this.lotsArray.controls.reduce((sum, control) => {
        return sum + (control.get('quantity')?.value || 0);
      }, 0);
      
      if (totalLotQuantity !== quantity) {
        this.alertService.error(this.t('lot_quantity_mismatch'));
        return false;
      }
    }

    if (trackBySerial && this.serialNumbersArray.length > 0) {
      if (this.serialNumbersArray.length !== quantity) {
        this.alertService.error(this.t('serial_quantity_mismatch'));
        return false;
      }
    }

    return true;
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
        unitPrice: this.inventory.unit_price?.toString() || '0',
        trackByLot: this.inventory.track_by_lot || false,
        trackBySerial: this.inventory.track_by_serial || false,
        trackExpiration: this.inventory.track_expiration || false
      });

      // Prellenar términos visibles del combobox si ya viene inventario
      if (this.inventory.sku) {
        const article = this.articles.find(a => a.sku === this.inventory!.sku);
        this.skuSearchTerm = article ? `${article.sku} - ${article.name}` : this.inventory.sku;
      } else {
        this.skuSearchTerm = '';
      }

      if (this.inventory.location) {
        const loc = this.locations.find(l => l.location_code === this.inventory!.location);
        this.locationSearchTerm = loc ? `${loc.location_code} - ${loc.description}` : this.inventory.location;
      } else {
        this.locationSearchTerm = '';
      }

      // Load lots
      if (this.inventory.lots && this.inventory.lots.length > 0) {
        this.lotsArray.clear();
        this.inventory.lots.forEach(lot => {
          this.lotsArray.push(this.fb.group({
            lotNumber: [lot.lotNumber, Validators.required],
            quantity: [lot.quantity, [Validators.required, Validators.min(0)]],
            expirationDate: [lot.expirationDate || '']
          }));
        });
      }

      // Load serials
      if (this.inventory.serials && this.inventory.serials.length > 0) {
        this.serialNumbersArray.clear();
        this.inventory.serials.forEach(serial => {
          this.serialNumbersArray.push(this.fb.control(serial.serialNumber, Validators.required));
        });
      }

      // Load existing tracking data
      if (this.isEditing) {
        this.loadExistingTrackingData(this.inventory.sku);
      }
    }
  }

  /**
   * @description Add lot to form
   */
  addLot(): void {
    const trackByLot = this.inventoryForm.get('trackByLot')?.value;
    if (!trackByLot) {
      return;
    }

    const remaining = this.getRemainingLotQuantity();
    if (remaining <= 0) {
      this.alertService.warning(this.t('max_lots_reached'));
      return;
    }

    this.lotsArray.push(this.fb.group({
      lotNumber: ['', Validators.required],
      quantity: [remaining, [Validators.required, Validators.min(0)]],
      expirationDate: ['']
    }));
  }

  /**
   * @description Remove lot from form
   */
  removeLot(index: number): void {
    this.lotsArray.removeAt(index);
  }

  /**
   * @description When user types a lot quantity, clamp to remaining available to not exceed total
   */
  onLotQuantityInput(index: number): void {
    const lotGroup = this.lotsArray.at(index) as FormGroup;
    if (!lotGroup) return;
    const currentValue = Number(lotGroup.get('quantity')?.value || 0);
    const allowedMax = this.getRemainingLotQuantity(index);
    if (currentValue > allowedMax) {
      lotGroup.get('quantity')?.setValue(allowedMax);
    } else if (currentValue < 0) {
      lotGroup.get('quantity')?.setValue(0);
    }
  }

  /**
   * @description When total quantity changes, ensure lots total does not exceed it
   */
  onQuantityInput(): void {
    const total = this.inventoryForm.get('quantity')?.value || 0;
    let sum = this.calculateTotalLotQuantity();
    if (sum <= total) return;

    // Reduce the last lot to fit the new total
    const lastIndex = this.lotsArray.length - 1;
    if (lastIndex < 0) return;
    const lastGroup = this.lotsArray.at(lastIndex) as FormGroup;
    const lastQty = Number(lastGroup.get('quantity')?.value || 0);
    const excess = sum - total;
    const newQty = Math.max(0, lastQty - excess);
    lastGroup.get('quantity')?.setValue(newQty);
  }

  /**
   * @description Add serial number to form
   */
  addSerialNumber(): void {
    const quantity = this.inventoryForm.get('quantity')?.value || 0;
    const trackBySerial = this.inventoryForm.get('trackBySerial')?.value;
    
    if (trackBySerial && this.serialNumbersArray.length >= quantity) {
      this.alertService.warning(this.t('max_serials_reached'));
      return;
    }

    this.serialNumbersArray.push(this.fb.control('', Validators.required));
  }

  // (revertido) Métodos de completar faltantes eliminados a solicitud

  /**
   * @description Remove serial number from form
   */
  removeSerialNumber(index: number): void {
    this.serialNumbersArray.removeAt(index);
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

    if (!this.validateTrackingQuantity()) {
      return;
    }

    try {
      this.isSubmitting = true;
      const formData = this.inventoryForm.value;

      let response;
      if (this.isEditing && this.inventory) {
        response = await this.inventoryService.update(this.inventory.id, formData);
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
    this.lotsArray.clear();
    this.serialNumbersArray.clear();
    this.isEditing = false;
    this.inventory = null;
    this.selectedArticle = null;
    this.existingLots = [];
    this.existingSerials = [];
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
