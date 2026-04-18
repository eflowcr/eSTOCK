import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { LotTraceResponse, InventoryMovement } from '@app/models/lot-trace.model';

const PAGE_W = 210;
const MARGIN = 14;
const COL_W = PAGE_W - MARGIN * 2;

@Injectable({ providedIn: 'root' })
export class PdfExportService {

  async exportLotTrace(data: LotTraceResponse): Promise<Blob> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let y = MARGIN;

    y = this.drawHeader(doc, y, data);
    y = this.drawLotInfo(doc, y, data);
    y = this.drawOrigin(doc, y, data);
    y = this.drawMovements(doc, y, data.movements);
    this.drawFooter(doc, data);

    return doc.output('blob');
  }

  private drawHeader(doc: jsPDF, y: number, data: LotTraceResponse): number {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Reporte de Trazabilidad de Lote', MARGIN, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('ePRAC eSTOCK', MARGIN, y);
    doc.text(`Emitido: ${new Date().toLocaleString('es')}`, PAGE_W - MARGIN, y, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 5;

    doc.setDrawColor(200, 200, 200);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 5;
    return y;
  }

  private drawLotInfo(doc: jsPDF, y: number, data: LotTraceResponse): number {
    const lot = data.lot;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Datos del lote', MARGIN, y);
    y += 6;

    const rows: [string, string][] = [
      ['Número de lote', lot.lot_number],
      ['SKU', lot.sku],
      ['Estado', lot.status],
      ['Stock total actual', String(data.current_stock.total_qty)],
    ];
    if (lot.expiration_date) rows.push(['Vencimiento', this.fmtDate(lot.expiration_date)]);
    if (lot.manufactured_at) rows.push(['Fabricación', this.fmtDate(lot.manufactured_at)]);
    if (lot.best_before_date) rows.push(['Consumo preferente', this.fmtDate(lot.best_before_date)]);

    y = this.drawKeyValueTable(doc, y, rows);
    y += 4;
    return y;
  }

  private drawOrigin(doc: jsPDF, y: number, data: LotTraceResponse): number {
    this.checkPageBreak(doc, y, 30);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Origen', MARGIN, y);
    y += 6;

    if (!data.origin) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 150, 150);
      doc.text('Origen no registrado — lote pre-S2', MARGIN, y);
      doc.setTextColor(0, 0, 0);
      y += 8;
      return y;
    }

    const rows: [string, string][] = [
      ['ID Tarea de recepción', data.origin.receiving_task_id],
      ['Recibido el', this.fmtDateTime(data.origin.received_at)],
    ];
    if (data.origin.supplier) {
      rows.push(['Proveedor', `${data.origin.supplier.name} (${data.origin.supplier.code})`]);
    }
    y = this.drawKeyValueTable(doc, y, rows);
    y += 4;
    return y;
  }

  private drawMovements(doc: jsPDF, y: number, movements: InventoryMovement[]): number {
    y = this.checkPageBreak(doc, y, 20);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Movimientos (${movements.length})`, MARGIN, y);
    y += 6;

    if (movements.length === 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 150, 150);
      doc.text('Sin movimientos registrados', MARGIN, y);
      doc.setTextColor(0, 0, 0);
      return y + 8;
    }

    // Table header
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(MARGIN, y, COL_W, 6, 'F');
    const cols = [MARGIN, MARGIN + 32, MARGIN + 50, MARGIN + 72, MARGIN + 100, MARGIN + 130];
    const headers = ['Fecha', 'Tipo', 'Qty', 'Ubicación', 'Referencia', 'Antes→Después'];
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
        m.type,
        String(m.quantity),
        m.location ?? '—',
        ref,
        beforeAfter,
      ];
      cells.forEach((c, i) => doc.text(c, cols[i] + 1, y + 4));
      y += 6;
    }

    return y + 4;
  }

  private drawKeyValueTable(doc: jsPDF, y: number, rows: [string, string][]): number {
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

  private drawFooter(doc: jsPDF, data: LotTraceResponse): void {
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(150, 150, 150);
      doc.text(`eSTOCK — Lote ${data.lot.lot_number} — Página ${i} / ${pageCount}`, MARGIN, 290);
      doc.setTextColor(0, 0, 0);
    }
  }

  private checkPageBreak(doc: jsPDF, y: number, needed: number): number {
    if (y + needed > 275) {
      doc.addPage();
      return MARGIN;
    }
    return y;
  }

  private fmtDate(d: string | null | undefined): string {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('es'); } catch { return d; }
  }

  private fmtDateTime(d: string | null | undefined): string {
    if (!d) return '—';
    try { return new Date(d).toLocaleString('es'); } catch { return d; }
  }
}
