import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Adjustment } from '../../../models/adjustment.model';
import { AdjustmentService } from '../../../services/adjustment.service';
import { AlertService } from '../../../services/extras/alert.service';
import { AuthorizationService } from '../../../services/extras/authorization.service';
import { LanguageService } from '../../../services/extras/language.service';
import { MainLayoutComponent } from '../../layout/main-layout.component';
import { DataExportComponent, DataExportConfig } from '../../shared/data-export/data-export.component';
import { AdjustmentFormComponent } from '../adjustment-form/adjustment-form.component';
import { AdjustmentListComponent } from '../adjustment-list/adjustment-list.component';

@Component({
  selector: 'app-adjustment-management',
  standalone: true,
  imports: [
    CommonModule,
    DataExportComponent,
    MainLayoutComponent,
    AdjustmentListComponent,
    AdjustmentFormComponent
  ],
  templateUrl: './adjustment-management.component.html',
  styleUrl: './adjustment-management.component.css'
})
export class AdjustmentManagementComponent implements OnInit {
  adjustments: Adjustment[] = [];
  isLoading = false;
  isExportDialogOpen = false;
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
    private authorizationService: AuthorizationService,
    private alertService: AlertService,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.loadAdjustments();
  }

  /**
   * Load all adjustments
   */
  async loadAdjustments(): Promise<void> {
    try {
      this.isLoading = true;
      const response = await this.adjustmentService.getAll();
      this.adjustments = response.data || [];
    } catch (error) {
      console.error('Error loading adjustments:', error);
      this.alertService.error(this.t('error_loading_adjustments'));
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
    this.isExportDialogOpen = true;
  }

  closeExportDialog(): void {
    this.isExportDialogOpen = false;
  }

  /**
   * Handle export success
   */
  onExportSuccess(): void {
    this.alertService.success(this.t('export_successful'));
    this.closeExportDialog();
  }

  /**
   * Get translation
   */
  t(key: string, params?: any): string {
    return this.languageService.translate(key);
  }
}