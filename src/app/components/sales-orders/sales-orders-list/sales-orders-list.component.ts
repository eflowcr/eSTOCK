import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SalesOrder, SalesOrderStatus } from '@app/models/sales-order.model';
import { Client } from '@app/models/client.model';
import { SalesOrdersService } from '@app/services/sales-orders.service';
import { ClientsService } from '@app/services/clients.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { LoadingService } from '@app/services/extras/loading.service';
import { handleApiError } from '@app/utils';

@Component({
  selector: 'app-sales-orders-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="flex flex-col gap-4">
      <!-- Filters Row -->
      <div class="flex flex-wrap items-center gap-3">
        <input
          type="text"
          [(ngModel)]="searchQuery"
          (ngModelChange)="onSearchChange()"
          [placeholder]="t('sales_orders.search_placeholder')"
          class="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-56"
        />
        <select
          [(ngModel)]="statusFilter"
          (ngModelChange)="onFilterChange()"
          class="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">{{ t('sales_orders.all_statuses') }}</option>
          <option value="draft">{{ t('sales_orders.status_draft') }}</option>
          <option value="submitted">{{ t('sales_orders.status_submitted') }}</option>
          <option value="partial">{{ t('sales_orders.status_partial') }}</option>
          <option value="completed">{{ t('sales_orders.status_completed') }}</option>
          <option value="cancelled">{{ t('sales_orders.status_cancelled') }}</option>
        </select>
        <select
          [(ngModel)]="customerFilter"
          (ngModelChange)="onFilterChange()"
          class="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-48"
        >
          <option value="">{{ t('sales_orders.all_customers') }}</option>
          <option *ngFor="let c of customers" [value]="c.id">{{ c.name }}</option>
        </select>
        <button
          (click)="onNewOrder()"
          class="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          {{ t('sales_orders.new') }}
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading" class="flex items-center justify-center py-12">
        <div class="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        <span class="ml-2 text-sm text-muted-foreground">{{ t('loading') }}</span>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading && filteredOrders.length === 0" class="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <svg class="h-12 w-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
        </svg>
        <p class="text-sm">{{ t('sales_orders.empty') }}</p>
      </div>

      <!-- Table -->
      <div *ngIf="!isLoading && filteredOrders.length > 0" class="rounded-lg border border-border bg-card overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border bg-muted/50">
              <th class="px-4 py-3 text-left font-medium text-muted-foreground">{{ t('sales_orders.col_number') }}</th>
              <th class="px-4 py-3 text-left font-medium text-muted-foreground">{{ t('sales_orders.col_customer') }}</th>
              <th class="px-4 py-3 text-left font-medium text-muted-foreground">{{ t('sales_orders.col_status') }}</th>
              <th class="px-4 py-3 text-left font-medium text-muted-foreground">{{ t('sales_orders.col_expected_date') }}</th>
              <th class="px-4 py-3 text-left font-medium text-muted-foreground">{{ t('sales_orders.col_created') }}</th>
              <th class="px-4 py-3 text-left font-medium text-muted-foreground">{{ t('sales_orders.col_actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              *ngFor="let order of filteredOrders"
              class="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
            >
              <td class="px-4 py-3 font-mono text-xs font-medium">
                <a [routerLink]="['/sales-orders', order.id]" class="text-primary hover:underline">
                  {{ order.so_number }}
                </a>
              </td>
              <td class="px-4 py-3 text-muted-foreground">
                {{ order.customer?.name || getCustomerName(order.customer_id) }}
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border"
                  [ngClass]="getStatusClass(order.status)">
                  {{ t('sales_orders.status_' + order.status) }}
                </span>
              </td>
              <td class="px-4 py-3 text-muted-foreground text-xs">
                {{ order.expected_date ? formatDate(order.expected_date) : '—' }}
              </td>
              <td class="px-4 py-3 text-muted-foreground text-xs">
                {{ formatDate(order.created_at) }}
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-1">
                  <!-- View -->
                  <a [routerLink]="['/sales-orders', order.id]"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    [title]="t('view')">
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                  </a>
                  <!-- Edit (draft only) -->
                  <button *ngIf="order.status === 'draft'"
                    (click)="onEdit(order)"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    [title]="t('edit')">
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                  </button>
                  <!-- Submit (draft only) -->
                  <button *ngIf="order.status === 'draft'"
                    (click)="onSubmit(order)"
                    class="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 text-xs text-emerald-700 hover:bg-emerald-100 transition-colors dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                    [title]="t('sales_orders.submit')">
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    {{ t('sales_orders.submit') }}
                  </button>
                  <!-- Cancel -->
                  <button *ngIf="order.status === 'draft' || order.status === 'submitted'"
                    (click)="onCancel(order)"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                    [title]="t('cancel')">
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                  <!-- Delete (draft only) -->
                  <button *ngIf="order.status === 'draft'"
                    (click)="onDelete(order)"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                    [title]="t('delete')">
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class SalesOrdersListComponent implements OnInit {
  @Input() orders: SalesOrder[] = [];
  @Input() isLoading = false;
  @Input() customers: Client[] = [];
  @Output() newOrder = new EventEmitter<void>();
  @Output() edit = new EventEmitter<SalesOrder>();
  @Output() refresh = new EventEmitter<void>();

  searchQuery = '';
  statusFilter = '';
  customerFilter = '';

  private customerMap = new Map<string, string>();

  constructor(
    private salesOrdersService: SalesOrdersService,
    private alertService: AlertService,
    private languageService: LanguageService,
    private loadingService: LoadingService,
  ) {}

  ngOnInit(): void {
    this.buildCustomerMap();
  }

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  get filteredOrders(): SalesOrder[] {
    let list = this.orders;
    if (this.statusFilter) {
      list = list.filter((o) => o.status === this.statusFilter);
    }
    if (this.customerFilter) {
      list = list.filter((o) => o.customer_id === this.customerFilter);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(
        (o) =>
          o.so_number.toLowerCase().includes(q) ||
          (o.customer?.name || '').toLowerCase().includes(q),
      );
    }
    return list;
  }

  onSearchChange(): void {}
  onFilterChange(): void {}

  onNewOrder(): void {
    this.newOrder.emit();
  }

  onEdit(order: SalesOrder): void {
    this.edit.emit(order);
  }

  async onSubmit(order: SalesOrder): Promise<void> {
    if (!confirm(this.t('sales_orders.confirm_submit'))) return;
    try {
      this.loadingService.show();
      const resp = await this.salesOrdersService.submit(order.id);
      if (resp.result.success) {
        this.alertService.success(this.t('sales_orders.submitted_ok'), this.t('success'));
        this.refresh.emit();
      } else {
        this.alertService.error(resp.result.message || this.t('operation_failed'), this.t('error'));
      }
    } catch (err: any) {
      this.alertService.error(handleApiError(err, this.t('sales_orders.submit_error')), this.t('error'));
    } finally {
      this.loadingService.hide();
    }
  }

  async onCancel(order: SalesOrder): Promise<void> {
    if (!confirm(this.t('sales_orders.confirm_cancel'))) return;
    try {
      this.loadingService.show();
      const resp = await this.salesOrdersService.cancel(order.id);
      if (resp.result.success) {
        this.alertService.success(this.t('sales_orders.cancelled_ok'), this.t('success'));
        this.refresh.emit();
      } else {
        this.alertService.error(resp.result.message || this.t('operation_failed'), this.t('error'));
      }
    } catch (err: any) {
      this.alertService.error(handleApiError(err, this.t('sales_orders.cancel_error')), this.t('error'));
    } finally {
      this.loadingService.hide();
    }
  }

  async onDelete(order: SalesOrder): Promise<void> {
    if (!confirm(this.t('sales_orders.confirm_delete'))) return;
    try {
      this.loadingService.show();
      const resp = await this.salesOrdersService.softDelete(order.id);
      if (resp.result.success) {
        this.alertService.success(this.t('sales_orders.deleted_ok'), this.t('success'));
        this.refresh.emit();
      } else {
        this.alertService.error(resp.result.message || this.t('operation_failed'), this.t('error'));
      }
    } catch (err: any) {
      this.alertService.error(handleApiError(err, this.t('sales_orders.delete_error')), this.t('error'));
    } finally {
      this.loadingService.hide();
    }
  }

  getStatusClass(status: SalesOrderStatus): string {
    const map: Record<SalesOrderStatus, string> = {
      draft: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
      submitted: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700',
      partial: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700',
      completed: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
      cancelled: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700',
    };
    return map[status] ?? map['draft'];
  }

  getCustomerName(customerId: string): string {
    return this.customerMap.get(customerId) || customerId;
  }

  private buildCustomerMap(): void {
    this.customers.forEach((c) => this.customerMap.set(c.id, c.name));
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
