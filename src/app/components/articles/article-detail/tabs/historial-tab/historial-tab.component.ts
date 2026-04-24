import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InventoryMovement, MovementType } from '@app/models/inventory-movement.model';
import { InventoryMovementsService } from '@app/services/inventory-movements.service';
import { LanguageService } from '@app/services/extras/language.service';
import { RelativeDatePipe } from '@app/shared/pipes/relative-date.pipe';

export interface HeatmapCell {
  date: string;      // YYYY-MM-DD
  count: number;     // # movements
  totalQty: number;  // sum |qty|
  level: 0 | 1 | 2 | 3 | 4;
  x: number;
  y: number;
}

export interface HeatmapMonthLabel {
  label: string;
  x: number;
}

const MONTHS_IN_HEATMAP = 12;
const DAYS_IN_WEEK = 7;
const CELL_SIZE = 12;
const CELL_GAP = 2;
const CELL_TOTAL = CELL_SIZE + CELL_GAP;
const LEGEND_LEVELS = 5;

const MOVEMENT_TYPES: MovementType[] = ['inbound', 'outbound', 'rejected', 'adjustment', 'transfer'];

@Component({
  selector: 'app-historial-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, RelativeDatePipe],
  templateUrl: './historial-tab.component.html',
})
export class HistorialTabComponent implements OnInit, OnChanges {
  @Input({ required: true }) sku!: string;

  readonly isLoading = signal(false);
  readonly hasError = signal(false);
  private readonly allMovements = signal<InventoryMovement[]>([]);

  // Filters
  readonly selectedTypes = signal<Set<MovementType>>(new Set());
  readonly selectedLocation = signal<string>('');
  readonly fromDate = signal<string>('');
  readonly toDate = signal<string>('');
  readonly dayFilter = signal<string | null>(null);

  // Pagination
  readonly pageSize = 20;
  readonly pageIndex = signal(0);

  // Heatmap
  readonly today = new Date();
  readonly heatmapStart = this.computeHeatmapStart();
  readonly weekdayLabels = ['', 'Lun', '', 'Mié', '', 'Vie', ''];
  readonly heatmapWeeks = 53;
  readonly heatmapWidth = this.heatmapWeeks * CELL_TOTAL;
  readonly heatmapHeight = DAYS_IN_WEEK * CELL_TOTAL;
  readonly svgWidth = this.heatmapWidth + 30;   // + weekday label column
  readonly svgHeight = this.heatmapHeight + 20; // + month label row
  readonly CELL_SIZE = CELL_SIZE;

  readonly MOVEMENT_TYPES: MovementType[] = MOVEMENT_TYPES;

  readonly filteredMovements = computed(() => {
    const types = this.selectedTypes();
    const location = this.selectedLocation().trim().toLowerCase();
    const from = this.fromDate();
    const to = this.toDate();
    const day = this.dayFilter();

    return this.allMovements().filter(mv => {
      if (types.size > 0 && !types.has(mv.movement_type)) return false;
      if (location && !(mv.location_code || '').toLowerCase().includes(location)) return false;
      const mvDate = mv.created_at.slice(0, 10);
      if (day && mvDate !== day) return false;
      if (from && mvDate < from) return false;
      if (to && mvDate > to) return false;
      return true;
    });
  });

  readonly sortedMovements = computed(() =>
    [...this.filteredMovements()].sort((a, b) => b.created_at.localeCompare(a.created_at)),
  );

  readonly totalRows = computed(() => this.sortedMovements().length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalRows() / this.pageSize)));
  readonly pagedMovements = computed(() => {
    const start = this.pageIndex() * this.pageSize;
    return this.sortedMovements().slice(start, start + this.pageSize);
  });

  readonly heatmapCells = computed<HeatmapCell[]>(() => {
    const byDay = new Map<string, { count: number; totalQty: number }>();
    for (const mv of this.allMovements()) {
      const key = mv.created_at.slice(0, 10);
      const bucket = byDay.get(key) ?? { count: 0, totalQty: 0 };
      bucket.count += 1;
      bucket.totalQty += Math.abs(Number(mv.quantity) || 0);
      byDay.set(key, bucket);
    }

    const cells: HeatmapCell[] = [];
    const start = this.heatmapStart;
    const end = new Date(this.today);
    end.setHours(0, 0, 0, 0);
    const cursor = new Date(start);
    while (cursor.getTime() <= end.getTime()) {
      const key = cursor.toISOString().slice(0, 10);
      const bucket = byDay.get(key);
      const count = bucket?.count ?? 0;
      const totalQty = bucket?.totalQty ?? 0;
      const diffDays = Math.floor((cursor.getTime() - start.getTime()) / 86_400_000);
      const weekIdx = Math.floor(diffDays / 7);
      const dayIdx = (cursor.getDay() + 6) % 7; // Mon=0 ... Sun=6
      cells.push({
        date: key,
        count,
        totalQty,
        level: this.computeLevel(totalQty),
        x: weekIdx * CELL_TOTAL,
        y: dayIdx * CELL_TOTAL,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return cells;
  });

  readonly monthLabels = computed<HeatmapMonthLabel[]>(() => {
    const labels: HeatmapMonthLabel[] = [];
    const start = this.heatmapStart;
    const end = new Date(this.today);
    const months = [
      this.t('historial.month.jan'), this.t('historial.month.feb'),
      this.t('historial.month.mar'), this.t('historial.month.apr'),
      this.t('historial.month.may'), this.t('historial.month.jun'),
      this.t('historial.month.jul'), this.t('historial.month.aug'),
      this.t('historial.month.sep'), this.t('historial.month.oct'),
      this.t('historial.month.nov'), this.t('historial.month.dec'),
    ];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor.getTime() <= end.getTime()) {
      if (cursor.getTime() >= start.getTime()) {
        const diffDays = Math.max(0, Math.floor((cursor.getTime() - start.getTime()) / 86_400_000));
        const weekIdx = Math.floor(diffDays / 7);
        labels.push({ label: months[cursor.getMonth()], x: weekIdx * CELL_TOTAL });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return labels;
  });

  readonly uniqueLocations = computed(() => {
    const set = new Set<string>();
    for (const mv of this.allMovements()) {
      if (mv.location_code) set.add(mv.location_code);
    }
    return Array.from(set).sort();
  });

  readonly totalMovements = computed(() => this.allMovements().length);

  constructor(
    private inventoryMovementsService: InventoryMovementsService,
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
    this.isLoading.set(true);
    this.hasError.set(false);
    try {
      const start = this.heatmapStart.toISOString().slice(0, 10);
      const res = await this.inventoryMovementsService.getAll({ sku, from: start, limit: 5000 });
      if (res?.result?.success && Array.isArray(res.data)) {
        this.allMovements.set(res.data);
      } else {
        this.allMovements.set([]);
      }
    } catch {
      this.allMovements.set([]);
      this.hasError.set(true);
    } finally {
      this.isLoading.set(false);
      this.pageIndex.set(0);
    }
  }

  t(key: string): string {
    return this.languageService.translate(key);
  }

  toggleType(type: MovementType): void {
    const next = new Set(this.selectedTypes());
    if (next.has(type)) next.delete(type);
    else next.add(type);
    this.selectedTypes.set(next);
    this.pageIndex.set(0);
  }

  isTypeSelected(type: MovementType): boolean {
    return this.selectedTypes().has(type);
  }

  onLocationChange(value: string): void {
    this.selectedLocation.set(value);
    this.pageIndex.set(0);
  }

  onFromChange(value: string): void {
    this.fromDate.set(value);
    this.pageIndex.set(0);
  }

  onToChange(value: string): void {
    this.toDate.set(value);
    this.pageIndex.set(0);
  }

  clearFilters(): void {
    this.selectedTypes.set(new Set());
    this.selectedLocation.set('');
    this.fromDate.set('');
    this.toDate.set('');
    this.dayFilter.set(null);
    this.pageIndex.set(0);
  }

  onCellClick(cell: HeatmapCell): void {
    if (cell.count === 0) return;
    const current = this.dayFilter();
    this.dayFilter.set(current === cell.date ? null : cell.date);
    this.pageIndex.set(0);
  }

  clearDayFilter(): void {
    this.dayFilter.set(null);
    this.pageIndex.set(0);
  }

  nextPage(): void {
    if (this.pageIndex() < this.totalPages() - 1) this.pageIndex.set(this.pageIndex() + 1);
  }

  prevPage(): void {
    if (this.pageIndex() > 0) this.pageIndex.set(this.pageIndex() - 1);
  }

  cellClass(level: number): string {
    const base = 'transition-colors';
    switch (level) {
      case 0: return `${base} fill-muted`;
      case 1: return `${base} fill-green-200 dark:fill-green-900/60`;
      case 2: return `${base} fill-green-400 dark:fill-green-700`;
      case 3: return `${base} fill-green-600 dark:fill-green-500`;
      case 4: return `${base} fill-green-800 dark:fill-green-300`;
      default: return base;
    }
  }

  levelFill(level: number): string {
    return this.cellClass(level);
  }

  legendLevels(): number[] {
    return Array.from({ length: LEGEND_LEVELS }, (_, i) => i);
  }

  typeBadgeClass(type: MovementType): string {
    const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';
    switch (type) {
      case 'inbound':
        return `${base} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300`;
      case 'outbound':
        return `${base} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300`;
      case 'adjustment':
        return `${base} bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300`;
      case 'transfer':
        return `${base} bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300`;
      case 'rejected':
        return `${base} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300`;
      default:
        return `${base} bg-muted text-muted-foreground`;
    }
  }

  typeLabel(type: MovementType): string {
    return this.t(`historial.type.${type}`);
  }

  qtyClass(mv: InventoryMovement): string {
    if (mv.movement_type === 'inbound') return 'text-green-700 dark:text-green-400 font-semibold';
    if (mv.movement_type === 'outbound') return 'text-red-700 dark:text-red-400 font-semibold';
    if (mv.movement_type === 'rejected') return 'text-red-700 dark:text-red-400 font-semibold';
    return 'text-foreground font-semibold';
  }

  qtyDisplay(mv: InventoryMovement): string {
    const qty = Number(mv.quantity) || 0;
    if (mv.movement_type === 'inbound') return `+${qty}`;
    if (mv.movement_type === 'outbound' || mv.movement_type === 'rejected') {
      return qty > 0 ? `-${qty}` : `${qty}`;
    }
    return qty > 0 ? `+${qty}` : `${qty}`;
  }

  absoluteDate(iso: string): string {
    try { return new Date(iso).toLocaleString('es'); } catch { return iso; }
  }

  referenceLabel(mv: InventoryMovement): string {
    if (!mv.reference_type) return '—';
    const suffix = mv.reference_id ? ` · ${mv.reference_id.slice(0, 8)}` : '';
    return `${mv.reference_type}${suffix}`;
  }

  unitCostDisplay(v: number | null | undefined): string {
    if (v == null) return '—';
    try { return v.toLocaleString('es', { style: 'currency', currency: 'USD' }); } catch { return `$${v}`; }
  }

  qtyPairDisplay(mv: InventoryMovement): string {
    const b = mv.before_qty;
    const a = mv.after_qty;
    if (b == null && a == null) return '—';
    return `${b ?? '—'} → ${a ?? '—'}`;
  }

  heatmapSubtitle(): string {
    return this.t('historial.heatmap.subtitle').replace('{n}', String(this.totalMovements()));
  }

  heatmapTooltip(cell: HeatmapCell): string {
    if (cell.count === 0) {
      return `${cell.date} · ${this.t('historial.heatmap.no_activity')}`;
    }
    const mvLabel = cell.count === 1
      ? this.t('historial.heatmap.one_movement')
      : this.t('historial.heatmap.n_movements').replace('{n}', String(cell.count));
    return `${cell.date} · ${mvLabel} · ${this.t('historial.heatmap.total_qty')}: ${cell.totalQty}`;
  }

  private computeHeatmapStart(): Date {
    const d = new Date(this.today);
    d.setHours(0, 0, 0, 0);
    d.setFullYear(d.getFullYear() - 1);
    d.setDate(d.getDate() + 1);
    // Align to Monday of that week
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    return d;
  }

  private computeLevel(totalQty: number): 0 | 1 | 2 | 3 | 4 {
    if (totalQty <= 0) return 0;
    if (totalQty <= 5) return 1;
    if (totalQty <= 15) return 2;
    if (totalQty <= 50) return 3;
    return 4;
  }
}
