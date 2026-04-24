import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { PurchaseOrder } from '@app/models/purchase-order.model';
import { Client } from '@app/models/client.model';
import { Article } from '@app/models/article.model';
import { PurchaseOrdersService } from '@app/services/purchase-orders.service';
import { ClientsService } from '@app/services/clients.service';
import { ArticleService } from '@app/services/article.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { getApiErrorMessage } from '@app/utils';
import { DrawerComponent } from '@app/shared/components/drawer';
import { ZardButtonComponent } from '@app/shared/components/button/button.component';
import {
  ZardFormFieldComponent,
  ZardFormLabelComponent,
  ZardFormControlComponent,
} from '@app/shared/components/form/form.component';
import { ZardInputDirective } from '@app/shared/components/input/input.directive';
import { ZardSelectImports } from '@app/shared/components/select/select.imports';

function atLeastOneItemValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const arr = control as FormArray;
    if (!arr || arr.length === 0) return { noItems: true };
    return null;
  };
}

@Component({
  selector: 'app-purchase-order-form',
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
    ZardSelectImports,
  ],
  templateUrl: './purchase-order-form.component.html',
})
export class PurchaseOrderFormComponent implements OnInit, OnChanges {
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() poId?: string;
  @Input() isOpen = false;
  @Output() success = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  form!: FormGroup;
  isLoading = false;
  isLoadingData = false;

  suppliers: Client[] = [];
  articles: Article[] = [];
  existingPo: PurchaseOrder | null = null;

  constructor(
    private fb: FormBuilder,
    private purchaseOrdersService: PurchaseOrdersService,
    private clientsService: ClientsService,
    private articleService: ArticleService,
    private alertService: AlertService,
    private languageService: LanguageService,
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  get isEditMode(): boolean {
    return this.mode === 'edit';
  }

  get isDraftMode(): boolean {
    if (!this.existingPo) return true;
    return this.existingPo.status === 'draft';
  }

  ngOnInit(): void {
    this.initForm();
    this.loadSuppliers();
    this.loadArticles();
    if (this.isOpen && this.isEditMode && this.poId) {
      this.loadPo(this.poId);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      if (!this.isOpen) {
        this.resetForm();
        this.existingPo = null;
      } else if (this.isEditMode && this.poId && this.form) {
        this.loadPo(this.poId);
      }
    }
    if (changes['poId'] && this.poId && this.isOpen && this.form) {
      this.loadPo(this.poId);
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      supplier_id: ['', Validators.required],
      expected_date: [''],
      notes: ['', Validators.maxLength(1000)],
      items: this.fb.array([], atLeastOneItemValidator()),
    });
    this.addItem();
  }

  private resetForm(): void {
    if (!this.form) return;
    this.form.reset({ supplier_id: '', expected_date: '', notes: '' });
    while (this.items.length > 0) this.items.removeAt(0);
    this.addItem();
    this.existingPo = null;
  }

  private async loadPo(id: string): Promise<void> {
    this.isLoadingData = true;
    try {
      const res = await this.purchaseOrdersService.getById(id);
      this.existingPo = res.data ?? null;
      if (this.existingPo) this.populateForm(this.existingPo);
    } catch {
      this.alertService.error(this.t('purchase_orders.error_loading'));
    } finally {
      this.isLoadingData = false;
    }
  }

  private populateForm(po: PurchaseOrder): void {
    this.form.patchValue({
      supplier_id: po.supplier_id,
      expected_date: po.expected_date ? po.expected_date.split('T')[0] : '',
      notes: po.notes ?? '',
    });

    while (this.items.length > 0) this.items.removeAt(0);

    if (po.items && po.items.length > 0) {
      po.items.forEach((item) => {
        this.items.push(
          this.fb.group({
            article_sku: [item.article_sku, Validators.required],
            expected_qty: [item.expected_qty, [Validators.required, Validators.min(1)]],
            unit_cost: [item.unit_cost ?? null],
            notes: [item.notes ?? ''],
          }),
        );
      });
    } else {
      this.addItem();
    }

    if (!this.isDraftMode) {
      this.form.disable();
    }
  }

  private async loadSuppliers(): Promise<void> {
    try {
      const [supplierRes, bothRes] = await Promise.all([
        this.clientsService.list({ type: 'supplier', is_active: true }),
        this.clientsService.list({ type: 'both', is_active: true }),
      ]);
      this.suppliers = [...(supplierRes.data ?? []), ...(bothRes.data ?? [])];
    } catch {
      // non-critical
    }
  }

  private async loadArticles(): Promise<void> {
    try {
      const res = await this.articleService.getAll();
      this.articles = (res.data ?? []).filter((a) => a.is_active !== false);
    } catch {
      // non-critical
    }
  }

  addItem(): void {
    this.items.push(
      this.fb.group({
        article_sku: ['', Validators.required],
        expected_qty: [1, [Validators.required, Validators.min(1)]],
        unit_cost: [null],
        notes: [''],
      }),
    );
  }

  removeItem(index: number): void {
    if (this.items.length > 1) this.items.removeAt(index);
  }

  isFieldInvalid(name: string): boolean {
    const f = this.form.get(name);
    return !!(f && f.invalid && (f.dirty || f.touched));
  }

  isItemFieldInvalid(index: number, name: string): boolean {
    const f = this.items.at(index)?.get(name);
    return !!(f && f.invalid && (f.dirty || f.touched));
  }

  getFieldError(name: string): string {
    const f = this.form.get(name);
    if (!f?.errors) return '';
    if (f.errors['required']) return this.t('field_required');
    if (f.errors['maxlength']) return this.t('field_too_long');
    return '';
  }

  getItemFieldError(index: number, name: string): string {
    const f = this.items.at(index)?.get(name);
    if (!f?.errors) return '';
    if (f.errors['required']) return this.t('field_required');
    if (f.errors['min']) return this.t('purchase_orders.error_qty_min');
    return '';
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.isDraftMode) return;

    this.isLoading = true;
    try {
      const raw = this.form.getRawValue();
      const payload = {
        supplier_id: raw.supplier_id,
        expected_date: raw.expected_date || undefined,
        notes: raw.notes || undefined,
        items: raw.items.map((item: any) => ({
          article_sku: item.article_sku,
          expected_qty: Number(item.expected_qty),
          unit_cost: item.unit_cost ? Number(item.unit_cost) : undefined,
          notes: item.notes || undefined,
        })),
      };

      if (this.isEditMode && this.poId) {
        await this.purchaseOrdersService.update(this.poId, payload);
        this.alertService.success(this.t('purchase_orders.updated_success'));
      } else {
        await this.purchaseOrdersService.create(payload);
        this.alertService.success(this.t('purchase_orders.created_success'));
      }
      this.success.emit();
    } catch (error: any) {
      const msg =
        getApiErrorMessage(error) ||
        (this.isEditMode
          ? this.t('purchase_orders.error_updating')
          : this.t('purchase_orders.error_creating'));
      this.alertService.error(msg);
    } finally {
      this.isLoading = false;
    }
  }

  onClose(): void {
    this.resetForm();
    this.closed.emit();
  }
}
