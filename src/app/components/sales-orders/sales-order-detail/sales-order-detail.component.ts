import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MainLayoutComponent } from '@app/components/layout/main-layout.component';
import { SalesOrder, SalesOrderStatus } from '@app/models/sales-order.model';
import { DeliveryNote } from '@app/models/delivery-note.model';
import { Backorder } from '@app/models/backorder.model';
import { SalesOrdersService } from '@app/services/sales-orders.service';
import { DeliveryNotesService } from '@app/services/delivery-notes.service';
import { BackordersService } from '@app/services/backorders.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { LoadingService } from '@app/services/extras/loading.service';
import { handleApiError } from '@app/utils';
import { SalesOrderFormComponent } from '../sales-order-form/sales-order-form.component';

@Component({
  selector: 'app-sales-order-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, MainLayoutComponent, SalesOrderFormComponent],
  template: `
    <app-main-layout>
      <!-- Back button + Page Header -->
      <div class="flex items-center gap-3">
        <button (click)="goBack()"
          class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent transition-colors">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
        </button>
        <div class="flex-1">
          <h1 class="text-xl font-semibold">
            {{ order ? order.so_number : t('loading') }}
          </h1>
          <p class="text-sm text-muted-foreground">{{ t('sales_orders.detail_subtitle') }}</p>
        </div>
        <!-- Actions -->
        <div *ngIf="order" class="flex items-center gap-2">
          <button *ngIf="order.status === 'draft'" (click)="openEditForm()"
            class="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-sm text-foreground hover:bg-accent transition-colors">
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            {{ t('edit') }}
          </button>
          <button *ngIf="order.status === 'draft'" (click)="onSubmit()"
            class="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm">
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            {{ t('sales_orders.submit') }}
          </button>
          <button *ngIf="order.status === 'draft' || order.status === 'submitted'" (click)="onCancel()"
            class="inline-flex h-8 items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-3 text-sm text-destructive hover:bg-destructive/10 transition-colors">
            {{ t('cancel') }}
          </button>
          <button *ngIf="order.status === 'draft'" (click)="onDelete()"
            class="inline-flex h-8 items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-3 text-sm text-destructive hover:bg-destructive/10 transition-colors">
            {{ t('delete') }}
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading && !order" class="flex items-center justify-center py-20">
        <div class="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        <span class="ml-2 text-sm text-muted-foreground">{{ t('loading') }}</span>
      </div>

      <!-- Content -->
      <div *ngIf="order" class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <!-- Left: Main info -->
        <div class="lg:col-span-2 flex flex-col gap-4">
          <!-- Header Card -->
          <div class="rounded-lg border border-border bg-card p-5 flex flex-col gap-4">
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div class="flex flex-col gap-0.5">
                <span class="text-xs text-muted-foreground">{{ t('sales_orders.col_number') }}</span>
                <span class="text-sm font-mono font-medium">{{ order.so_number }}</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-xs text-muted-foreground">{{ t('sales_orders.col_status') }}</span>
                <span class="inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium border"
                  [ngClass]="getStatusClass(order.status)">
                  {{ t('sales_orders.status_' + order.status) }}
                </span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-xs text-muted-foreground">{{ t('sales_orders.expected_date') }}</span>
                <span class="text-sm">{{ order.expected_date ? formatDate(order.expected_date) : '—' }}</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-xs text-muted-foreground">{{ t('sales_orders.col_created') }}</span>
                <span class="text-sm">{{ formatDateTime(order.created_at) }}</span>
              </div>
              <div *ngIf="order.submitted_at" class="flex flex-col gap-0.5">
                <span class="text-xs text-muted-foreground">{{ t('sales_orders.submitted_at') }}</span>
                <span class="text-sm">{{ formatDateTime(order.submitted_at) }}</span>
              </div>
              <div *ngIf="order.completed_at" class="flex flex-col gap-0.5">
                <span class="text-xs text-muted-foreground">{{ t('sales_orders.completed_at') }}</span>
                <span class="text-sm">{{ formatDateTime(order.completed_at) }}</span>
              </div>
              <div *ngIf="order.cancelled_at" class="flex flex-col gap-0.5">
                <span class="text-xs text-muted-foreground">{{ t('sales_orders.cancelled_at') }}</span>
                <span class="text-sm text-destructive">{{ formatDateTime(order.cancelled_at) }}</span>
              </div>
            </div>
            <div *ngIf="order.notes" class="pt-1 border-t border-border">
              <span class="text-xs text-muted-foreground">{{ t('sales_orders.notes') }}</span>
              <p class="text-sm mt-0.5">{{ order.notes }}</p>
            </div>
          </div>

          <!-- Items Table -->
          <div class="rounded-lg border border-border bg-card overflow-hidden">
            <div class="px-5 py-3 border-b border-border">
              <h3 class="text-sm font-medium">{{ t('sales_orders.items') }}</h3>
            </div>
            <div *ngIf="!order.items || order.items.length === 0" class="px-5 py-8 text-center text-sm text-muted-foreground">
              {{ t('sales_orders.no_items') }}
            </div>
            <table *ngIf="order.items && order.items.length > 0" class="w-full text-sm">
              <thead>
                <tr class="border-b border-border bg-muted/30">
                  <th class="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">{{ t('sales_orders.sku') }}</th>
                  <th class="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs">{{ t('sales_orders.expected_qty') }}</th>
                  <th class="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs">{{ t('sales_orders.picked_qty') }}</th>
                  <th class="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs">{{ t('sales_orders.unit_price') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of order.items" class="border-b border-border last:border-0">
                  <td class="px-4 py-2.5 font-mono text-xs">{{ item.article_sku }}</td>
                  <td class="px-4 py-2.5 text-right">{{ item.expected_qty | number:'1.0-3' }}</td>
                  <td class="px-4 py-2.5 text-right">
                    <span [ngClass]="item.picked_qty < item.expected_qty && order.status !== 'draft' ? 'text-amber-600' : ''">
                      {{ item.picked_qty | number:'1.0-3' }}
                    </span>
                  </td>
                  <td class="px-4 py-2.5 text-right text-muted-foreground">
                    {{ item.unit_price != null ? ('$' + (item.unit_price | number:'1.2-2')) : '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Delivery Notes Section -->
          <div *ngIf="order.status === 'completed' || order.status === 'partial'"
            class="rounded-lg border border-border bg-card overflow-hidden">
            <div class="px-5 py-3 border-b border-border flex items-center justify-between">
              <h3 class="text-sm font-medium">{{ t('sales_orders.delivery_notes') }}</h3>
              <span *ngIf="deliveryNotes.length" class="text-xs text-muted-foreground">{{ deliveryNotes.length }}</span>
            </div>
            <div *ngIf="loadingDNs" class="px-5 py-6 text-center">
              <div class="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
            </div>
            <div *ngIf="!loadingDNs && deliveryNotes.length === 0" class="px-5 py-6 text-center text-sm text-muted-foreground">
              {{ t('sales_orders.no_delivery_notes') }}
            </div>
            <ul *ngIf="!loadingDNs && deliveryNotes.length > 0" class="divide-y divide-border">
              <li *ngFor="let dn of deliveryNotes" class="flex items-center gap-3 px-5 py-3">
                <svg class="h-4 w-4 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <a [routerLink]="['/delivery-notes', dn.id]"
                  class="text-sm font-medium text-primary hover:underline font-mono">
                  {{ dn.dn_number }}
                </a>
                <span class="text-xs text-muted-foreground ml-auto">{{ formatDate(dn.created_at) }}</span>
              </li>
            </ul>
          </div>

          <!-- Backorders Section -->
          <div *ngIf="backorders.length > 0"
            class="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10 overflow-hidden">
            <div class="px-5 py-3 border-b border-amber-200 dark:border-amber-800">
              <h3 class="text-sm font-medium text-amber-800 dark:text-amber-400">
                {{ t('sales_orders.backorders_generated') }}
              </h3>
              <p class="text-xs text-amber-700 dark:text-amber-500 mt-0.5">{{ t('sales_orders.backorders_hint') }}</p>
            </div>
            <ul class="divide-y divide-amber-100 dark:divide-amber-900">
              <li *ngFor="let bo of backorders" class="flex items-center gap-3 px-5 py-3">
                <svg class="h-4 w-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
                <span class="text-sm font-mono text-amber-800 dark:text-amber-300">{{ bo.article_sku }}</span>
                <span class="text-xs text-amber-700 dark:text-amber-400">
                  {{ t('sales_orders.remaining_qty') }}: {{ bo.remaining_qty | number:'1.0-3' }}
                </span>
                <span class="ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-xs border"
                  [ngClass]="getBackorderStatusClass(bo.status)">
                  {{ bo.status }}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Right: Sidebar cards -->
        <div class="flex flex-col gap-4">
          <!-- Customer Card -->
          <div class="rounded-lg border border-border bg-card p-5">
            <h3 class="text-sm font-medium mb-3">{{ t('sales_orders.customer') }}</h3>
            <div class="flex flex-col gap-2 text-sm">
              <div class="flex items-center gap-2">
                <svg class="h-4 w-4 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
                <span class="font-medium">{{ order.customer?.name || order.customer_id }}</span>
              </div>
              <div *ngIf="order.customer?.code" class="text-xs text-muted-foreground pl-6">
                {{ t('sales_orders.customer_code') }}: {{ order.customer?.code }}
              </div>
            </div>
          </div>

          <!-- Linked Picking Task -->
          <div class="rounded-lg border border-border bg-card p-5">
            <h3 class="text-sm font-medium mb-3">{{ t('sales_orders.picking_task') }}</h3>
            <div *ngIf="!order.picking_task_id" class="text-sm text-muted-foreground">
              {{ order.status === 'draft' ? t('sales_orders.picking_not_created_yet') : t('sales_orders.no_picking_task') }}
            </div>
            <a *ngIf="order.picking_task_id"
              [routerLink]="['/picking-tasks']"
              [queryParams]="{ search: order.picking_task_id }"
              class="flex items-center gap-2 text-sm text-primary hover:underline">
              <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
              </svg>
              <span class="font-mono text-xs">{{ order.picking_task_id }}</span>
            </a>
          </div>

          <!-- Timeline -->
          <div class="rounded-lg border border-border bg-card p-5">
            <h3 class="text-sm font-medium mb-3">{{ t('sales_orders.timeline') }}</h3>
            <ol class="relative border-l border-border ml-2 space-y-4">
              <li class="ml-4">
                <div class="absolute -left-1.5 h-3 w-3 rounded-full border border-background bg-primary"></div>
                <p class="text-xs font-medium">{{ t('sales_orders.timeline_created') }}</p>
                <p class="text-xs text-muted-foreground">{{ formatDateTime(order.created_at) }}</p>
              </li>
              <li *ngIf="order.submitted_at" class="ml-4">
                <div class="absolute -left-1.5 h-3 w-3 rounded-full border border-background bg-blue-500"></div>
                <p class="text-xs font-medium">{{ t('sales_orders.timeline_submitted') }}</p>
                <p class="text-xs text-muted-foreground">{{ formatDateTime(order.submitted_at) }}</p>
              </li>
              <li *ngIf="order.completed_at" class="ml-4">
                <div class="absolute -left-1.5 h-3 w-3 rounded-full border border-background bg-green-500"></div>
                <p class="text-xs font-medium">{{ t('sales_orders.timeline_completed') }}</p>
                <p class="text-xs text-muted-foreground">{{ formatDateTime(order.completed_at) }}</p>
              </li>
              <li *ngIf="order.cancelled_at" class="ml-4">
                <div class="absolute -left-1.5 h-3 w-3 rounded-full border border-background bg-red-500"></div>
                <p class="text-xs font-medium">{{ t('sales_orders.timeline_cancelled') }}</p>
                <p class="text-xs text-muted-foreground">{{ formatDateTime(order.cancelled_at) }}</p>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </app-main-layout>

    <!-- Edit Form Drawer -->
    <app-sales-order-form
      *ngIf="isEditOpen"
      [isOpen]="isEditOpen"
      [order]="order"
      (success)="onEditSuccess()"
      (cancel)="isEditOpen = false"
    ></app-sales-order-form>
  `,
})
export class SalesOrderDetailComponent implements OnInit {
  order: SalesOrder | null = null;
  deliveryNotes: DeliveryNote[] = [];
  backorders: Backorder[] = [];
  isLoading = false;
  loadingDNs = false;
  isEditOpen = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private salesOrdersService: SalesOrdersService,
    private deliveryNotesService: DeliveryNotesService,
    private backordersService: BackordersService,
    private alertService: AlertService,
    private languageService: LanguageService,
    private loadingService: LoadingService,
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/sales-orders']);
      return;
    }
    await this.loadOrder(id);
  }

  async loadOrder(id: string): Promise<void> {
    this.isLoading = true;
    try {
      const resp = await this.salesOrdersService.getById(id);
      if (resp.result.success) {
        this.order = resp.data;
        await this.loadLinkedData();
      } else {
        this.alertService.error(resp.result.message || this.t('operation_failed'), this.t('error'));
        this.router.navigate(['/sales-orders']);
      }
    } catch (err: any) {
      this.alertService.error(handleApiError(err, this.t('sales_orders.load_error')), this.t('error'));
      this.router.navigate(['/sales-orders']);
    } finally {
      this.isLoading = false;
    }
  }

  async loadLinkedData(): Promise<void> {
    if (!this.order) return;
    const soId = this.order.id;

    // Load backorders (always — backend filters by so_id)
    try {
      const boResp = await this.backordersService.list({ so_id: soId });
      if (boResp.result.success) {
        this.backorders = boResp.data || [];
      }
    } catch {
      // non-critical
    }

    // Load delivery notes if status is completed or partial
    if (this.order.status === 'completed' || this.order.status === 'partial') {
      this.loadingDNs = true;
      try {
        const dnResp = await this.deliveryNotesService.list({ sales_order_id: soId });
        if (dnResp.result.success) {
          this.deliveryNotes = dnResp.data || [];
        }
      } catch {
        // non-critical
      } finally {
        this.loadingDNs = false;
      }
    }
  }

  openEditForm(): void {
    this.isEditOpen = true;
  }

  async onEditSuccess(): Promise<void> {
    this.isEditOpen = false;
    if (this.order) {
      await this.loadOrder(this.order.id);
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.order || !confirm(this.t('sales_orders.confirm_submit'))) return;
    try {
      this.loadingService.show();
      const resp = await this.salesOrdersService.submit(this.order.id);
      if (resp.result.success) {
        this.alertService.success(this.t('sales_orders.submitted_ok'), this.t('success'));
        await this.loadOrder(this.order.id);
      } else {
        this.alertService.error(resp.result.message || this.t('operation_failed'), this.t('error'));
      }
    } catch (err: any) {
      this.alertService.error(handleApiError(err, this.t('sales_orders.submit_error')), this.t('error'));
    } finally {
      this.loadingService.hide();
    }
  }

  async onCancel(): Promise<void> {
    if (!this.order || !confirm(this.t('sales_orders.confirm_cancel'))) return;
    try {
      this.loadingService.show();
      const resp = await this.salesOrdersService.cancel(this.order.id);
      if (resp.result.success) {
        this.alertService.success(this.t('sales_orders.cancelled_ok'), this.t('success'));
        await this.loadOrder(this.order.id);
      } else {
        this.alertService.error(resp.result.message || this.t('operation_failed'), this.t('error'));
      }
    } catch (err: any) {
      this.alertService.error(handleApiError(err, this.t('sales_orders.cancel_error')), this.t('error'));
    } finally {
      this.loadingService.hide();
    }
  }

  async onDelete(): Promise<void> {
    if (!this.order || !confirm(this.t('sales_orders.confirm_delete'))) return;
    try {
      this.loadingService.show();
      const resp = await this.salesOrdersService.softDelete(this.order.id);
      if (resp.result.success) {
        this.alertService.success(this.t('sales_orders.deleted_ok'), this.t('success'));
        this.router.navigate(['/sales-orders']);
      } else {
        this.alertService.error(resp.result.message || this.t('operation_failed'), this.t('error'));
      }
    } catch (err: any) {
      this.alertService.error(handleApiError(err, this.t('sales_orders.delete_error')), this.t('error'));
    } finally {
      this.loadingService.hide();
    }
  }

  goBack(): void {
    this.router.navigate(['/sales-orders']);
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

  getBackorderStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-800 border-amber-300',
      fulfilled: 'bg-green-100 text-green-800 border-green-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300',
    };
    return map[status] || map['pending'];
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
