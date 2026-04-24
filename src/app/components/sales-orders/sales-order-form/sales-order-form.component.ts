import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ChangeDetectorRef,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { SalesOrder, CreateSalesOrderRequest, UpdateSalesOrderRequest } from '@app/models/sales-order.model';
import { Client } from '@app/models/client.model';
import { Article } from '@app/models/article.model';
import { SalesOrdersService } from '@app/services/sales-orders.service';
import { ClientsService } from '@app/services/clients.service';
import { ArticleService } from '@app/services/article.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { LoadingService } from '@app/services/extras/loading.service';
import { getDisplayableApiError, humanizeApiError } from '@app/utils';
import { DrawerComponent } from '@app/shared/components/drawer';

/** Validator: FormArray must have at least one item (M4) */
function atLeastOneItemValidator(control: AbstractControl): ValidationErrors | null {
  const arr = control as FormArray;
  return arr.length > 0 ? null : { atLeastOne: true };
}

@Component({
  selector: 'app-sales-order-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DrawerComponent],
  template: `
    <app-drawer [isOpen]="isOpen" direction="right" panelClass="w-full max-w-xl" (closed)="onDrawerClosed()">
      <div drawerHeader class="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h2 class="text-lg font-semibold">
            {{ isEditing ? t('sales_orders.edit_title') : t('sales_orders.new_title') }}
          </h2>
          <p class="text-sm text-muted-foreground mt-0.5">
            {{ isEditing ? t('sales_orders.edit_subtitle') : t('sales_orders.new_subtitle') }}
          </p>
        </div>
        <button (click)="close()"
          class="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent text-muted-foreground transition-colors">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div drawerContent class="flex-1 overflow-y-auto px-6 py-4">
        <div *ngIf="isLoading" class="flex items-center justify-center py-10">
          <div class="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        </div>

        <form *ngIf="!isLoading" [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-5">
          <!-- Customer -->
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium">
              {{ t('sales_orders.customer') }}
              <span class="text-destructive ml-0.5">*</span>
            </label>
            <select
              formControlName="customer_id"
              class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              [class.border-destructive]="isFieldInvalid('customer_id')">
              <option value="">{{ t('sales_orders.select_customer') }}</option>
              <option *ngFor="let c of customers" [value]="c.id">{{ c.name }} ({{ c.code }})</option>
            </select>
            <p *ngIf="isFieldInvalid('customer_id')" class="text-xs text-destructive">
              {{ t('sales_orders.customer_required') }}
            </p>
          </div>

          <!-- Expected Date -->
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium">{{ t('sales_orders.expected_date') }}</label>
            <input
              type="date"
              formControlName="expected_date"
              class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <!-- Notes -->
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium">{{ t('sales_orders.notes') }}</label>
            <textarea
              formControlName="notes"
              rows="2"
              [placeholder]="t('sales_orders.notes_placeholder')"
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            ></textarea>
          </div>

          <!-- Items -->
          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium">{{ t('sales_orders.items') }}</label>
              <button type="button" (click)="addItem()"
                class="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                {{ t('sales_orders.add_item') }}
              </button>
            </div>

            <div *ngIf="itemsArray.length === 0" class="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              {{ t('sales_orders.no_items_yet') }}
            </div>

            <div *ngFor="let item of itemsArray.controls; let i = index" [formGroup]="asGroup(item)"
              class="rounded-md border border-border p-3 flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-muted-foreground">{{ t('sales_orders.item') }} {{ i + 1 }}</span>
                <button type="button" (click)="removeItem(i)"
                  class="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <!-- SKU Combobox -->
              <div class="flex flex-col gap-1">
                <label class="text-xs font-medium">{{ t('sales_orders.sku') }} <span class="text-destructive">*</span></label>
                <div class="relative">
                  <!-- Show readonly pill if SKU selected -->
                  <div *ngIf="hasValidSkuSelection(i)" class="flex items-center gap-2 h-9 rounded-md border border-input bg-muted/30 px-3 text-sm">
                    <span class="flex-1 truncate">{{ getSelectedSkuName(i) }}</span>
                    <button type="button" (click)="clearSku(i)"
                      class="text-muted-foreground hover:text-foreground">
                      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                  <!-- Input if no SKU selected -->
                  <div *ngIf="!hasValidSkuSelection(i)" class="relative">
                    <input type="text"
                      [(ngModel)]="skuSearchTerms[i]"
                      [ngModelOptions]="{standalone: true}"
                      (input)="filterArticles(i)"
                      (focus)="showSkuDropdown[i] = true"
                      (blur)="closeSkuDropdownLater(i)"
                      [placeholder]="t('sales_orders.search_sku')"
                      class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <div *ngIf="showSkuDropdown[i] && filteredArticles[i]?.length"
                      class="absolute z-20 mt-0.5 w-full rounded-md border border-border bg-popover shadow-md max-h-48 overflow-y-auto">
                      <button *ngFor="let a of filteredArticles[i]" type="button"
                        (mousedown)="selectSku(i, a)"
                        class="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left">
                        <span class="font-mono text-xs text-muted-foreground">{{ a.sku }}</span>
                        <span class="flex-1 truncate">{{ a.name }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Qty + Price row -->
              <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-medium">{{ t('sales_orders.expected_qty') }} <span class="text-destructive">*</span></label>
                  <input type="number" formControlName="expected_qty" min="0.001" step="0.001"
                    class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    [class.border-destructive]="isItemFieldInvalid(i, 'expected_qty')"
                  />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-medium">{{ t('sales_orders.unit_price') }}</label>
                  <input type="number" formControlName="unit_price" min="0" step="0.01"
                    class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div drawerFooter class="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
        <button type="button" (click)="close()"
          class="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground hover:bg-accent transition-colors">
          {{ t('cancel') }}
        </button>
        <button type="button" (click)="onSubmit()" [disabled]="form.invalid || isSaving"
          class="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          <div *ngIf="isSaving" class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
          {{ isSaving ? t('saving') : (isEditing ? t('save_changes') : t('create')) }}
        </button>
      </div>
    </app-drawer>
  `,
})
export class SalesOrderFormComponent implements OnInit {
  @Input() order: SalesOrder | null = null;
  @Input() isOpen = false;
  @Output() success = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  form: FormGroup;
  customers: Client[] = [];
  articles: Article[] = [];
  isLoading = false;
  isSaving = false;
  isEditing = false;

  skuSearchTerms: string[] = [];
  showSkuDropdown: boolean[] = [];
  filteredArticles: Article[][] = [];

  constructor(
    private fb: FormBuilder,
    private salesOrdersService: SalesOrdersService,
    private clientsService: ClientsService,
    private articleService: ArticleService,
    private alertService: AlertService,
    private languageService: LanguageService,
    private loadingService: LoadingService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      customer_id: ['', Validators.required],
      expected_date: [''],
      notes: [''],
      items: this.fb.array([], atLeastOneItemValidator),
    });
  }

  async ngOnInit(): Promise<void> {
    this.isEditing = !!this.order;
    await this.loadData();
    if (this.order) {
      this.loadOrderForEdit();
    } else {
      this.addItem();
    }
  }

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  get itemsArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  asGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }

  private createItemGroup(data?: { article_sku?: string; expected_qty?: number; unit_price?: number }): FormGroup {
    return this.fb.group({
      article_sku: [data?.article_sku || '', Validators.required],
      expected_qty: [data?.expected_qty || null, [Validators.required, Validators.min(0.001)]],
      unit_price: [data?.unit_price ?? null],
    });
  }

  addItem(): void {
    const group = this.createItemGroup();
    this.itemsArray.push(group);
    const i = this.itemsArray.length - 1;
    this.skuSearchTerms[i] = '';
    this.showSkuDropdown[i] = false;
    this.filteredArticles[i] = [...this.articles];
    this.cdr.detectChanges();
  }

  removeItem(index: number): void {
    this.itemsArray.removeAt(index);
    this.skuSearchTerms.splice(index, 1);
    this.showSkuDropdown.splice(index, 1);
    this.filteredArticles.splice(index, 1);
  }

  hasValidSkuSelection(index: number): boolean {
    const sku = this.itemsArray.at(index)?.get('article_sku')?.value;
    return !!sku && this.articles.some((a) => a.sku === sku);
  }

  getSelectedSkuName(index: number): string {
    const sku = this.itemsArray.at(index)?.get('article_sku')?.value;
    const a = this.articles.find((art) => art.sku === sku);
    return a ? `${a.sku} — ${a.name}` : sku;
  }

  clearSku(index: number): void {
    this.itemsArray.at(index).get('article_sku')?.setValue('');
    this.skuSearchTerms[index] = '';
    this.showSkuDropdown[index] = false;
  }

  filterArticles(index: number): void {
    const term = (this.skuSearchTerms[index] || '').toLowerCase();
    this.filteredArticles[index] = term
      ? this.articles.filter(
          (a) =>
            (a.sku || '').toLowerCase().includes(term) ||
            (a.name || '').toLowerCase().includes(term),
        )
      : [...this.articles];
  }

  selectSku(index: number, article: Article): void {
    this.itemsArray.at(index).get('article_sku')?.setValue(article.sku);
    this.skuSearchTerms[index] = `${article.sku} — ${article.name}`;
    this.showSkuDropdown[index] = false;
  }

  closeSkuDropdownLater(index: number): void {
    setTimeout(() => (this.showSkuDropdown[index] = false), 150);
  }

  isFieldInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && c.touched);
  }

  isItemFieldInvalid(index: number, field: string): boolean {
    const c = this.itemsArray.at(index)?.get(field);
    return !!(c && c.invalid && c.touched);
  }

  close(): void {
    this.cancel.emit();
  }

  onDrawerClosed(): void {
    this.cancel.emit();
  }

  async loadData(): Promise<void> {
    try {
      this.isLoading = true;
      const [custResp, artResp] = await Promise.all([
        this.clientsService.list({ is_active: true }),
        this.articleService.getAll(),
      ]);
      if (custResp.result.success) {
        // Include type='both' (M7 fix: clients that are both supplier+customer must appear)
        this.customers = (custResp.data || []).filter(
          (c: Client) => c.type === 'customer' || c.type === 'both',
        );
      }
      if (artResp.result.success) {
        this.articles = (artResp.data || []).filter((a: Article) => a.is_active !== false);
      }
    } catch {
      this.alertService.error(this.t('error_loading_data'), this.t('error'));
    } finally {
      this.isLoading = false;
    }
  }

  private loadOrderForEdit(): void {
    if (!this.order) return;
    // Patch base fields
    this.form.patchValue({
      customer_id: this.order.customer_id,
      expected_date: this.order.expected_date
        ? this.order.expected_date.substring(0, 10)
        : '',
      notes: this.order.notes || '',
    });
    // Clear items and repopulate
    while (this.itemsArray.length > 0) this.itemsArray.removeAt(0);
    if (this.order.items?.length) {
      this.order.items.forEach((item, i) => {
        const group = this.createItemGroup({
          article_sku: item.article_sku,
          expected_qty: item.expected_qty,
          unit_price: item.unit_price,
        });
        this.itemsArray.push(group);
        this.skuSearchTerms[i] = '';
        this.showSkuDropdown[i] = false;
        this.filteredArticles[i] = [...this.articles];
      });
    } else {
      this.addItem();
    }
    this.cdr.detectChanges();
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.alertService.error(this.t('please_complete_required_fields'), this.t('error'));
      return;
    }
    const val = this.form.value;
    const items = this.itemsArray.controls.map((ctrl) => {
      const g = ctrl as FormGroup;
      return {
        article_sku: g.get('article_sku')?.value as string,
        expected_qty: Number(g.get('expected_qty')?.value),
        unit_price: g.get('unit_price')?.value ? Number(g.get('unit_price')?.value) : undefined,
      };
    });

    try {
      this.isSaving = true;
      this.loadingService.show();

      if (this.order) {
        const payload: UpdateSalesOrderRequest = {
          customer_id: val.customer_id,
          expected_date: val.expected_date || undefined,
          notes: val.notes?.trim() || undefined,
          items,
        };
        const resp = await this.salesOrdersService.update(this.order.id, payload);
        if (resp.result.success) {
          this.alertService.success(this.t('sales_orders.updated_ok'), this.t('success'));
          this.success.emit();
        } else {
          this.alertService.error(
            humanizeApiError(resp.result.message || '', this.t, 'sales_orders.update_error'),
            this.t('error'),
          );
        }
      } else {
        const payload: CreateSalesOrderRequest = {
          customer_id: val.customer_id,
          expected_date: val.expected_date || undefined,
          notes: val.notes?.trim() || undefined,
          items,
        };
        const resp = await this.salesOrdersService.create(payload);
        if (resp.result.success) {
          this.alertService.success(this.t('sales_orders.created_ok'), this.t('success'));
          this.success.emit();
        } else {
          this.alertService.error(
            humanizeApiError(resp.result.message || '', this.t, 'sales_orders.create_error'),
            this.t('error'),
          );
        }
      }
    } catch (err: any) {
      this.alertService.error(
        getDisplayableApiError(err, this.t, 'sales_orders.save_error'),
        this.t('error'),
      );
    } finally {
      this.isSaving = false;
      this.loadingService.hide();
    }
  }
}
