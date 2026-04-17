import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LanguageService } from '@app/services/extras/language.service';
import { StockAlertService } from '@app/services/stock-alert.service';
import { LotService } from '@app/services/lot.service';
import { ReceivingTaskService } from '@app/services/receiving-task.service';
import { PickingTaskService } from '@app/services/picking-task.service';
import { StockAlert } from '@app/models/stock-alert.model';
import { AlertLevel } from '@app/models/dashboard.model';
import { Lot } from '@app/models/lot.model';
import { ReceivingTask } from '@app/models/receiving-task.model';
import { PickingTask } from '@app/models/picking-task.model';

interface AttentionItem {
  id: string;
  label: string;
  meta: string;
  urgency: 'critical' | 'warning' | 'info';
  link: string[];
  queryParams?: Record<string, string>;
}

interface SubCard {
  icon: string;
  titleKey: string;
  items: AttentionItem[];
  emptyKey: string;
  isLoading: boolean;
}

@Component({
  selector: 'app-attention-required',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './attention-required.component.html',
})
export class AttentionRequiredComponent implements OnInit {
  isRefreshing = false;

  expiringLots: SubCard = {
    icon: '🔴',
    titleKey: 'dashboard.attention.expiring_lots',
    items: [],
    emptyKey: 'dashboard.attention.no_expiring_lots',
    isLoading: true,
  };

  lowStock: SubCard = {
    icon: '⚠️',
    titleKey: 'dashboard.attention.low_stock',
    items: [],
    emptyKey: 'dashboard.attention.no_low_stock',
    isLoading: true,
  };

  openTasks: SubCard = {
    icon: '📦',
    titleKey: 'dashboard.attention.unassigned_tasks',
    items: [],
    emptyKey: 'dashboard.attention.no_unassigned_tasks',
    isLoading: true,
  };

  discrepancies: SubCard = {
    icon: '📝',
    titleKey: 'dashboard.attention.discrepancies',
    items: [],
    emptyKey: 'dashboard.attention.no_discrepancies',
    isLoading: true,
  };

  get subCards(): SubCard[] {
    return [this.expiringLots, this.lowStock, this.openTasks, this.discrepancies];
  }

  constructor(
    private languageService: LanguageService,
    private stockAlertService: StockAlertService,
    private lotService: LotService,
    private receivingTaskService: ReceivingTaskService,
    private pickingTaskService: PickingTaskService,
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  async refresh(): Promise<void> {
    this.isRefreshing = true;
    await this.loadAll();
    this.isRefreshing = false;
  }

  private async loadAll(): Promise<void> {
    this.subCards.forEach(c => { c.isLoading = true; c.items = []; });

    await Promise.allSettled([
      this.loadExpiringLots(),
      this.loadLowStock(),
      this.loadOpenTasks(),
      this.loadDiscrepancies(),
    ]);
  }

  private async loadExpiringLots(): Promise<void> {
    try {
      const response = await this.lotService.getAll();
      if (response?.result?.success && response.data) {
        const now = new Date();
        const thirtyDays = new Date(now);
        thirtyDays.setDate(now.getDate() + 30);

        const expiring = (response.data as Lot[])
          .filter(lot => lot.expiration_date && new Date(lot.expiration_date) <= thirtyDays)
          .sort((a, b) => new Date(a.expiration_date!).getTime() - new Date(b.expiration_date!).getTime())
          .slice(0, 5);

        this.expiringLots.items = expiring.map(lot => {
          const daysLeft = Math.ceil(
            (new Date(lot.expiration_date!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          const urgency: AttentionItem['urgency'] = daysLeft <= 7 ? 'critical' : daysLeft <= 14 ? 'warning' : 'info';
          return {
            id: String(lot.id),
            label: `${lot.sku} — Lote ${lot.lot_number}`,
            meta: daysLeft <= 0
              ? this.t('dashboard.attention.expired')
              : `${daysLeft}d`,
            urgency,
            link: ['/stock-alerts'],
            queryParams: { tab: 'expirations' },
          };
        });
      }
    } catch { /* silent */ }
    this.expiringLots.isLoading = false;
  }

  private async loadLowStock(): Promise<void> {
    try {
      const response = await this.stockAlertService.getAll(false);
      if (response?.result?.success && response.data) {
        const alerts = (response.data as unknown as StockAlert[])
          .filter(a => a.alert_type === 'low_stock' && !a.is_resolved)
          .slice(0, 5);

        this.lowStock.items = alerts.map(a => {
          const urgency: AttentionItem['urgency'] =
            a.alert_level === 'critical' ? 'critical' :
            a.alert_level === 'high' ? 'warning' : 'info';
          return {
            id: a.id,
            label: a.sku,
            meta: `${a.current_stock} / ${a.recommended_stock}`,
            urgency,
            link: ['/stock-alerts'],
          };
        });
      }
    } catch { /* silent */ }
    this.lowStock.isLoading = false;
  }

  private async loadOpenTasks(): Promise<void> {
    try {
      const [receivingResp, pickingResp] = await Promise.allSettled([
        this.receivingTaskService.search({ status: 'open' }),
        this.pickingTaskService.search({ status: 'open' }),
      ]);

      const items: AttentionItem[] = [];

      if (receivingResp.status === 'fulfilled' && receivingResp.value?.result?.success) {
        const unassigned = (receivingResp.value.data as ReceivingTask[])
          .filter(t => !t.assigned_to || t.assigned_to === '')
          .slice(0, 3);
        unassigned.forEach(t => {
          items.push({
            id: t.task_id,
            label: t.inbound_number || t.task_id,
            meta: this.t('receiving_task_label'),
            urgency: 'warning',
            link: ['/receiving-tasks'],
          });
        });
      }

      if (pickingResp.status === 'fulfilled' && pickingResp.value?.result?.success) {
        const unassigned = (pickingResp.value.data as PickingTask[])
          .filter(t => !t.assigned_to || t.assigned_to === '')
          .slice(0, 3);
        unassigned.forEach(t => {
          items.push({
            id: t.task_id,
            label: t.outbound_number || t.task_id,
            meta: this.t('picking_task_label'),
            urgency: 'warning',
            link: ['/picking-tasks'],
          });
        });
      }

      this.openTasks.items = items.slice(0, 5);
    } catch { /* silent */ }
    this.openTasks.isLoading = false;
  }

  private async loadDiscrepancies(): Promise<void> {
    try {
      const [receivingResp, pickingResp] = await Promise.allSettled([
        this.receivingTaskService.search({ status: 'completed_with_differences' }),
        this.pickingTaskService.search({ status: 'completed_with_differences' }),
      ]);

      const items: AttentionItem[] = [];

      if (receivingResp.status === 'fulfilled' && receivingResp.value?.result?.success) {
        (receivingResp.value.data as ReceivingTask[]).slice(0, 3).forEach(t => {
          items.push({
            id: t.task_id,
            label: t.inbound_number || t.task_id,
            meta: this.t('receiving_task_label'),
            urgency: 'warning',
            link: ['/receiving-tasks'],
          });
        });
      }

      if (pickingResp.status === 'fulfilled' && pickingResp.value?.result?.success) {
        (pickingResp.value.data as PickingTask[]).slice(0, 3).forEach(t => {
          items.push({
            id: t.task_id,
            label: t.outbound_number || t.task_id,
            meta: this.t('picking_task_label'),
            urgency: 'warning',
            link: ['/picking-tasks'],
          });
        });
      }

      this.discrepancies.items = items.slice(0, 5);
    } catch { /* silent */ }
    this.discrepancies.isLoading = false;
  }

  urgencyClass(urgency: AttentionItem['urgency']): string {
    return {
      critical: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400',
      warning:  'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
      info:     'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
    }[urgency];
  }

  t(key: string): string {
    return this.languageService.t(key);
  }
}
