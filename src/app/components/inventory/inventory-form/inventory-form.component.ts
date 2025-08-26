import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Inventory } from '../../../models/inventory.model';
import { ArticleService } from '../../../services/article.service';
import { AlertService } from '../../../services/extras/alert.service';
import { LanguageService } from '../../../services/extras/language.service';
import { InventoryService } from '../../../services/inventory.service';
import { LocationService } from '../../../services/location.service';

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
  
  // Tracking data for lots and serials input
  lotSearchTerm = '';
  serialSearchTerm = '';

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
    private languageService: LanguageService,
    private alertService: AlertService
  ) {}

  async ngOnInit(): Promise<void> {
    this.initializeForm();
    await this.loadInitialData();
    
    // Load inventory data after initial data is loaded
    if (this.inventory) {
      await this.loadInventoryData();
    }
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['inventory']) {
      this.isEditing = !!this.inventory;
      if (this.inventoryForm && this.articles.length > 0 && this.locations.length > 0) {
        await this.loadInventoryData();
      }
    }
  }

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  get lotsArray() {
    return this.inventoryForm.get('lots') as FormArray;
  }

  get serialsArray() {
    return this.inventoryForm.get('serials') as FormArray;
  }

  private calculateTotalLotQuantity(): number {
    return this.lotsArray.controls.reduce((sum, control) => {
      return sum + (control.get('quantity')?.value || 0);
    }, 0);
  }

  get totalLotsQuantity(): number {
    return this.calculateTotalLotQuantity();
  }

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
      serials: this.fb.array([]),
      lot_numbers: [''],
      serial_numbers: ['']
    });

    if (this.inventory) {
      this.loadInventoryData();
    }
  }

  private async loadInitialData(): Promise<void> {
    try {
      await Promise.all([
        this.loadLocations(),
        this.loadArticles()
      ]);
    } catch (error) {
    }
  }

  private async loadLocations(): Promise<void> {
    try {
      const response = await this.locationService.getAll();
      if (response.result.success && response.data) {
        this.locations = response.data;
        this.filteredLocations = [...this.locations];
      }
    } catch (error) {
    }
  }

  private async loadArticles(): Promise<void> {
    try {
      const response = await this.articleService.getAll();
      if (response.result.success && response.data) {
        this.articles = response.data;
        this.filteredArticles = [...this.articles];
      }
    } catch (error) {
    }
  }


  async onSkuSelected(article: any): Promise<void> {
    this.selectedArticle = article;
    
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

    this.skuSearchTerm = `${article.sku} - ${article.name}`;
    this.showSkuDropdown = false;

    this.lotsArray.clear();
    this.serialsArray.clear();

    await this.loadTrackingOptionsForInventory(article.sku);
  }

  onSkuChange(): void {
    const selectedSku = this.inventoryForm.get('sku')?.value;
    if (selectedSku) {
      const article = this.articles.find(a => a.sku === selectedSku);
      if (article) {
        this.onSkuSelected(article);
      }
    }
  }

  filterArticles(): void {
    const term = (this.skuSearchTerm || '').toLowerCase();
    if (!term) {
      this.filteredArticles = [...this.articles];
      return;
    }
    this.filteredArticles = this.articles.filter(a =>
      (a.sku || '').toLowerCase().includes(term) || (a.name || '').toLowerCase().includes(term)
    );
    
    this.validateSkuSelection();
  }

  filterLocations(): void {
    const term = (this.locationSearchTerm || '').toLowerCase();
    if (!term) {
      this.filteredLocations = [...this.locations];
      return;
    }
    this.filteredLocations = this.locations.filter(l =>
      (l.location_code || '').toLowerCase().includes(term) || (l.description || '').toLowerCase().includes(term)
    );
    
    this.validateLocationSelection();
  }

  onLocationSelected(location: any): void {
    this.inventoryForm.patchValue({ location: location.location_code });
    this.locationSearchTerm = `${location.location_code} - ${location.description}`;
    this.showLocationDropdown = false;
  }

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

  closeSkuDropdownLater(): void {
    setTimeout(() => (this.showSkuDropdown = false), 150);
  }

  closeLocationDropdownLater(): void {
    setTimeout(() => (this.showLocationDropdown = false), 150);
  }

  private validateSkuSelection(): void {
    if (!this.skuSearchTerm) {
      if (!this.selectedArticle) {
        this.clearSkuSelection();
      }
      return;
    }

    const exactMatch = this.articles.find(a => 
      `${a.sku} - ${a.name}`.toLowerCase() === this.skuSearchTerm.toLowerCase() ||
      a.sku.toLowerCase() === this.skuSearchTerm.toLowerCase()
    );

    if (exactMatch) {
      if (this.selectedArticle?.sku !== exactMatch.sku) {
        this.onSkuSelected(exactMatch);
      }
    }
  }

  private validateLocationSelection(): void {
    if (!this.locationSearchTerm) {
      const currentLocation = this.inventoryForm.get('location')?.value;
      if (!currentLocation) {
        this.clearLocationSelection();
      }
      return;
    }

    const exactMatch = this.locations.find(l => 
      `${l.location_code} - ${l.description}`.toLowerCase() === this.locationSearchTerm.toLowerCase() ||
      l.location_code.toLowerCase() === this.locationSearchTerm.toLowerCase()
    );

    if (exactMatch) {
      const currentLocation = this.inventoryForm.get('location')?.value;
      if (currentLocation !== exactMatch.location_code) {
        this.onLocationSelected(exactMatch);
      }
    }
  }

  private clearSkuSelection(): void {
    this.selectedArticle = null;
    this.inventoryForm.patchValue({
      sku: '',
      name: '',
      description: '',
      presentation: 'unit',
      unitPrice: '0',
      trackByLot: false,
      trackBySerial: false,
      trackExpiration: false,
      lot_numbers: '',
      serial_numbers: ''
    });
    
    this.lotSearchTerm = '';
    this.serialSearchTerm = '';
  }

  clearSkuManually(): void {
    this.skuSearchTerm = '';
    this.clearSkuSelection();
    this.showSkuDropdown = false;
    this.filteredArticles = [...this.articles];
  }

  clearLocationManually(): void {
    this.locationSearchTerm = '';
    this.clearLocationSelection();
    this.showLocationDropdown = false;
    this.filteredLocations = [...this.locations];
  }

  private clearLocationSelection(): void {
    this.inventoryForm.patchValue({
      location: ''
    });
  }

  onSkuBlur(): void {
    setTimeout(() => {
      this.validateSkuSelection();
      this.showSkuDropdown = false;
    }, 150);
  }

  onLocationBlur(): void {
    setTimeout(() => {
      this.validateLocationSelection();
      this.showLocationDropdown = false;
    }, 150);
  }

  isSkuValid(): boolean {
    const skuValue = this.inventoryForm.get('sku')?.value;
    return !!(skuValue && this.selectedArticle && this.selectedArticle.sku === skuValue);
  }

  isLocationValid(): boolean {
    const locationValue = this.inventoryForm.get('location')?.value;
    if (!locationValue) return false;
    
    return this.locations.some(l => l.location_code === locationValue);
  }

  hasValidSkuSelection(): boolean {
    return this.isSkuValid();
  }

  hasValidLocationSelection(): boolean {
    return this.isLocationValid();
  }

  enableSkuEdit(): void {
    this.skuSearchTerm = '';
    this.showSkuDropdown = true;
    this.filteredArticles = [...this.articles];
  }

  enableLocationEdit(): void {
    this.locationSearchTerm = '';
    this.showLocationDropdown = true;
    this.filteredLocations = [...this.locations];
  }

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

    if (trackBySerial && this.serialsArray.length > 0) {
      if (this.serialsArray.length !== quantity) {
        this.alertService.error(this.t('serial_quantity_mismatch'));
        return false;
      }
    }

    return true;
  }

  private async loadInventoryData(): Promise<void> {
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

      if (this.inventory.sku && this.articles.length > 0) {
        const article = this.articles.find(a => a.sku === this.inventory!.sku);
        if (article) {
          this.selectedArticle = article;
          this.skuSearchTerm = `${article.sku} - ${article.name}`;
        } else {
          this.selectedArticle = {
            sku: this.inventory.sku,
            name: this.inventory.name || this.inventory.sku,
            description: this.inventory.description || '',
            presentation: this.inventory.presentation || 'unit',
            unit_price: this.inventory.unit_price || 0,
            track_by_lot: this.inventory.track_by_lot || false,
            track_by_serial: this.inventory.track_by_serial || false,
            track_expiration: this.inventory.track_expiration || false
          };
          this.skuSearchTerm = `${this.inventory.sku} - ${this.inventory.name || this.inventory.sku}`;
        }
      } else if (this.inventory.sku) {
        this.selectedArticle = {
          sku: this.inventory.sku,
          name: this.inventory.name || this.inventory.sku,
          description: this.inventory.description || '',
          presentation: this.inventory.presentation || 'unit',
          unit_price: this.inventory.unit_price || 0,
          track_by_lot: this.inventory.track_by_lot || false,
          track_by_serial: this.inventory.track_by_serial || false,
          track_expiration: this.inventory.track_expiration || false
        };
        this.skuSearchTerm = `${this.inventory.sku} - ${this.inventory.name || this.inventory.sku}`;
      }

      if (this.inventory.location) {
        const loc = this.locations.find(l => l.location_code === this.inventory!.location);
        this.locationSearchTerm = loc ? `${loc.location_code} - ${loc.description}` : this.inventory.location;
      } else {
        this.locationSearchTerm = '';
      }

      if (this.isEditing) {
        await this.loadExistingInventoryTracking();
      }
    }
  }

  private async loadExistingInventoryTracking(): Promise<void> {
    if (!this.inventory?.sku) return;

    if (this.inventory.lots && this.inventory.lots.length > 0) {
      const lotNumbers = this.inventory.lots.map((lot: any) => lot.lot_number || lot.lotNumber).filter(Boolean);
      this.inventoryForm.get('lot_numbers')?.setValue(lotNumbers.join(', '));
    }

    if (this.inventory.serials && this.inventory.serials.length > 0) {
      const serialNumbers = this.inventory.serials.map((serial: any) => serial.serial_number || serial.serialNumber).filter(Boolean);
      this.inventoryForm.get('serial_numbers')?.setValue(serialNumbers.join(', '));
    }
  }

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

  removeLotFromArray(index: number): void {
    this.lotsArray.removeAt(index);
  }
  
  removeLot(lotNumber: string): void {
    const current = this.getSelectedLots();
    const updated = current.filter((lot: string) => lot !== lotNumber);
    this.inventoryForm.get('lot_numbers')?.setValue(updated.join(', '));
  }

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

  onQuantityInput(): void {
    const total = this.inventoryForm.get('quantity')?.value || 0;
    let sum = this.calculateTotalLotQuantity();
    if (sum <= total) return;

    const lastIndex = this.lotsArray.length - 1;
    if (lastIndex < 0) return;
    const lastGroup = this.lotsArray.at(lastIndex) as FormGroup;
    const lastQty = Number(lastGroup.get('quantity')?.value || 0);
    const excess = sum - total;
    const newQty = Math.max(0, lastQty - excess);
    lastGroup.get('quantity')?.setValue(newQty);
  }

  addSerialNumber(): void {
    const quantity = this.inventoryForm.get('quantity')?.value || 0;
    const trackBySerial = this.inventoryForm.get('trackBySerial')?.value;
    
    if (trackBySerial && this.serialsArray.length >= quantity) {
      this.alertService.warning(this.t('max_serials_reached'));
      return;
    }

    this.serialsArray.push(this.fb.control('', Validators.required));
  }


  removeSerialNumberFromArray(index: number): void {
    this.serialsArray.removeAt(index);
  }
  
  removeSerial(serialNumber: string): void {
    const current = this.getSelectedSerials();
    const updated = current.filter((serial: string) => serial !== serialNumber);
    this.inventoryForm.get('serial_numbers')?.setValue(updated.join(', '));
  }


  private async loadTrackingOptionsForInventory(sku: string): Promise<void> {
  }

  getExpectedQuantity(): number {
    const qty = this.inventoryForm.get('quantity')?.value || 0;
    return Number(qty) || 0;
  }

  getSelectedLots(): string[] {
    const current = (this.inventoryForm.get('lot_numbers')?.value as string) || '';
    return current ? current.split(',').map(s => s.trim()).filter(Boolean) : [];
  }

  getSelectedLotCount(): number {
    return this.getSelectedLots().length;
  }

  getSelectedSerials(): string[] {
    const current = (this.inventoryForm.get('serial_numbers')?.value as string) || '';
    return current ? current.split(',').map(s => s.trim()).filter(Boolean) : [];
  }

  getSelectedSerialCount(): number {
    return this.getSelectedSerials().length;
  }

  isLotSelectionComplete(): boolean {
    const expectedQty = this.getExpectedQuantity();
    const selectedCount = this.getSelectedLotCount();
    return expectedQty > 0 && selectedCount === expectedQty;
  }

  isSerialSelectionComplete(): boolean {
    const expectedQty = this.getExpectedQuantity();
    const selectedCount = this.getSelectedSerialCount();
    return expectedQty > 0 && selectedCount === expectedQty;
  }

  isLotSelected(lotNumber: string): boolean {
    return this.getSelectedLots().includes(lotNumber);
  }

  isSerialSelected(serialNumber: string): boolean {
    return this.getSelectedSerials().includes(serialNumber);
  }

  filterLotsForInventory(): void {
  }

  filterSerialsForInventory(): void {
  }

  onLotSelected(lotNumber: string): void {
  }

  onSerialSelected(serialNumber: string): void {
  }

  closeLotDropdownLater(): void {
  }

  closeSerialDropdownLater(): void {
  }

  onManualLotInput(): void {
  }

  onManualSerialInput(): void {
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
    
    const current = this.getSelectedLots();
    const expectedQty = this.getExpectedQuantity();

    if (!current.includes(lotNumber.trim()) && current.length < expectedQty) {
      current.push(lotNumber.trim());
      this.inventoryForm.get('lot_numbers')?.setValue(current.join(', '));
      this.lotSearchTerm = '';
    } else if (current.length >= expectedQty) {
      this.alertService.warning(
        this.t('lot_selection_limit_reached'),
        this.t('warning')
      );
    }
  }

  addManualSerial(serialNumber: string): void {
    if (!serialNumber.trim()) return;
    
    const current = this.getSelectedSerials();
    const expectedQty = this.getExpectedQuantity();

    if (!current.includes(serialNumber.trim()) && current.length < expectedQty) {
      current.push(serialNumber.trim());
      this.inventoryForm.get('serial_numbers')?.setValue(current.join(', '));
      this.serialSearchTerm = '';
    } else if (current.length >= expectedQty) {
      this.alertService.warning(
        this.t('serial_selection_limit_reached'),
        this.t('warning')
      );
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.inventoryForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

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
      const formData = { ...this.inventoryForm.value };
      
      if (formData.unitPrice) {
        formData.unitPrice = parseFloat(formData.unitPrice);
      }

      formData.lots = [];
      formData.serials = [];

      if (formData.lot_numbers && typeof formData.lot_numbers === 'string') {
        const lotNumbers = formData.lot_numbers.split(',').map((s: string) => s.trim()).filter(Boolean);
        formData.lots = lotNumbers.map((lotNumber: string) => ({
          lot_number: lotNumber,
          sku: formData.sku,
          expiration_date: null
        }));
      }

      if (formData.serial_numbers && typeof formData.serial_numbers === 'string') {
        const serialNumbers = formData.serial_numbers.split(',').map((s: string) => s.trim()).filter(Boolean);
        formData.serials = serialNumbers.map((serialNumber: string) => ({
          serial_number: serialNumber,
          sku: formData.sku,
          status: 'available'
        }));
      }

      delete formData.lot_numbers;
      delete formData.serial_numbers;

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
      this.alertService.error(this.t('operation_failed'));
    } finally {
      this.isSubmitting = false;
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.inventoryForm.controls).forEach(key => {
      const control = this.inventoryForm.get(key);
      control?.markAsTouched();
    });
  }

  private resetForm(): void {
    this.inventoryForm.reset();
    this.lotsArray.clear();
    this.serialsArray.clear();
    this.isEditing = false;
    this.inventory = null;
    this.selectedArticle = null;
  }

  onCancel(): void {
    this.cancel.emit();
    this.resetForm();
  }

  close(): void {
    this.cancel.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
