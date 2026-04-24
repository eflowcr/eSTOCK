import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from '@app/models/purchase-order.model';
import { PurchaseOrdersService } from '@app/services/purchase-orders.service';
import { AlertService } from '@app/services/extras/alert.service';
import { AuthorizationService } from '@app/services/extras/authorization.service';
import { LanguageService } from '@app/services/extras/language.service';
import { handleApiError } from '@app/utils';
import { MainLayoutComponent } from '../../layout/main-layout.component';
import { PurchaseOrderFormComponent } from '../purchase-order-form/purchase-order-form.component';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-purchase-order-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MainLayoutComponent,
    PurchaseOrderFormComponent,
    ConfirmationDialogComponent,
  ],
  templateUrl: './purchase-order-detail.component.html',
})
export class PurchaseOrderDetailComponent implements OnInit {
  po: PurchaseOrder | null = null;
  isLoading = false;
  isEditOpen = false;

  // Submit
  confirmSubmitOpen = false;
  isSubmitting = false;

  // Cancel
  confirmCancelOpen = false;
  isCancelling = false;

  // Delete
  confirmDeleteOpen = false;
  isDeleting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private purchaseOrdersService: PurchaseOrdersService,
    private alertService: AlertService,
    private authorizationService: AuthorizationService,
    private languageService: LanguageService,
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadPo(id);
  }

  async loadPo(id: string): Promise<void> {
    this.isLoading = true;
    try {
      const res = await this.purchaseOrdersService.getById(id);
      this.po = res.data ?? null;
    } catch (error: any) {
      this.alertService.error(handleApiError(error, this.t('purchase_orders.error_loading')));
      this.router.navigate(['/purchase-orders']);
    } finally {
      this.isLoading = false;
    }
  }

  reload(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadPo(id);
  }

  hasPermission(resource: string, action: string): boolean {
    return this.authorizationService.hasPermission(resource, action);
  }

  get isDraft(): boolean {
    return this.po?.status === 'draft';
  }

  get canEdit(): boolean {
    return this.isDraft && this.hasPermission('purchase_orders', 'update');
  }

  get canSubmit(): boolean {
    return this.isDraft && this.hasPermission('purchase_orders', 'update');
  }

  get canCancel(): boolean {
    return !!this.po &&
      this.po.status !== 'completed' &&
      this.po.status !== 'cancelled' &&
      this.hasPermission('purchase_orders', 'update');
  }

  get canDelete(): boolean {
    return this.isDraft && this.hasPermission('purchase_orders', 'delete');
  }

  // Edit
  openEdit(): void {
    this.isEditOpen = true;
  }

  closeEdit(): void {
    this.isEditOpen = false;
  }

  onEditSuccess(): void {
    this.closeEdit();
    this.reload();
  }

  // Submit
  openSubmitConfirm(): void {
    this.confirmSubmitOpen = true;
  }

  cancelSubmit(): void {
    this.confirmSubmitOpen = false;
  }

  async confirmSubmit(): Promise<void> {
    if (!this.po) return;
    this.isSubmitting = true;
    try {
      await this.purchaseOrdersService.submit(this.po.id);
      this.alertService.success(this.t('purchase_orders.submitted_success'));
      this.confirmSubmitOpen = false;
      this.reload();
    } catch (error: any) {
      this.alertService.error(handleApiError(error, this.t('purchase_orders.error_submitting')));
    } finally {
      this.isSubmitting = false;
      this.confirmSubmitOpen = false;
    }
  }

  // Cancel
  openCancelConfirm(): void {
    this.confirmCancelOpen = true;
  }

  cancelCancel(): void {
    this.confirmCancelOpen = false;
  }

  async confirmCancel(): Promise<void> {
    if (!this.po) return;
    this.isCancelling = true;
    try {
      await this.purchaseOrdersService.cancel(this.po.id);
      this.alertService.success(this.t('purchase_orders.cancelled_success'));
      this.confirmCancelOpen = false;
      this.reload();
    } catch (error: any) {
      this.alertService.error(handleApiError(error, this.t('purchase_orders.error_cancelling')));
    } finally {
      this.isCancelling = false;
      this.confirmCancelOpen = false;
    }
  }

  // Delete
  openDeleteConfirm(): void {
    this.confirmDeleteOpen = true;
  }

  cancelDelete(): void {
    this.confirmDeleteOpen = false;
  }

  async confirmDelete(): Promise<void> {
    if (!this.po) return;
    this.isDeleting = true;
    try {
      await this.purchaseOrdersService.softDelete(this.po.id);
      this.alertService.success(this.t('purchase_orders.deleted_success'));
      this.router.navigate(['/purchase-orders']);
    } catch (error: any) {
      this.alertService.error(handleApiError(error, this.t('purchase_orders.error_deleting')));
    } finally {
      this.isDeleting = false;
      this.confirmDeleteOpen = false;
    }
  }

  // Helpers
  statusBadgeClass(status: PurchaseOrderStatus): string {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
      case 'submitted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'partial':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }

  discrepancyClass(item: PurchaseOrderItem): string {
    if (item.discrepancy === 0) return 'text-foreground';
    if (item.discrepancy > 0) return 'text-red-600 dark:text-red-400 font-medium'; // missing
    return 'text-amber-600 dark:text-amber-400 font-medium'; // excess
  }

  discrepancyLabel(item: PurchaseOrderItem): string {
    if (item.discrepancy === 0) return '—';
    if (item.discrepancy > 0) return `+${item.discrepancy}`;
    return `${item.discrepancy}`;
  }

  get hasDiscrepancies(): boolean {
    return !!this.po?.items?.some((i) => i.discrepancy !== 0);
  }

  get discrepantItems(): PurchaseOrderItem[] {
    return this.po?.items?.filter((i) => i.discrepancy !== 0) ?? [];
  }
}
