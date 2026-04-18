import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LotService } from '@app/services/lot.service';
import { PdfExportService } from '@app/services/pdf-export.service';
import { LanguageService } from '@app/services/extras/language.service';
import { ExpiryClassPipe, daysUntilExpiry } from '@app/shared/pipes/expiry-class.pipe';
import { LotTraceResponse, InventoryMovement, MovementType } from '@app/models/lot-trace.model';

@Component({
  selector: 'app-lot-trace',
  standalone: true,
  imports: [CommonModule, RouterModule, ExpiryClassPipe],
  templateUrl: './lot-trace.component.html',
})
export class LotTraceComponent implements OnInit {
  private lotId = '';

  readonly isLoading = signal(true);
  readonly isExporting = signal(false);
  readonly hasError = signal(false);
  readonly trace = signal<LotTraceResponse | null>(null);

  readonly stockByLocation = computed(() => {
    const t = this.trace();
    if (!t) return [];
    return [...t.current_stock.by_location].sort((a, b) => b.qty - a.qty);
  });

  readonly movements = computed(() => this.trace()?.movements ?? []);

  readonly isDepleted = computed(() => {
    const t = this.trace();
    return t !== null && t.current_stock.total_qty === 0;
  });

  readonly lastOutbound = computed(() => {
    if (!this.isDepleted()) return null;
    const mvs = this.movements();
    for (let i = mvs.length - 1; i >= 0; i--) {
      if (mvs[i].type === 'OUTBOUND') return mvs[i];
    }
    return null;
  });

  constructor(
    private route: ActivatedRoute,
    private lotService: LotService,
    private pdfExportService: PdfExportService,
    private languageService: LanguageService,
  ) {}

  ngOnInit(): void {
    this.lotId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.lotId) this.load();
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    this.hasError.set(false);
    try {
      const res = await this.lotService.trace(this.lotId);
      if (res?.result?.success && res.data) {
        this.trace.set(res.data);
      } else {
        this.hasError.set(true);
      }
    } catch {
      this.hasError.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }

  async exportPdf(): Promise<void> {
    const t = this.trace();
    if (!t) return;
    this.isExporting.set(true);
    try {
      const blob = await this.pdfExportService.exportLotTrace(t);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      anchor.href = url;
      anchor.download = `lot-trace-${t.lot.lot_number}-${date}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      // noop — add toast if needed
    } finally {
      this.isExporting.set(false);
    }
  }

  t(key: string): string {
    return this.languageService.translate(key);
  }

  formatDate(d: string | null | undefined): string {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('es'); } catch { return d; }
  }

  formatDateTime(d: string | null | undefined): string {
    if (!d) return '—';
    try { return new Date(d).toLocaleString('es'); } catch { return d; }
  }

  daysLabel(exp: string | null | undefined): string {
    const d = daysUntilExpiry(exp);
    if (d === null) return '';
    if (d < 0) return this.t('trazabilidad.expiry.expired').replace('{n}', String(Math.abs(d)));
    if (d === 0) return this.t('trazabilidad.expiry.today');
    return this.t('trazabilidad.expiry.in_n_days').replace('{n}', String(d));
  }

  movementTypeClass(type: MovementType): string {
    switch (type) {
      case 'INBOUND':      return 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30';
      case 'OUTBOUND':     return 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30';
      case 'REJECTED':     return 'text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30';
      case 'ADJUSTMENT':   return 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30';
      case 'TRANSFER_IN':  return 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30';
      case 'TRANSFER_OUT': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      default:             return 'text-muted-foreground bg-muted';
    }
  }

  movementQtyClass(type: MovementType): string {
    switch (type) {
      case 'INBOUND':
      case 'TRANSFER_IN':
        return 'text-green-700 dark:text-green-300 font-mono font-semibold';
      case 'OUTBOUND':
      case 'TRANSFER_OUT':
      case 'REJECTED':
        return 'text-red-700 dark:text-red-300 font-mono font-semibold';
      default:
        return 'text-amber-700 dark:text-amber-300 font-mono font-semibold';
    }
  }

  movementQtyPrefix(type: MovementType): string {
    switch (type) {
      case 'INBOUND':
      case 'TRANSFER_IN':
        return '+';
      case 'OUTBOUND':
      case 'TRANSFER_OUT':
      case 'REJECTED':
        return '−';
      default:
        return '±';
    }
  }

  refTypeLabel(refType: string | undefined): string {
    if (!refType) return '';
    return this.t(`lot_trace.ref.${refType}`);
  }

  refLink(m: InventoryMovement): string[] | null {
    if (!m.reference_id) return null;
    switch (m.reference_type) {
      case 'receiving_task': return ['/receiving-tasks'];
      case 'picking_task':   return ['/picking-tasks'];
      default:               return null;
    }
  }

  statusBadgeClass(status: string): string {
    const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';
    switch (status) {
      case 'active':     return `${base} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300`;
      case 'archived':   return `${base} bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300`;
      case 'quarantine': return `${base} bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300`;
      default:           return `${base} bg-muted text-muted-foreground`;
    }
  }
}
