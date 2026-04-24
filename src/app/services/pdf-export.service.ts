import { Injectable } from '@angular/core';
import type jsPDFType from 'jspdf';
import { LanguageService } from '@app/services/extras/language.service';
import { LotTraceResponse, InventoryMovement } from '@app/models/lot-trace.model';

const PAGE_W = 210;
const MARGIN = 14;
const COL_W = PAGE_W - MARGIN * 2;

type JsPDF = InstanceType<typeof jsPDFType>;

@Injectable({ providedIn: 'root' })
export class PdfExportService {

  constructor(private languageService: LanguageService) {}

  async exportLotTrace(data: LotTraceResponse): Promise<Blob> {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let y = MARGIN;

    y = this.drawHeader(doc, y, data);
    y = this.drawLotInfo(doc, y, data);
    y = this.drawOrigin(doc, y, data);
    y = this.drawMovements(doc, y, data.movements);
    this.drawFooter(doc, data);

    return doc.output('blob');
  }

  private t(key: string): string {
    return this.languageService.t(key);
  }

  private drawHeader(doc: JsPDF, y: number, data: LotTraceResponse): number {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(this.t('pdf.title'), MARGIN, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(this.t('pdf.brand'), MARGIN, y);
    doc.text(`${this.t('pdf.issued')}: ${new Date().toLocaleString()}`, PAGE_W - MARGIN, y, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 5;

    doc.setDrawColor(200, 200, 200);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 5;
    return y;
  }

  private drawLotInfo(doc: JsPDF, y: number, data: LotTraceResponse): number {
    const lot = data.lot;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(this.t('pdf.lot_data'), MARGIN, y);
    y += 6;

    const rows: [string, string][] = [
      [this.t('pdf.lot_number'), lot.lot_number],
      [this.t('pdf.sku'), lot.sku],
      [this.t('pdf.status'), lot.status],
      [this.t('pdf.total_stock'), String(data.current_stock.total_qty)],
    ];
    if (lot.expiration_date) rows.push([this.t('pdf.expiration'), this.fmtDate(lot.expiration_date)]);
    if (lot.manufactured_at) rows.push([this.t('pdf.manufactured'), this.fmtDate(lot.manufactured_at)]);
    if (lot.best_before_date) rows.push([this.t('pdf.best_before'), this.fmtDate(lot.best_before_date)]);

    y = this.drawKeyValueTable(doc, y, rows);
    y += 4;
    return y;
  }

  private drawOrigin(doc: JsPDF, y: number, data: LotTraceResponse): number {
    this.checkPageBreak(doc, y, 30);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(this.t('pdf.origin'), MARGIN, y);
    y += 6;

    if (!data.origin) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 150, 150);
      doc.text(this.t('pdf.origin_unknown'), MARGIN, y);
      doc.setTextColor(0, 0, 0);
      y += 8;
      return y;
    }

    const rows: [string, string][] = [
      [this.t('pdf.receiving_task_id'), data.origin.receiving_task_id],
      [this.t('pdf.received_at'), this.fmtDateTime(data.origin.received_at)],
    ];
    if (data.origin.supplier) {
      rows.push([this.t('pdf.supplier'), `${data.origin.supplier.name} (${data.origin.supplier.code})`]);
    }
    y = this.drawKeyValueTable(doc, y, rows);
    y += 4;
    return y;
  }

  private drawMovements(doc: JsPDF, y: number, movements: InventoryMovement[]): number {
    y = this.checkPageBreak(doc, y, 20);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${this.t('pdf.movements')} (${movements.length})`, MARGIN, y);
    y += 6;

    if (movements.length === 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 150, 150);
      doc.text(this.t('pdf.no_movements'), MARGIN, y);
      doc.setTextColor(0, 0, 0);
      return y + 8;
    }

    // Table header
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(MARGIN, y, COL_W, 6, 'F');
    const cols = [MARGIN, MARGIN + 32, MARGIN + 50, MARGIN + 72, MARGIN + 100, MARGIN + 130];
    const headers = [
      this.t('pdf.col_date'),
      this.t('pdf.col_type'),
      this.t('pdf.col_qty'),
      this.t('pdf.col_location'),
      this.t('pdf.col_reference'),
      this.t('pdf.col_before_after'),
    ];
    headers.forEach((h, i) => doc.text(h, cols[i] + 1, y + 4));
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    for (const m of movements) {
      y = this.checkPageBreak(doc, y, 8);
      doc.setDrawColor(230, 230, 230);
      doc.line(MARGIN, y + 5.5, PAGE_W - MARGIN, y + 5.5);

      const before = m.before_qty !== undefined ? String(m.before_qty) : '';
      const after = m.after_qty !== undefined ? String(m.after_qty) : '';
      const beforeAfter = before && after ? `${before}→${after}` : '—';
      const ref = m.reference_type && m.reference_id
        ? `${m.reference_type.replace('_', ' ')} #${m.reference_id.slice(0, 8)}`
        : '—';

      const cells = [
        this.fmtDateTime(m.created_at).slice(0, 16),
        m.movement_type,
        String(m.quantity),
        m.location_code ?? '—',
        ref,
        beforeAfter,
      ];
      cells.forEach((c, i) => doc.text(c, cols[i] + 1, y + 4));
      y += 6;
    }

    return y + 4;
  }

  private drawKeyValueTable(doc: JsPDF, y: number, rows: [string, string][]): number {
    doc.setFontSize(9);
    const labelW = 55;
    for (const [label, value] of rows) {
      doc.setFont('helvetica', 'bold');
      doc.text(label, MARGIN, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, MARGIN + labelW, y);
      y += 5.5;
    }
    return y;
  }

  private drawFooter(doc: JsPDF, data: LotTraceResponse): void {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(150, 150, 150);
      doc.text(`eSTOCK — ${this.t('pdf.lot_label')} ${data.lot.lot_number} — ${this.t('pdf.page')} ${i} / ${pageCount}`, MARGIN, 290);
      doc.setTextColor(0, 0, 0);
    }
  }

  private checkPageBreak(doc: JsPDF, y: number, needed: number): number {
    if (y + needed > 275) {
      doc.addPage();
      return MARGIN;
    }
    return y;
  }

  private fmtDate(d: string | null | undefined): string {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString(); } catch { return d; }
  }

  private fmtDateTime(d: string | null | undefined): string {
    if (!d) return '—';
    try { return new Date(d).toLocaleString(); } catch { return d; }
  }
}
