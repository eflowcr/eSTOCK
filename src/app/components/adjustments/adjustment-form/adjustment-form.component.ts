import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { AdjustmentFormData } from '../../../models/adjustment.model';
import { Article } from '../../../models/article.model';
import { Location } from '../../../models/location.model';
import { AdjustmentService } from '../../../services/adjustment.service';
import { ArticleService } from '../../../services/article.service';
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
  articles: Article[] = [];
  locations: Location[] = [];
  
  // Filtered lists and search state for comboboxes
  filteredArticles: Article[] = [];
  filteredLocations: Location[] = [];
  skuSearchTerm = '';
  locationSearchTerm = '';
  showSkuDropdown = false;
  showLocationDropdown = false;
  
  // Selected data
  selectedArticle: Article | null = null;

  constructor(
    private fb: FormBuilder,
    private adjustmentService: AdjustmentService,
    private articleService: ArticleService,
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
      const [articlesResponse, locationsResponse] = await Promise.all([
        this.articleService.getAll(),
        this.locationService.getAll()
      ]);
      
      this.articles = articlesResponse.data || [];
      this.locations = locationsResponse.data || [];
      
      this.filteredArticles = [...this.articles];
      this.filteredLocations = [...this.locations];
    } catch (error) {
      this.alertService.error(this.t('error_loading_data'));
    }
  }

  get adjustmentQuantity(): number {
    return Number(this.adjustmentForm.get('adjustmentQuantity')?.value) || 0;
  }

  /**
   * Filter articles by search term
   */
  filterArticles(): void {
    const term = (this.skuSearchTerm || '').toLowerCase();
    if (!term) {
      this.filteredArticles = [...this.articles];
      return;
    }
    this.filteredArticles = this.articles.filter(article =>
      (article.sku || '').toLowerCase().includes(term) || 
      (article.name || '').toLowerCase().includes(term)
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
   * Handle article selection
   */
  onArticleSelected(article: Article): void {
    this.selectedArticle = article;
    
    this.adjustmentForm.patchValue({
      sku: article.sku
    });

    // Update search term
    this.skuSearchTerm = `${article.sku} - ${article.name}`;
    
    // Close dropdown
    this.showSkuDropdown = false;
  }

  /**
   * Handle location selection
   */
  onLocationSelected(location: Location): void {
    this.adjustmentForm.patchValue({ location: location.location_code });
    this.locationSearchTerm = `${location.location_code} - ${location.description}`;
    this.showLocationDropdown = false;
  }

  /**
   * Confirm first filtered option with Enter key
   */
  confirmFirstArticleIfAny(): void {
    if (this.filteredArticles.length > 0) {
      this.onArticleSelected(this.filteredArticles[0]);
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
        notes: formData.notes || ""  // Send empty string instead of undefined
      };

      // Debug log to see what we're sending
      console.log('Sending adjustment data:', JSON.stringify(adjustmentData, null, 2));

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
    this.selectedArticle = null;
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