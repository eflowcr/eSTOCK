import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PresentationConversion } from '@app/models/presentation-conversion.model';
import { PresentationType } from '@app/models/presentation-type.model';
import { PresentationConversionsService } from '@app/services/presentation-conversions.service';
import { PresentationTypesService } from '@app/services/presentation-types.service';
import { LanguageService } from '@app/services/extras/language.service';
import { AlertService } from '@app/services/extras/alert.service';
import { handleApiError } from '@app/utils';
import { MainLayoutComponent } from '@app/components/layout/main-layout.component';
import { PresentationConversionFormComponent } from '../presentation-conversion-form/presentation-conversion-form.component';
import { PresentationConversionListComponent } from '../presentation-conversion-list/presentation-conversion-list.component';

@Component({
  selector: 'app-presentation-conversions-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MainLayoutComponent,
    PresentationConversionListComponent,
    PresentationConversionFormComponent,
  ],
  templateUrl: './presentation-conversions-management.component.html',
  styleUrls: ['./presentation-conversions-management.component.css'],
})
export class PresentationConversionsManagementComponent implements OnInit {
  conversions: PresentationConversion[] = [];
  presentationTypes: PresentationType[] = [];
  isLoading = false;
  formOpen = false;
  selectedConversion: PresentationConversion | null = null;

  convertQuantity: number | null = null;
  convertFromId = '';
  convertToId = '';
  convertResult: number | null = null;
  /** Shown when user tried to convert but no rule exists for the selected from/to */
  noRuleForConversion = false;
  /** When opening create from "no rule" feedback, pre-fill form with these */
  preselectedFromId = '';
  preselectedToId = '';

  constructor(
    private conversionsService: PresentationConversionsService,
    private presentationTypesService: PresentationTypesService,
    private languageService: LanguageService,
    private alertService: AlertService
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  getTypeName(id: string): string {
    return this.presentationTypes.find((pt) => pt.id === id)?.name ?? this.presentationTypes.find((pt) => pt.id === id)?.code ?? id;
  }

  async ngOnInit(): Promise<void> {
    await this.loadPresentationTypes();
    await this.loadConversions();
  }

  async loadPresentationTypes(): Promise<void> {
    try {
      const res = await this.presentationTypesService.getList();
      if (res?.result?.success && Array.isArray(res.data)) {
        this.presentationTypes = res.data;
      }
    } catch (err: unknown) {
      this.alertService.error(this.t('error'), handleApiError(err, this.t('failed_to_load_presentation_types')));
    }
  }

  async loadConversions(): Promise<void> {
    try {
      this.isLoading = true;
      const res = await this.conversionsService.getListAdmin();
      if (res?.result?.success && Array.isArray(res.data)) {
        this.conversions = res.data;
      }
    } catch (err: unknown) {
      this.alertService.error(this.t('error'), handleApiError(err, this.t('failed_to_load_presentation_conversions')));
    } finally {
      this.isLoading = false;
    }
  }

  openCreate(): void {
    this.selectedConversion = null;
    this.preselectedFromId = '';
    this.preselectedToId = '';
    this.formOpen = true;
  }

  /** Open create form with from/to pre-filled (e.g. from "no rule" feedback). */
  openCreateWithPreselection(fromId: string, toId: string): void {
    this.noRuleForConversion = false;
    this.selectedConversion = null;
    this.preselectedFromId = fromId;
    this.preselectedToId = toId;
    this.formOpen = true;
  }

  dismissNoRuleFeedback(): void {
    this.noRuleForConversion = false;
  }

  openEdit(c: PresentationConversion): void {
    this.selectedConversion = c;
    this.formOpen = true;
  }

  onSuccess(): void {
    this.loadConversions();
  }

  closeForm(): void {
    this.formOpen = false;
    this.selectedConversion = null;
    this.preselectedFromId = '';
    this.preselectedToId = '';
  }

  async deleteConversion(c: PresentationConversion): Promise<void> {
    if (!confirm(this.t('delete_presentation_conversion_confirm'))) return;
    try {
      const res = await this.conversionsService.delete(c.id);
      if (res?.result?.success) {
        this.alertService.success(this.t('success'), this.t('presentation_conversion_deleted'));
        this.loadConversions();
      } else {
        this.alertService.error(this.t('error'), res?.result?.message ?? this.t('failed_to_delete_presentation_conversion'));
      }
    } catch (err: unknown) {
      this.alertService.error(this.t('error'), handleApiError(err, this.t('failed_to_delete_presentation_conversion')));
    }
  }

  runConvert(): void {
    this.convertResult = null;
    this.noRuleForConversion = false;
    const qty = this.convertQuantity;
    if (qty == null || qty <= 0 || !this.convertFromId || !this.convertToId) return;
    if (this.convertFromId === this.convertToId) {
      this.convertResult = qty;
      return;
    }
    const rule = this.conversions.find(
      (c) => c.is_active && c.from_presentation_type_id === this.convertFromId && c.to_presentation_type_id === this.convertToId
    );
    if (rule) {
      this.convertResult = qty * rule.conversion_factor;
      return;
    }
    const reverseRule = this.conversions.find(
      (c) => c.is_active && c.from_presentation_type_id === this.convertToId && c.to_presentation_type_id === this.convertFromId
    );
    if (reverseRule) {
      this.convertResult = qty / reverseRule.conversion_factor;
      return;
    }
    this.noRuleForConversion = true;
  }
}
