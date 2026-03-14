import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Adjustment } from '../../../models/adjustment.model';
import { AdjustmentReasonCode } from '../../../models/adjustment-reason-code.model';
import { AdjustmentReasonCodesService } from '../../../services/adjustment-reason-codes.service';
import { AdjustmentService } from '../../../services/adjustment.service';
import { AlertService } from '../../../services/extras/alert.service';
import { AuthorizationService } from '../../../services/extras/authorization.service';
import { LanguageService } from '../../../services/extras/language.service';
import { handleApiError } from '@app/utils';
import { ZardDialogService } from '@app/shared/components/dialog';
import { MainLayoutComponent } from '../../layout/main-layout.component';
import { DataExportConfig } from '../../shared/data-export/data-export.component';
import { DataExportContentComponent } from '../../shared/data-export/data-export-content.component';
import { AdjustmentFormComponent } from '../adjustment-form/adjustment-form.component';
import { AdjustmentListComponent } from '../adjustment-list/adjustment-list.component';

@Component({
  selector: 'app-adjustment-management',
  standalone: true,
  imports: [
    CommonModule,
    MainLayoutComponent,
    AdjustmentListComponent,
    AdjustmentFormComponent
  ],
  templateUrl: './adjustment-management.component.html',
  styleUrl: './adjustment-management.component.css'
})
export class AdjustmentManagementComponent implements OnInit {
  adjustments: Adjustment[] = [];
  reasonCodes: AdjustmentReasonCode[] = [];
  isLoading = false;
  isCreateDialogOpen = false;

  // Export configuration
  exportConfig: DataExportConfig = {
    title: 'Exportar Ajustes de Stock',
    endpoint: '/api/adjustments/export',
    data: [],
    filename: 'stock_adjustments_export'
  };

  constructor(
    private adjustmentService: AdjustmentService,
    private adjustmentReasonCodesService: AdjustmentReasonCodesService,
    private authorizationService: AuthorizationService,
    private alertService: AlertService,
    private languageService: LanguageService,
    private dialogService: ZardDialogService
  ) {}

  ngOnInit(): void {
    this.loadReasonCodes();
    this.loadAdjustments();
  }

  async loadReasonCodes(): Promise<void> {
    try {
      const response = await this.adjustmentReasonCodesService.getList();
      this.reasonCodes = response.data || [];
    } catch (error) {
      console.error('Error loading reason codes:', error);
    }
  }

  /**
   * Load all adjustments
   */
  async loadAdjustments(): Promise<void> {
    try {
      this.isLoading = true;
      const response = await this.adjustmentService.getAll();
      this.adjustments = response.data || [];
    } catch (error: any) {
      console.error('Error loading adjustments:', error);
      this.alertService.error(handleApiError(error, this.t('error_loading_adjustments')));
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.authorizationService.isAdmin();
  }

  /**
   * Open create adjustment dialog
   */
  openCreateDialog(): void {
    this.isCreateDialogOpen = true;
  }

  /**
   * Close create adjustment dialog
   */
  closeCreateDialog(): void {
    this.isCreateDialogOpen = false;
  }

  /**
   * Handle adjustment saved event
   */
  onAdjustmentSaved(): void {
    this.isCreateDialogOpen = false;
    this.loadAdjustments();
  }

  openExportDialog(): void {
    this.exportConfig.data = this.adjustments;
    this.dialogService.create({
      zTitle: this.t('export_data'),
      zDescription: this.t('export_description'),
      zContent: DataExportContentComponent,
      zData: {
        config: this.exportConfig,
        onExported: () => this.onExportSuccess(),
      },
      zHideFooter: true,
      zCustomClasses: 'sm:max-w-md',
    });
  }

  onExportSuccess(): void {
    this.alertService.success(this.t('export_successful'));
  }

  /**
   * Get translation
   */
  t(key: string, params?: any): string {
    return this.languageService.translate(key);
  }
}