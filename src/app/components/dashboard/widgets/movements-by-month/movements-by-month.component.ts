import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LanguageService } from '@app/services/extras/language.service';
import { InventoryMovementsService } from '@app/services/inventory-movements.service';
import { MonthlyMovements } from '@app/models/inventory-movement.model';

interface ChartBar {
  month: string;
  monthLabel: string;
  receiving: number;
  picking: number;
  adjustment: number;
  total: number;
  receivingPct: number;
  pickingPct: number;
  adjustmentPct: number;
}

@Component({
  selector: 'app-movements-by-month',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './movements-by-month.component.html',
})
export class MovementsByMonthComponent implements OnInit {
  bars: ChartBar[] = [];
  isLoading = true;
  hasError = false;
  hoveredIndex: number | null = null;

  readonly series = [
    { key: 'receiving',  color: '#22c55e', labelKey: 'dashboard.movements_chart.receiving' },
    { key: 'picking',    color: '#3b82f6', labelKey: 'dashboard.movements_chart.picking' },
    { key: 'adjustment', color: '#f59e0b', labelKey: 'dashboard.movements_chart.adjustment' },
  ];

  constructor(
    private movementsService: InventoryMovementsService,
    private languageService: LanguageService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.isLoading = true;
    this.hasError = false;
    try {
      const data = await this.movementsService.getMovementsByMonth(6);
      this.bars = this.buildBars(data);
    } catch {
      this.hasError = true;
    } finally {
      this.isLoading = false;
    }
  }

  private buildBars(data: MonthlyMovements[]): ChartBar[] {
    const maxTotal = Math.max(...data.map(d => d.receiving + d.picking + d.adjustment), 1);

    return data.map(d => {
      const total = d.receiving + d.picking + d.adjustment;
      const scale = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

      return {
        month: d.month,
        monthLabel: this.formatMonthLabel(d.month),
        receiving: d.receiving,
        picking: d.picking,
        adjustment: d.adjustment,
        total,
        receivingPct:   total > 0 ? (d.receiving / total) * scale : 0,
        pickingPct:     total > 0 ? (d.picking / total) * scale : 0,
        adjustmentPct:  total > 0 ? (d.adjustment / total) * scale : 0,
      };
    });
  }

  private formatMonthLabel(month: string): string {
    const [year, m] = month.split('-');
    const d = new Date(+year, +m - 1, 1);
    try {
      return d.toLocaleDateString('es', { month: 'short' });
    } catch {
      return d.toLocaleDateString(undefined, { month: 'short' });
    }
  }

  formatCurrency(value: number): string {
    if (value >= 1_000_000) return `₡${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `₡${(value / 1_000).toFixed(0)}K`;
    return `₡${value.toFixed(0)}`;
  }

  drillDownParams(bar: ChartBar): Record<string, string> {
    return { from: `${bar.month}-01`, to: `${bar.month}-31` };
  }

  t(key: string): string {
    return this.languageService.t(key);
  }
}
