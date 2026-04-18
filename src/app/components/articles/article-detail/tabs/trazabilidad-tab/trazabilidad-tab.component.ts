import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InventoryLot } from '@app/models/inventory-lot.model';
import { Lot } from '@app/models/lot.model';
import { Serial } from '@app/models/serial.model';
import { InventoryLotsService } from '@app/services/inventory-lots.service';
import { LotService } from '@app/services/lot.service';
import { SerialService } from '@app/services/serial.service';
import { LanguageService } from '@app/services/extras/language.service';
import { ExpiryClassPipe, daysUntilExpiry } from '@app/shared/pipes/expiry-class.pipe';

type LotStatusFilter = 'all' | 'active' | 'archived' | 'quarantine';
type ExpiryFilter = 'all' | '30d' | 'expired';
type SortOrder = 'asc' | 'desc';

export interface LotRow {
  id: number;
  lot_number: string;
  sku: string;
  status: string;
  expiration_date?: string | null;
  best_before_date?: string | null;
  manufactured_at?: string | null;
  totalQty: number;
  locations: string[];
}

const DEFAULT_STATUS: LotStatusFilter = 'active';

@Component({
  selector: 'app-trazabilidad-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, ExpiryClassPipe],
  templateUrl: './trazabilidad-tab.component.html',
})
export class TrazabilidadTabComponent implements OnInit, OnChanges {
  @Input({ required: true }) sku!: string;
  @Input() isSerialized = false;

  readonly isLoadingLots = signal(false);
  readonly isLoadingSerials = signal(false);
  readonly hasError = signal(false);

  private readonly lots = signal<Lot[]>([]);
  private readonly inventoryLots = signal<InventoryLot[]>([]);
  readonly serials = signal<Serial[]>([]);

  readonly statusFilter = signal<LotStatusFilter>(DEFAULT_STATUS);
  readonly expiryFilter = signal<ExpiryFilter>('all');
  readonly sortOrder = signal<SortOrder>('asc');

  readonly lotRows = computed<LotRow[]>(() => {
    const byLotNumber = new Map<string, { qty: number; locations: Set<string> }>();
    for (const il of this.inventoryLots()) {
      const key = il.lot_number;
      const bucket = byLotNumber.get(key) ?? { qty: 0, locations: new Set<string>() };
      bucket.qty += Number(il.qty) || 0;
      if (il.location) bucket.locations.add(il.location);
      byLotNumber.set(key, bucket);
    }

    return this.lots().map(lot => {
      const agg = byLotNumber.get(lot.lot_number);
      return {
        id: lot.id,
        lot_number: lot.lot_number,
        sku: lot.sku,
        status: this.inferLotStatus(lot),
        expiration_date: lot.expiration_date ?? null,
        best_before_date: lot.best_before_date ?? null,
        manufactured_at: lot.manufactured_at ?? null,
        totalQty: agg?.qty ?? (Number(lot.quantity) || 0),
        locations: agg ? Array.from(agg.locations).sort() : [],
      } as LotRow;
    });
  });

  readonly filteredLots = computed<LotRow[]>(() => {
    const status = this.statusFilter();
    const expiry = this.expiryFilter();
    const order = this.sortOrder();

    const filtered = this.lotRows().filter(row => {
      if (status !== 'all' && row.status !== status) return false;
      if (expiry !== 'all') {
        const days = daysUntilExpiry(row.expiration_date);
        if (days === null) return false;
        if (expiry === 'expired' && days >= 0) return false;
        if (expiry === '30d' && days > 30) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      const da = daysUntilExpiry(a.expiration_date) ?? Infinity;
      const db = daysUntilExpiry(b.expiration_date) ?? Infinity;
      const cmp = da - db;
      return order === 'asc' ? cmp : -cmp;
    });
  });

  readonly hasSerials = computed(() => this.isSerialized && this.serials().length > 0);

  constructor(
    private lotService: LotService,
    private inventoryLotsService: InventoryLotsService,
    private serialService: SerialService,
    private languageService: LanguageService,
  ) {}

  ngOnInit(): void {
    if (this.sku) this.load(this.sku);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sku'] && !changes['sku'].firstChange && changes['sku'].currentValue) {
      this.load(changes['sku'].currentValue);
    }
  }

  async load(sku: string): Promise<void> {
    this.isLoadingLots.set(true);
    this.hasError.set(false);
    try {
      const [lotsRes, inventoryLotsRes] = await Promise.all([
        this.lotService.getBySku(sku),
        this.inventoryLotsService.getAll({ sku }),
      ]);

      if (lotsRes?.result?.success && Array.isArray(lotsRes.data)) {
        this.lots.set(lotsRes.data);
      } else {
        this.lots.set([]);
      }

      if (inventoryLotsRes?.result?.success && Array.isArray(inventoryLotsRes.data)) {
        this.inventoryLots.set(inventoryLotsRes.data);
      } else {
        this.inventoryLots.set([]);
      }
    } catch {
      this.lots.set([]);
      this.inventoryLots.set([]);
      this.hasError.set(true);
    } finally {
      this.isLoadingLots.set(false);
    }

    if (this.isSerialized) {
      this.isLoadingSerials.set(true);
      try {
        const serialsRes = await this.serialService.getBySku(sku);
        if (serialsRes?.result?.success && Array.isArray(serialsRes.data)) {
          this.serials.set(serialsRes.data);
        } else {
          this.serials.set([]);
        }
      } catch {
        this.serials.set([]);
      } finally {
        this.isLoadingSerials.set(false);
      }
    }
  }

  t(key: string): string {
    return this.languageService.translate(key);
  }

  setStatus(s: LotStatusFilter): void {
    this.statusFilter.set(s);
  }

  setExpiry(e: ExpiryFilter): void {
    this.expiryFilter.set(e);
  }

  toggleSort(): void {
    this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
  }

  statusBadgeClass(status: string): string {
    const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';
    switch (status) {
      case 'active':
        return `${base} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300`;
      case 'archived':
        return `${base} bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300`;
      case 'quarantine':
        return `${base} bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300`;
      default:
        return `${base} bg-muted text-muted-foreground`;
    }
  }

  statusLabel(status: string): string {
    return this.t(`trazabilidad.lot_status.${status}`);
  }

  formatDate(d: string | null | undefined): string {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('es'); } catch { return d; }
  }

  daysLabel(exp: string | null | undefined): string {
    const d = daysUntilExpiry(exp);
    if (d === null) return '';
    if (d < 0) return this.t('trazabilidad.expiry.expired').replace('{n}', String(Math.abs(d)));
    if (d === 0) return this.t('trazabilidad.expiry.today');
    return this.t('trazabilidad.expiry.in_n_days').replace('{n}', String(d));
  }

  traceDisabledTooltip(): string {
    return this.t('trazabilidad.trace.disabled_hint');
  }

  serialStatusClass(status: string): string {
    const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';
    switch ((status || '').toLowerCase()) {
      case 'available':
        return `${base} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300`;
      case 'reserved':
        return `${base} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300`;
      case 'consumed':
      case 'shipped':
        return `${base} bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300`;
      default:
        return `${base} bg-muted text-muted-foreground`;
    }
  }

  private inferLotStatus(lot: Lot): string {
    const days = daysUntilExpiry(lot.expiration_date);
    if (lot.quantity <= 0) return 'archived';
    if (days !== null && days < 0) return 'archived';
    return 'active';
  }
}
