import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Inventory } from '@app/models/inventory.model';
import { InventoryLot } from '@app/models/inventory-lot.model';
import { PickingTask } from '@app/models/picking-task.model';
import { ReceivingTask } from '@app/models/receiving-task.model';
import { InventoryService } from '@app/services/inventory.service';
import { InventoryLotsService } from '@app/services/inventory-lots.service';
import { InventoryValuationService } from '@app/services/inventory-valuation.service';
import { PickingTaskService } from '@app/services/picking-task.service';
import { ReceivingTaskService } from '@app/services/receiving-task.service';
import { AlertService } from '@app/services/extras/alert.service';
import { AuthorizationService } from '@app/services/extras/authorization.service';
import { LanguageService } from '@app/services/extras/language.service';
import { ExpiryClassPipe } from '@app/shared/pipes/expiry-class.pipe';
import { ConfirmationDialogComponent } from '../../../../shared/confirmation-dialog/confirmation-dialog.component';

interface ReservationRow {
  task: PickingTask;
  reservedQty: number;
  locations: string[];
}

@Component({
  selector: 'app-article-inventario-tab',
  standalone: true,
  imports: [CommonModule, RouterModule, ExpiryClassPipe, ConfirmationDialogComponent],
  templateUrl: './inventario-tab.component.html',
})
export class InventarioTabComponent implements OnInit, OnChanges {
  @Input() sku = '';
  @Output() switchTab = new EventEmitter<string>();

  inventory: Inventory[] = [];
  reservations: ReservationRow[] = [];
  receivingInbound: ReceivingTask[] = [];
  lots: InventoryLot[] = [];
  avcoValue: number | null = null;

  isLoading = false;
  hasError = false;
  isReleasing = false;

  confirmOpen = false;
  pendingReleaseTaskId: string | null = null;

  readonly LOTS_PREVIEW_LIMIT = 5;

  constructor(
    private inventoryService: InventoryService,
    private inventoryLotsService: InventoryLotsService,
    private valuationService: InventoryValuationService,
    private pickingTaskService: PickingTaskService,
    private receivingTaskService: ReceivingTaskService,
    private alertService: AlertService,
    private authorizationService: AuthorizationService,
    private languageService: LanguageService,
  ) {}

  ngOnInit(): void {
    if (this.sku) this.load();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sku'] && !changes['sku'].firstChange && this.sku) {
      this.load();
    }
  }

  t(key: string): string {
    return this.languageService.t(key);
  }

  async load(): Promise<void> {
    this.isLoading = true;
    this.hasError = false;
    try {
      const [invRes, valuationRes, pickingRes, receivingRes, lotsRes] = await Promise.all([
        this.inventoryService.getAll(),
        this.valuationService.get('article'),
        this.pickingTaskService.getAll(),
        this.receivingTaskService.getAll(),
        this.inventoryLotsService.getAll({ sku: this.sku }),
      ]);

      const allInventory: Inventory[] = invRes?.data ?? [];
      this.inventory = allInventory
        .filter((i) => i.sku === this.sku)
        .sort((a, b) => (b.quantity ?? 0) - (a.quantity ?? 0));

      const breakdown = valuationRes?.data?.breakdown ?? [];
      const entry = breakdown.find((b) => b.label === this.sku);
      this.avcoValue = entry?.total_value ?? null;

      const ACTIVE_PICKING = new Set(['open', 'in_progress', 'assigned']);
      const allPickings: PickingTask[] = pickingRes?.data ?? [];
      this.reservations = allPickings
        .filter((p) => ACTIVE_PICKING.has(p.status))
        .map((p) => this.mapReservation(p))
        .filter((r) => r.reservedQty > 0);

      const ACTIVE_RECEIVING = new Set(['open', 'in_progress']);
      const allReceivings: ReceivingTask[] = receivingRes?.data ?? [];
      this.receivingInbound = allReceivings.filter((r) => ACTIVE_RECEIVING.has(r.status));

      this.lots = (lotsRes?.data ?? [])
        .filter((l) => (l.qty ?? 0) > 0)
        .sort((a, b) => this.compareExpiration(a.expiration_date, b.expiration_date));
    } catch {
      this.hasError = true;
      this.alertService.error(this.t('article_detail.inventario.load_error'));
    } finally {
      this.isLoading = false;
    }
  }

  private mapReservation(task: PickingTask): ReservationRow {
    let reservedQty = 0;
    const locations = new Set<string>();
    for (const item of task.items ?? []) {
      if (item.sku !== this.sku) continue;
      const perItemQty = item.required_qty ?? 0;
      reservedQty += perItemQty;
      for (const alloc of item.allocations ?? []) {
        if (alloc?.location) locations.add(alloc.location);
      }
      if (item.location) locations.add(item.location);
    }
    return { task, reservedQty, locations: Array.from(locations) };
  }

  private compareExpiration(a?: string | null, b?: string | null): number {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  }

  get availableStock(): number {
    return this.inventory.reduce((sum, i) => sum + (i.available_qty ?? i.quantity ?? 0), 0);
  }

  get projectedQty(): number {
    const incoming = this.receivingInbound.reduce((sum, r) => {
      const itemsQty = (r.items ?? [])
        .filter((it) => it.sku === this.sku)
        .reduce((s, it) => s + (it.expected_qty ?? 0) - (it.received_qty ?? 0), 0);
      return sum + Math.max(0, itemsQty);
    }, 0);
    return this.availableStock + incoming;
  }

  formatCurrency(value: number | null): string {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatNumber(value: number | null | undefined): string {
    if (value === null || value === undefined) return '0';
    return new Intl.NumberFormat('es-CR').format(value);
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('es', { year: 'numeric', month: 'short', day: '2-digit' });
  }

  lotFor(item: Inventory): string {
    const lots = item.lots ?? [];
    if (!lots.length) return '—';
    const dominant = [...lots].sort((a, b) => (b.quantity ?? 0) - (a.quantity ?? 0))[0];
    return dominant?.lotNumber ?? '—';
  }

  statusBadgeClass(status: string): string {
    const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';
    switch (status) {
      case 'open':
        return `${base} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`;
      case 'in_progress':
      case 'assigned':
        return `${base} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300`;
      case 'completed':
        return `${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`;
      case 'cancelled':
      case 'abandoned':
        return `${base} bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300`;
      default:
        return `${base} bg-muted text-muted-foreground`;
    }
  }

  canReleaseReservation(): boolean {
    return this.authorizationService.isAdmin() || this.authorizationService.hasPermission('picking_tasks', 'update');
  }

  openReleaseConfirm(taskId: string): void {
    if (this.isReleasing) return;
    this.pendingReleaseTaskId = taskId;
    this.confirmOpen = true;
  }

  cancelRelease(): void {
    this.confirmOpen = false;
    this.pendingReleaseTaskId = null;
  }

  async confirmRelease(): Promise<void> {
    const taskId = this.pendingReleaseTaskId;
    this.confirmOpen = false;
    this.pendingReleaseTaskId = null;
    if (!taskId) return;
    this.isReleasing = true;
    try {
      await this.pickingTaskService.cancel(taskId);
      this.alertService.success(this.t('article_detail.inventario.release_success'));
      await this.load();
    } catch {
      this.alertService.error(this.t('article_detail.inventario.release_error'));
    } finally {
      this.isReleasing = false;
    }
  }

  onViewAllLots(): void {
    this.switchTab.emit('trazabilidad');
  }

  get visibleLots(): InventoryLot[] {
    return this.lots.slice(0, this.LOTS_PREVIEW_LIMIT);
  }

  get hasMoreLots(): boolean {
    return this.lots.length > this.LOTS_PREVIEW_LIMIT;
  }
}
