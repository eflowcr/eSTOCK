import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { StockTransfer, StockTransferLine, StockTransferLineInput } from '@app/models/stock-transfer.model';
import { StockTransfersService } from '@app/services/stock-transfers.service';
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
    DrawerComponent,
    ZardButtonComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardInputDirective,
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

  constructor(
    private fb: FormBuilder,
    private stockTransfersService: StockTransfersService,
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
      this.addLine();
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
  }

  removeLine(index: number): void {
    if (this.linesArray.length > 1) {
      this.linesArray.removeAt(index);
    }
  }

  close(): void {
    this.form?.reset({ lines: this.fb.array([]) });
    this.isEditing = false;
    this.closed.emit();
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
