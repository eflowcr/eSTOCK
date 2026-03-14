import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { StockTransfer, StockTransferLine, StockTransferLineInput } from '@app/models/stock-transfer.model';
import { Article } from '@app/models/article.model';
import { StockTransfersService } from '@app/services/stock-transfers.service';
import { ArticleService } from '@app/services/article.service';
import { InventoryService } from '@app/services/inventory.service';
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
import { ZardSelectComponent } from '@app/shared/components/select/select.component';
import { ZardSelectItemComponent } from '@app/shared/components/select/select-item.component';

export interface LocationOption {
  id: string;
  location_code?: string;
  description?: string;
}

@Component({
  selector: 'app-stock-transfer-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    DrawerComponent,
    ZardButtonComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardInputDirective,
    ZardSelectComponent,
    ZardSelectItemComponent,
  ],
  templateUrl: './stock-transfer-form.component.html',
  styleUrls: ['./stock-transfer-form.component.css'],
})
export class StockTransferFormComponent implements OnInit, OnChanges {
  @Input() initialData?: StockTransfer | null;
  @Input() lines: StockTransferLine[] = [];
  @Input() locations: LocationOption[] = [];
  @Input() isOpen = false;
  @Output() success = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  form!: FormGroup;
  isEditing = false;
  isSubmitting = false;

  articles: Article[] = [];
  lineSearchTerms: string[] = [];
  lineShowDropdown: boolean[] = [];
  lineAvailableQty: Array<number | null> = [];
  lineAvailableType: string[] = [];
  lineAvailabilityLoading: boolean[] = [];

  constructor(
    private fb: FormBuilder,
    private stockTransfersService: StockTransfersService,
    private articleService: ArticleService,
    private inventoryService: InventoryService,
    private languageService: LanguageService,
    private alertService: AlertService
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  get linesArray(): FormArray {
    return this.form?.get('lines') as FormArray;
  }

  getLocationLabel(loc: LocationOption): string {
    return loc.description || loc.location_code || loc.id;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      from_location_id: ['', Validators.required],
      to_location_id: ['', Validators.required],
      status: ['draft', Validators.required],
      notes: [''],
      lines: this.fb.array([], Validators.required),
    });
    this.form.get('from_location_id')?.valueChanges.subscribe(() => {
      this.refreshAllLineAvailability();
    });
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialData'] || changes['lines']) {
      this.isEditing = !!this.initialData;
      if (this.form) this.loadData();
    }
    if (changes['isOpen'] && this.isOpen && this.form) this.loadData();
    if (changes['isOpen'] && !this.isOpen) this.form?.reset({ lines: this.fb.array([]) });
  }

  private loadData(): void {
    if (!this.form) return;
    if (this.initialData) {
      this.form.patchValue({
        from_location_id: this.initialData.from_location_id,
        to_location_id: this.initialData.to_location_id,
        status: this.initialData.status,
        notes: this.initialData.notes ?? '',
      });
    } else {
      this.form.patchValue({ status: 'draft', notes: '' });
      const arr = this.linesArray;
      arr.clear();
      this.lineSearchTerms = [];
      this.lineShowDropdown = [];
      this.lineAvailableQty = [];
      this.lineAvailableType = [];
      this.lineAvailabilityLoading = [];
      this.addLine();
      if (this.isOpen) {
        this.loadArticles();
      }
    }
    if (this.isEditing && this.lines?.length) {
      const arr = this.linesArray;
      arr.clear();
      for (const line of this.lines) {
        arr.push(
          this.fb.group({
            sku: [line.sku, Validators.required],
            quantity: [line.quantity, [Validators.required, Validators.min(0.001)]],
            presentation: [line.presentation ?? ''],
          })
        );
      }
    } else if (!this.initialData && this.linesArray.length === 0) {
      this.addLine();
    }
  }

  addLine(): void {
    this.linesArray.push(
      this.fb.group({
        sku: ['', Validators.required],
        quantity: [1, [Validators.required, Validators.min(0.001)]],
        presentation: [''],
      })
    );
    this.lineSearchTerms.push('');
    this.lineShowDropdown.push(false);
    this.lineAvailableQty.push(null);
    this.lineAvailableType.push('');
    this.lineAvailabilityLoading.push(false);
  }

  removeLine(index: number): void {
    if (this.linesArray.length > 1) {
      this.linesArray.removeAt(index);
      this.lineSearchTerms.splice(index, 1);
      this.lineShowDropdown.splice(index, 1);
      this.lineAvailableQty.splice(index, 1);
      this.lineAvailableType.splice(index, 1);
      this.lineAvailabilityLoading.splice(index, 1);
    }
  }

  close(): void {
    this.form?.reset({ lines: this.fb.array([]) });
    this.lineSearchTerms = [];
    this.lineShowDropdown = [];
    this.lineAvailableQty = [];
    this.lineAvailableType = [];
    this.lineAvailabilityLoading = [];
    this.isEditing = false;
    this.closed.emit();
  }

  getLineSearchTerm(i: number): string {
    return this.lineSearchTerms[i] ?? '';
  }

  setLineSearchTerm(i: number, value: string): void {
    if (i >= 0 && i < this.lineSearchTerms.length) {
      this.lineSearchTerms[i] = value;
      this.lineShowDropdown[i] = true;
    }
  }

  getFilteredArticlesForLine(i: number): Article[] {
    const term = (this.lineSearchTerms[i] ?? '').toLowerCase().trim();
    if (!term) return this.articles.slice(0, 50);
    return this.articles.filter(
      (a) =>
        (a.sku || '').toLowerCase().includes(term) ||
        (a.name || '').toLowerCase().includes(term)
    ).slice(0, 50);
  }

  onLineSkuFocus(i: number): void {
    this.lineShowDropdown[i] = true;
  }

  onLineSkuBlur(i: number): void {
    setTimeout(() => {
      this.lineShowDropdown[i] = false;
      this.validateLineSku(i);
    }, 150);
  }

  private validateLineSku(i: number): void {
    const term = (this.lineSearchTerms[i] ?? '').trim();
    if (!term) return;
    const match = this.articles.find(
      (a) =>
        `${a.sku} - ${a.name}`.toLowerCase() === term.toLowerCase() ||
        (a.sku || '').toLowerCase() === term.toLowerCase()
    );
    if (match) {
      const line = this.linesArray.at(i);
      if (line && line.get('sku')?.value !== match.sku) {
        line.patchValue({ sku: match.sku, presentation: match.presentation || '' });
        this.lineSearchTerms[i] = `${match.sku} - ${match.name}`;
        this.loadLineAvailability(i);
      }
    }
  }

  onLineSkuSelect(i: number, article: Article): void {
    const line = this.linesArray.at(i);
    if (line) {
      line.patchValue({
        sku: article.sku,
        presentation: article.presentation || '',
      });
      this.lineSearchTerms[i] = `${article.sku} - ${article.name}`;
    }
    this.lineShowDropdown[i] = false;
    this.loadLineAvailability(i);
  }

  confirmFirstArticleForLine(i: number): void {
    const filtered = this.getFilteredArticlesForLine(i);
    if (filtered.length > 0) {
      this.onLineSkuSelect(i, filtered[0]);
    }
  }

  clearLineSku(i: number): void {
    const line = this.linesArray.at(i);
    if (line) {
      line.patchValue({ sku: '', presentation: '' });
    }
    this.lineSearchTerms[i] = '';
    this.lineShowDropdown[i] = false;
    this.lineAvailableQty[i] = null;
    this.lineAvailableType[i] = '';
    this.lineAvailabilityLoading[i] = false;
  }

  isLineSkuValid(i: number): boolean {
    const sku = this.linesArray.at(i)?.get('sku')?.value as string;
    return !!sku?.trim() && this.articles.some((a) => (a.sku || '').trim() === (sku || '').trim());
  }

  private async loadArticles(): Promise<void> {
    try {
      const res = await this.articleService.getAll();
      if (res?.result?.success && Array.isArray(res.data)) {
        this.articles = res.data.filter((a: Article) => a.is_active !== false);
      } else {
        this.articles = [];
      }
    } catch {
      this.articles = [];
    }
  }

  private getFromLocationCode(): string {
    const fromLocationId = this.form?.get('from_location_id')?.value;
    if (!fromLocationId) return '';
    const location = this.locations.find((loc) => String(loc.id) === String(fromLocationId));
    return (location?.location_code || location?.id || '').trim();
  }

  private async loadLineAvailability(i: number): Promise<void> {
    const line = this.linesArray.at(i);
    const sku = String(line?.get('sku')?.value || '').trim();
    const fromCode = this.getFromLocationCode();

    if (!sku || !fromCode) {
      this.lineAvailableQty[i] = null;
      this.lineAvailableType[i] = '';
      this.lineAvailabilityLoading[i] = false;
      return;
    }

    this.lineAvailabilityLoading[i] = true;
    try {
      const res = await this.inventoryService.getBySkuAndLocation(sku, fromCode);
      if (res?.result?.success && res.data) {
        const qty = Number(res.data.quantity) || 0;
        this.lineAvailableQty[i] = qty;
        this.lineAvailableType[i] = String(res.data.presentation || line?.get('presentation')?.value || '').trim();
      } else {
        this.lineAvailableQty[i] = 0;
        this.lineAvailableType[i] = String(line?.get('presentation')?.value || '').trim();
      }
    } catch {
      this.lineAvailableQty[i] = null;
    } finally {
      this.lineAvailabilityLoading[i] = false;
    }
  }

  private refreshAllLineAvailability(): void {
    for (let i = 0; i < this.linesArray.length; i += 1) {
      this.loadLineAvailability(i);
    }
  }

  getLineAvailableQty(i: number): number | null {
    return this.lineAvailableQty[i] ?? null;
  }

  getLineType(i: number): string {
    return this.lineAvailableType[i] || String(this.linesArray.at(i)?.get('presentation')?.value || '').trim();
  }

  isLineAvailabilityLoading(i: number): boolean {
    return !!this.lineAvailabilityLoading[i];
  }

  getLineQuantityMax(i: number): number | null {
    const max = this.getLineAvailableQty(i);
    if (max === null) return null;
    return max > 0 ? max : null;
  }

  isLineQuantityExceedsAvailable(i: number): boolean {
    const max = this.getLineAvailableQty(i);
    if (max === null) return false;
    const quantity = Number(this.linesArray.at(i)?.get('quantity')?.value || 0);
    return quantity > max;
  }

  async onSubmit(): Promise<void> {
    const fromId = this.form.get('from_location_id')?.value;
    const toId = this.form.get('to_location_id')?.value;
    if (fromId === toId) {
      this.alertService.error(this.t('error'), this.t('stock_transfer_from_to_must_differ'));
      return;
    }
    const lines = (this.form.get('lines') as FormArray).value as { sku: string; quantity: number; presentation: string }[];
    const validLines = lines.filter((l) => l.sku?.trim() && l.quantity > 0);
    if (validLines.length === 0) {
      this.alertService.error(this.t('error'), this.t('stock_transfer_at_least_one_line'));
      return;
    }
    for (let i = 0; i < validLines.length; i += 1) {
      const max = this.getLineAvailableQty(i);
      if (max !== null && Number(validLines[i].quantity) > max) {
        this.alertService.error(
          this.t('error'),
          `${this.t('stock_transfer_quantity_exceeds_available')}: ${validLines[i].sku} (max: ${max})`
        );
        return;
      }
    }
    if (this.form.invalid || this.isSubmitting) return;

    try {
      this.isSubmitting = true;
      if (this.isEditing && this.initialData) {
        const res = await this.stockTransfersService.update(this.initialData.id, {
          from_location_id: fromId,
          to_location_id: toId,
          status: this.form.get('status')?.value,
          notes: this.form.get('notes')?.value || undefined,
        });
        if (res?.result?.success) {
          this.alertService.success(this.t('success'), this.t('stock_transfer_updated'));
          this.success.emit();
          this.close();
        } else {
          this.alertService.error(this.t('error'), res?.result?.message ?? this.t('failed_to_update_stock_transfer'));
        }
      } else {
        const payload = {
          from_location_id: fromId,
          to_location_id: toId,
          notes: this.form.get('notes')?.value || undefined,
          lines: validLines.map((l) => ({
            sku: l.sku.trim(),
            quantity: Number(l.quantity),
            presentation: l.presentation?.trim() || undefined,
          })) as StockTransferLineInput[],
        };
        const res = await this.stockTransfersService.create(payload);
        if (res?.result?.success) {
          this.alertService.success(this.t('success'), this.t('stock_transfer_created'));
          this.success.emit();
          this.close();
        } else {
          this.alertService.error(this.t('error'), res?.result?.message ?? this.t('failed_to_create_stock_transfer'));
        }
      }
    } catch (err: unknown) {
      this.alertService.error(this.t('error'), handleApiError(err, this.t('error_saving_stock_transfer')));
    } finally {
      this.isSubmitting = false;
    }
  }
}
