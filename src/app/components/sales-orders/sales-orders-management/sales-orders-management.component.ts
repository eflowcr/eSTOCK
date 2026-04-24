import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MainLayoutComponent } from '@app/components/layout/main-layout.component';
import { SalesOrder } from '@app/models/sales-order.model';
import { Client } from '@app/models/client.model';
import { SalesOrdersService } from '@app/services/sales-orders.service';
import { ClientsService } from '@app/services/clients.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { handleApiError } from '@app/utils';
import { SalesOrdersListComponent } from '../sales-orders-list/sales-orders-list.component';
import { SalesOrderFormComponent } from '../sales-order-form/sales-order-form.component';

@Component({
  selector: 'app-sales-orders-management',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MainLayoutComponent,
    SalesOrdersListComponent,
    SalesOrderFormComponent,
  ],
  template: `
    <app-main-layout>
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold">{{ t('sales_orders.title') }}</h1>
          <p class="text-sm text-muted-foreground">{{ t('sales_orders.subtitle') }}</p>
        </div>
      </div>

      <!-- Summary Badges -->
      <div class="flex flex-wrap gap-3">
        <div class="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3 min-w-[120px]">
          <div class="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
            <svg class="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
          </div>
          <div>
            <p class="text-xs text-muted-foreground">{{ t('sales_orders.stat_draft') }}</p>
            <p class="text-lg font-semibold">{{ draftCount }}</p>
          </div>
        </div>
        <div class="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3 min-w-[120px]">
          <div class="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30">
            <svg class="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <p class="text-xs text-muted-foreground">{{ t('sales_orders.stat_submitted') }}</p>
            <p class="text-lg font-semibold">{{ submittedCount }}</p>
          </div>
        </div>
        <div class="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3 min-w-[120px]">
          <div class="flex h-8 w-8 items-center justify-center rounded-md bg-green-100 dark:bg-green-900/30">
            <svg class="h-4 w-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <div>
            <p class="text-xs text-muted-foreground">{{ t('sales_orders.stat_completed') }}</p>
            <p class="text-lg font-semibold">{{ completedCount }}</p>
          </div>
        </div>
        <div class="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3 min-w-[120px]">
          <div class="flex h-8 w-8 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30">
            <svg class="h-4 w-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <div>
            <p class="text-xs text-muted-foreground">{{ t('sales_orders.stat_partial') }}</p>
            <p class="text-lg font-semibold">{{ partialCount }}</p>
          </div>
        </div>
      </div>

      <!-- List -->
      <app-sales-orders-list
        [orders]="orders"
        [isLoading]="isLoading"
        [customers]="customers"
        (newOrder)="openCreateForm()"
        (edit)="handleEdit($event)"
        (refresh)="load()"
      ></app-sales-orders-list>
    </app-main-layout>

    <!-- Create Drawer -->
    <app-sales-order-form
      *ngIf="isCreateOpen"
      [isOpen]="isCreateOpen"
      [order]="null"
      (success)="onCreated()"
      (cancel)="isCreateOpen = false"
    ></app-sales-order-form>

    <!-- Edit Drawer -->
    <app-sales-order-form
      *ngIf="isEditOpen && editingOrder"
      [isOpen]="isEditOpen"
      [order]="editingOrder"
      (success)="onUpdated()"
      (cancel)="closeEdit()"
    ></app-sales-order-form>
  `,
})
export class SalesOrdersManagementComponent implements OnInit {
  orders: SalesOrder[] = [];
  customers: Client[] = [];
  isLoading = false;
  isCreateOpen = false;
  isEditOpen = false;
  editingOrder: SalesOrder | null = null;

  constructor(
    private salesOrdersService: SalesOrdersService,
    private clientsService: ClientsService,
    private alertService: AlertService,
    private languageService: LanguageService,
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  get draftCount(): number {
    return this.orders.filter((o) => o.status === 'draft').length;
  }
  get submittedCount(): number {
    return this.orders.filter((o) => o.status === 'submitted').length;
  }
  get completedCount(): number {
    return this.orders.filter((o) => o.status === 'completed').length;
  }
  get partialCount(): number {
    return this.orders.filter((o) => o.status === 'partial').length;
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([this.load(), this.loadCustomers()]);
  }

  async load(): Promise<void> {
    this.isLoading = true;
    try {
      const resp = await this.salesOrdersService.list();
      if (resp.result.success) {
        this.orders = resp.data || [];
      } else {
        this.alertService.error(resp.result.message || this.t('operation_failed'), this.t('error'));
      }
    } catch (err: any) {
      this.alertService.error(handleApiError(err, this.t('sales_orders.load_error')), this.t('error'));
    } finally {
      this.isLoading = false;
    }
  }

  async loadCustomers(): Promise<void> {
    try {
      const resp = await this.clientsService.list({ type: 'customer', is_active: true });
      if (resp.result.success) {
        this.customers = resp.data || [];
      }
    } catch {
      // non-critical
    }
  }

  openCreateForm(): void {
    this.isCreateOpen = true;
  }

  handleEdit(order: SalesOrder): void {
    this.editingOrder = order;
    this.isEditOpen = true;
  }

  closeEdit(): void {
    this.isEditOpen = false;
    this.editingOrder = null;
  }

  onCreated(): void {
    this.isCreateOpen = false;
    this.load();
    this.alertService.success(this.t('sales_orders.created_ok'), this.t('success'));
  }

  onUpdated(): void {
    this.closeEdit();
    this.load();
    this.alertService.success(this.t('sales_orders.updated_ok'), this.t('success'));
  }
}
