import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PurchaseOrder, PurchaseOrderStatus } from '@app/models/purchase-order.model';
import { Client } from '@app/models/client.model';
import { PurchaseOrdersService } from '@app/services/purchase-orders.service';
import { ClientsService } from '@app/services/clients.service';
import { AlertService } from '@app/services/extras/alert.service';
import { AuthorizationService } from '@app/services/extras/authorization.service';
import { LanguageService } from '@app/services/extras/language.service';
import { handleApiError } from '@app/utils';
import { MainLayoutComponent } from '../../layout/main-layout.component';
import { PurchaseOrderFormComponent } from '../purchase-order-form/purchase-order-form.component';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-purchase-orders-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MainLayoutComponent,
    PurchaseOrderFormComponent,
    ConfirmationDialogComponent,
  ],
  templateUrl: './purchase-orders-list.component.html',
})
export class PurchaseOrdersListComponent implements OnInit, OnDestroy {
  purchaseOrders: PurchaseOrder[] = [];
  suppliers: Client[] = [];
  isLoading = signal(false);

  // Filters
  statusFilter: PurchaseOrderStatus | '' = '';
  supplierFilter = '';
  searchTerm = '';
  dateFrom = '';
  dateTo = '';

  // Pagination
  page = 1;
  pageSize = 20;
  totalCount = 0;

  // Drawer
  isFormOpen = false;
  selectedPoId: string | undefined = undefined;
  formMode: 'create' | 'edit' = 'create';

  // Delete confirmation
  confirmDeleteOpen = false;
  poToDelete: PurchaseOrder | null = null;
  isDeleting = false;

  // Submit confirmation
  confirmSubmitOpen = false;
  poToSubmit: PurchaseOrder | null = null;
  isSubmitting = false;

  // Cancel confirmation
  confirmCancelOpen = false;
  poToCancel: PurchaseOrder | null = null;
  isCancelling = false;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private purchaseOrdersService: PurchaseOrdersService,
    private clientsService: ClientsService,
    private alertService: AlertService,
    private authorizationService: AuthorizationService,
    private languageService: LanguageService,
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  ngOnInit(): void {
    this.restoreFilters();
    this.loadSuppliers();
    this.loadPurchaseOrders();
  }

  ngOnDestroy(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  private restoreFilters(): void {
    try {
      const saved = localStorage.getItem('po_list_filters');
      if (saved) {
        const f = JSON.parse(saved);
        this.statusFilter = f.statusFilter ?? '';
        this.supplierFilter = f.supplierFilter ?? '';
        this.searchTerm = f.searchTerm ?? '';
        this.dateFrom = f.dateFrom ?? '';
        this.dateTo = f.dateTo ?? '';
        this.pageSize = f.pageSize ?? 20;
      }
    } catch {
      // ignore
    }
  }

  private persistFilters(): void {
    try {
      localStorage.setItem(
        'po_list_filters',
        JSON.stringify({
          statusFilter: this.statusFilter,
          supplierFilter: this.supplierFilter,
          searchTerm: this.searchTerm,
          dateFrom: this.dateFrom,
          dateTo: this.dateTo,
          pageSize: this.pageSize,
        }),
      );
    } catch {
      // ignore
    }
  }

  async loadSuppliers(): Promise<void> {
    try {
      const res = await this.clientsService.list({ type: 'supplier', is_active: true });
      const both = await this.clientsService.list({ type: 'both', is_active: true });
      this.suppliers = [...(res.data ?? []), ...(both.data ?? [])];
    } catch {
      // non-critical — silently ignore
    }
  }

  async loadPurchaseOrders(): Promise<void> {
    this.isLoading.set(true);
    this.persistFilters();
    try {
      const filters: Record<string, any> = {
        page: this.page,
        page_size: this.pageSize,
      };
      if (this.statusFilter) filters['status'] = this.statusFilter;
      if (this.supplierFilter) filters['supplier_id'] = this.supplierFilter;
      if (this.searchTerm) filters['search'] = this.searchTerm;
      if (this.dateFrom) filters['date_from'] = this.dateFrom;
      if (this.dateTo) filters['date_to'] = this.dateTo;

      const res = await this.purchaseOrdersService.list(filters as any);
      this.purchaseOrders = res.data ?? [];
      this.totalCount = (res as any).meta?.total ?? this.purchaseOrders.length;
    } catch (error: any) {
      this.alertService.error(handleApiError(error, this.t('purchase_orders.error_loading')));
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearchChange(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.page = 1;
      this.loadPurchaseOrders();
    }, 300);
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadPurchaseOrders();
  }

  // Pagination
  get pageEnd(): number {
    return Math.min(this.page * this.pageSize, this.totalCount);
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  get hasPrev(): boolean {
    return this.page > 1;
  }

  get hasNext(): boolean {
    return this.page < this.totalPages;
  }

  prevPage(): void {
    if (this.hasPrev) {
      this.page--;
      this.loadPurchaseOrders();
    }
  }

  nextPage(): void {
    if (this.hasNext) {
      this.page++;
      this.loadPurchaseOrders();
    }
  }

  // Form drawer
  openCreateForm(): void {
    this.formMode = 'create';
    this.selectedPoId = undefined;
    this.isFormOpen = true;
  }

  openEditForm(po: PurchaseOrder): void {
    this.formMode = 'edit';
    this.selectedPoId = po.id;
    this.isFormOpen = true;
  }

  closeForm(): void {
    this.isFormOpen = false;
    this.selectedPoId = undefined;
  }

  onFormSuccess(): void {
    this.closeForm();
    this.loadPurchaseOrders();
  }

  // Delete
  openDeleteConfirm(po: PurchaseOrder): void {
    this.poToDelete = po;
    this.confirmDeleteOpen = true;
  }

  cancelDelete(): void {
    this.confirmDeleteOpen = false;
    this.poToDelete = null;
  }

  async confirmDelete(): Promise<void> {
    if (!this.poToDelete) return;
    this.isDeleting = true;
    try {
      await this.purchaseOrdersService.softDelete(this.poToDelete.id);
      this.alertService.success(this.t('purchase_orders.deleted_success'));
      this.loadPurchaseOrders();
    } catch (error: any) {
      this.alertService.error(handleApiError(error, this.t('purchase_orders.error_deleting')));
    } finally {
      this.isDeleting = false;
      this.confirmDeleteOpen = false;
      this.poToDelete = null;
    }
  }

  // Submit
  openSubmitConfirm(po: PurchaseOrder): void {
    this.poToSubmit = po;
    this.confirmSubmitOpen = true;
  }

  cancelSubmit(): void {
    this.confirmSubmitOpen = false;
    this.poToSubmit = null;
  }

  async confirmSubmit(): Promise<void> {
    if (!this.poToSubmit) return;
    this.isSubmitting = true;
    try {
      await this.purchaseOrdersService.submit(this.poToSubmit.id);
      this.alertService.success(this.t('purchase_orders.submitted_success'));
      this.loadPurchaseOrders();
    } catch (error: any) {
      this.alertService.error(handleApiError(error, this.t('purchase_orders.error_submitting')));
    } finally {
      this.isSubmitting = false;
      this.confirmSubmitOpen = false;
      this.poToSubmit = null;
    }
  }

  // Cancel
  openCancelConfirm(po: PurchaseOrder): void {
    this.poToCancel = po;
    this.confirmCancelOpen = true;
  }

  cancelCancel(): void {
    this.confirmCancelOpen = false;
    this.poToCancel = null;
  }

  async confirmCancel(): Promise<void> {
    if (!this.poToCancel) return;
    this.isCancelling = true;
    try {
      await this.purchaseOrdersService.cancel(this.poToCancel.id);
      this.alertService.success(this.t('purchase_orders.cancelled_success'));
      this.loadPurchaseOrders();
    } catch (error: any) {
      this.alertService.error(handleApiError(error, this.t('purchase_orders.error_cancelling')));
    } finally {
      this.isCancelling = false;
      this.confirmCancelOpen = false;
      this.poToCancel = null;
    }
  }

  // Helpers
  hasPermission(resource: string, action: string): boolean {
    return this.authorizationService.hasPermission(resource, action);
  }

  canEdit(po: PurchaseOrder): boolean {
    return po.status === 'draft';
  }

  canSubmit(po: PurchaseOrder): boolean {
    return po.status === 'draft';
  }

  canCancel(po: PurchaseOrder): boolean {
    return po.status !== 'completed' && po.status !== 'cancelled';
  }

  canDelete(po: PurchaseOrder): boolean {
    return po.status === 'draft';
  }

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

  statusLabel(status: PurchaseOrderStatus): string {
    return this.t(`purchase_orders.status.${status}`);
  }

  itemCount(po: PurchaseOrder): number {
    return po.items?.length ?? 0;
  }
}
