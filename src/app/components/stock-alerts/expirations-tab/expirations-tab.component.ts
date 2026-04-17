import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { InventoryLot } from '../../../models/inventory-lot.model';
import { InventoryLotsService } from '../../../services/inventory-lots.service';
import { ExpiryClassPipe, daysUntilExpiry } from '../../../shared/pipes/expiry-class.pipe';

type SortField = 'expiration_date' | 'qty' | 'sku';
type SortOrder = 'asc' | 'desc';
type Window = '7d' | '30d' | '60d' | 'expired' | 'all';

@Component({
  selector: 'app-expirations-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ExpiryClassPipe],
  templateUrl: './expirations-tab.component.html',
})
export class ExpirationsTabComponent implements OnInit {
  isLoading = signal(false);
  private readonly allLots = signal<InventoryLot[]>([]);

  activeWindow = signal<Window>('30d');
  sortField = signal<SortField>('expiration_date');
  sortOrder = signal<SortOrder>('asc');

  readonly filteredLots = computed(() => {
    const rows = this.allLots().filter(l => !!l.expiration_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const w = this.activeWindow();

    const filtered = rows.filter(lot => {
      const days = daysUntilExpiry(lot.expiration_date);
      if (days === null) return false;
      switch (w) {
        case '7d':      return days < 0 || days <= 7;
        case '30d':     return days < 0 || days <= 30;
        case '60d':     return days < 0 || days <= 60;
        case 'expired': return days < 0;
        case 'all':     return true;
      }
    });

    const field = this.sortField();
    const order = this.sortOrder();
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (field === 'expiration_date') {
        const da = daysUntilExpiry(a.expiration_date) ?? Infinity;
        const db = daysUntilExpiry(b.expiration_date) ?? Infinity;
        cmp = da - db;
      } else if (field === 'qty') {
        cmp = a.qty - b.qty;
      } else if (field === 'sku') {
        cmp = a.sku.localeCompare(b.sku);
      }
      return order === 'asc' ? cmp : -cmp;
    });
  });

  readonly expiredCount = computed(() =>
    this.allLots().filter(l => {
      const d = daysUntilExpiry(l.expiration_date);
      return d !== null && d < 0;
    }).length
  );

  readonly urgentCount = computed(() =>
    this.allLots().filter(l => {
      const d = daysUntilExpiry(l.expiration_date);
      return d !== null && d >= 0 && d <= 7;
    }).length
  );

  constructor(private inventoryLotsService: InventoryLotsService) {}

  ngOnInit(): void {
    this.loadLots();
  }

  private async loadLots(): Promise<void> {
    this.isLoading.set(true);
    try {
      const res = await this.inventoryLotsService.getAll({ status: 'active' });
      if (res?.result?.success && Array.isArray(res.data)) {
        this.allLots.set(res.data);
      }
    } catch {
      this.allLots.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  setWindow(w: Window): void { this.activeWindow.set(w); }

  toggleSort(field: SortField): void {
    if (this.sortField() === field) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortOrder.set('asc');
    }
  }

  daysLabel(exp: string | null | undefined): string {
    const d = daysUntilExpiry(exp);
    if (d === null) return '';
    if (d < 0) return `Vencido (${Math.abs(d)}d)`;
    if (d === 0) return 'Vence hoy';
    if (d === 1) return 'Vence mañana';
    return `${d}d para vencer`;
  }

  formatDate(d: string | null | undefined): string {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('es-CR'); } catch { return d; }
  }

  windowClass(w: Window): string {
    const base = 'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer';
    return this.activeWindow() === w
      ? `${base} bg-primary text-primary-foreground border-primary`
      : `${base} bg-background text-muted-foreground border-border hover:bg-accent hover:text-primary`;
  }

  readonly WINDOWS: { value: Window; label: string }[] = [
    { value: '7d',      label: '< 7 días' },
    { value: '30d',     label: '< 30 días' },
    { value: '60d',     label: '< 60 días' },
    { value: 'expired', label: 'Vencidos' },
    { value: 'all',     label: 'Todos' },
  ];
}
