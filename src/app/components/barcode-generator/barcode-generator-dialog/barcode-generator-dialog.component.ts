import { Component, Input, Output, EventEmitter, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BarcodeItem, BarcodeOptions, DEFAULT_BARCODE_OPTIONS, CodeType } from '@app/models/barcode.model';
import { BarcodeService } from '@app/services/barcode.service';
import { LanguageService } from '@app/services/extras/language.service';
import { AlertService } from '@app/services/extras/alert.service';
import { BarcodeDisplayComponent } from '../barcode-display/barcode-display.component';

@Component({
  selector: 'app-barcode-generator-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BarcodeDisplayComponent
  ],
  templateUrl: './barcode-generator-dialog.component.html',
  styleUrl: './barcode-generator-dialog.component.css'
})
export class BarcodeGeneratorDialogComponent implements OnInit {
  @Input() items: BarcodeItem[] = [];
  @Output() close = new EventEmitter<boolean>();

  options: BarcodeOptions = { ...DEFAULT_BARCODE_OPTIONS };
  isGenerating = signal(false);
  previewUpdateTrigger = signal(0);

  // Computed property for preview items (max 4)
  previewItems = computed(() => this.items.slice(0, 4));
  

  constructor(
    private barcodeService: BarcodeService,
    private languageService: LanguageService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Initialize with default options
  }

  // Translation helper
  t(key: string): string {
    return this.languageService.translate(key);
  }

  // JSON helper for template
  JSON = JSON;

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }

  onCancel() {
    this.close.emit(false);
  }

  onConfigurationChange() {
    // Trigger preview update
    this.previewUpdateTrigger.set(this.previewUpdateTrigger() + 1);
    // Force change detection
    this.cdr.detectChanges();
  }

  trackByItemId = (index: number, item: BarcodeItem): string => {
    return item.id + '-' + (this.options?.codeType || 'qr') + '-' + this.previewUpdateTrigger();
  }

  // Get label dimensions based on selected size
  getLabelDimensions(): { width: number; height: number } {
    switch (this.options.labelSize) {
      case '4x2':
        return { width: 288, height: 144 }; // 4x2 inches at 72 DPI
      case '2x1':
        return { width: 144, height: 72 }; // 2x1 inches at 72 DPI
      case '3x1':
        return { width: 216, height: 72 }; // 3x1 inches at 72 DPI
      default:
        return { width: 288, height: 144 };
    }
  }

  // Helper function to generate EAN-13 code from any string (based on React reference)
  generateEAN13Code(input: string): string {
    let numericString = '';
    for (let i = 0; i < input.length; i++) {
      numericString += input.charCodeAt(i).toString();
    }
    
    if (numericString.length < 12) {
      numericString = numericString.padEnd(12, '0');
    } else if (numericString.length > 12) {
      numericString = numericString.substring(0, 12);
    }
    
    // Calculate EAN-13 check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(numericString[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    
    return numericString + checkDigit;
  }

  async onDownloadPDF() {
    this.isGenerating.set(true);
    
    try {
      await this.generateAndDownloadPDF();
      
      this.alertService.success(
        this.t('BARCODE.PDF_GENERATED_SUCCESS'),
        this.t('COMMON.SUCCESS')
      );
      
      this.close.emit(true);
    } catch (error) {
      this.alertService.error(
        this.t('BARCODE.PDF_GENERATION_ERROR') + ': ' + (error instanceof Error ? error.message : 'Error desconocido'),
        this.t('COMMON.ERROR')
      );
    } finally {
      this.isGenerating.set(false);
    }
  }

  async onPrint() {
    this.isGenerating.set(true);
    
    try {
      const pdfBlob = await this.generatePDFBlob();
      
      // Open PDF in new window for printing
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl, '_blank');
      
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          // Clean up the object URL after printing
          setTimeout(() => {
            URL.revokeObjectURL(pdfUrl);
          }, 1000);
        };
      }
      
      this.alertService.success(
        this.t('BARCODE.PRINT_SENT'),
        this.t('COMMON.SUCCESS')
      );
    } catch (error) {
      this.alertService.error(
        this.t('BARCODE.PRINT_ERROR') + ': ' + (error instanceof Error ? error.message : 'Error desconocido'),
        this.t('COMMON.ERROR')
      );
    } finally {
      this.isGenerating.set(false);
    }
  }

  private async generateAndDownloadPDF(): Promise<void> {
    const pdfBlob = await this.generatePDFBlob();
    
    // Download the PDF
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `estock-labels-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private async generatePDFBlob(): Promise<Blob> {
    // Dynamic import of jsPDF to avoid bundle size issues
    const { default: jsPDF } = await import('jspdf');
    
    const { width, height } = this.getLabelDimensions();
    const pdf = new jsPDF({
      orientation: width > height ? 'landscape' : 'portrait',
      unit: 'pt',
      format: [width, height]
    });

    for (let i = 0; i < this.items.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }

      const item = this.items[i];
      await this.addItemToPDF(pdf, item, 10, 10, width - 20, height - 20);
    }

    return pdf.output('blob');
  }

  private async addItemToPDF(pdf: any, item: BarcodeItem, x: number, y: number, width: number, height: number) {
    const dimensions = this.getLabelDimensions();
    let currentY = y + 5; // Start with small margin
    
    // Company name at top
    if (this.options.includeCompanyLogo && this.options.companyName) {
      pdf.setFontSize(8);
      pdf.setTextColor(0, 0, 0);
      const companyTextWidth = pdf.getTextWidth(this.options.companyName);
      pdf.text(this.options.companyName, x + (width - companyTextWidth) / 2, currentY);
      currentY += 12;
    }

    // Calculate space for barcode
    const textSpaceNeeded = 30; // Reserve space for item name, description, and code
    const barcodeHeight = height - (currentY - y) - textSpaceNeeded;
    const barcodeWidth = width - 10; // 5px margin on each side
    
    // Create canvas for barcode generation with proper dimensions
    const canvas = document.createElement('canvas');
    
    if (this.options.codeType === 'qr') {
      // For QR codes, use square dimensions
      const qrSize = Math.min(barcodeHeight, barcodeWidth, 80);
      canvas.width = qrSize;
      canvas.height = qrSize;
    } else {
      // For linear barcodes, use full width but limited height
      canvas.width = barcodeWidth;
      canvas.height = Math.min(barcodeHeight, 50);
    }
    
    try {
      await this.generateBarcodeOnCanvas(canvas, item);
      
      // Convert canvas to image and add to PDF
      const imgData = canvas.toDataURL('image/png');
      const imgX = x + (width - canvas.width) / 2; // Center horizontally
      pdf.addImage(imgData, 'PNG', imgX, currentY, canvas.width, canvas.height);
      currentY += canvas.height + 5;
    } catch (error) {
      // Add error placeholder
      pdf.setFillColor(240, 240, 240);
      const errorHeight = 30;
      pdf.rect(x + 5, currentY, width - 10, errorHeight, 'F');
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(6);
      pdf.text('Error generating barcode', x + 10, currentY + errorHeight/2);
      currentY += errorHeight + 5;
    }

    // Item name
    if (this.options.includeName && item.name) {
      pdf.setFontSize(7);
      pdf.setTextColor(0, 0, 0);
      const nameTextWidth = pdf.getTextWidth(item.name);
      if (nameTextWidth <= width - 10) {
        pdf.text(item.name, x + (width - nameTextWidth) / 2, currentY);
      } else {
        // Truncate if too long
        const truncatedName = this.truncateText(pdf, item.name, width - 10, 7);
        const truncatedWidth = pdf.getTextWidth(truncatedName);
        pdf.text(truncatedName, x + (width - truncatedWidth) / 2, currentY);
      }
      currentY += 8;
    }

    // Description
    if (this.options.includeDescription && item.description && currentY < y + height - 15) {
      pdf.setFontSize(6);
      pdf.setTextColor(80, 80, 80);
      const descTextWidth = pdf.getTextWidth(item.description);
      if (descTextWidth <= width - 10) {
        pdf.text(item.description, x + (width - descTextWidth) / 2, currentY);
      } else {
        // Truncate if too long
        const truncatedDesc = this.truncateText(pdf, item.description, width - 10, 6);
        const truncatedWidth = pdf.getTextWidth(truncatedDesc);
        pdf.text(truncatedDesc, x + (width - truncatedWidth) / 2, currentY);
      }
      currentY += 8;
    }

    // Code text at bottom
    if (currentY < y + height - 8) {
      pdf.setFontSize(6);
      pdf.setTextColor(0, 0, 0);
      const displayCode = this.options.codeType === 'ean13' ? this.generateEAN13Code(item.code) : item.code;
      const codeTextWidth = pdf.getTextWidth(displayCode);
      if (codeTextWidth <= width - 10) {
        pdf.text(displayCode, x + (width - codeTextWidth) / 2, currentY);
      } else {
        // Truncate if too long
        const truncatedCode = this.truncateText(pdf, displayCode, width - 10, 6);
        const truncatedWidth = pdf.getTextWidth(truncatedCode);
        pdf.text(truncatedCode, x + (width - truncatedWidth) / 2, currentY);
      }
    }
  }

  // Helper method to truncate text that's too long
  private truncateText(pdf: any, text: string, maxWidth: number, fontSize: number): string {
    pdf.setFontSize(fontSize);
    let truncated = text;
    while (pdf.getTextWidth(truncated + '...') > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    return truncated.length < text.length ? truncated + '...' : text;
  }

  private async generateBarcodeOnCanvas(canvas: HTMLCanvasElement, item: BarcodeItem): Promise<void> {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    const dimensions = this.getLabelDimensions();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (this.options.codeType === 'qr') {
      const { default: QRCode } = await import('qrcode');
      
      // Calculate optimal QR code size based on label dimensions
      // Leave space for company name, item name, and description
      const availableHeight = dimensions.height - 60; // Reserve space for text
      const availableWidth = dimensions.width - 40; // Add margins
      const qrSize = Math.min(availableHeight, availableWidth, 120); // Max 120px for QR
      
      const qrDataUrl = await QRCode.toDataURL(item.code, {
        width: qrSize,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          // Center the QR code on the canvas
          const x = (canvas.width - qrSize) / 2;
          const y = (canvas.height - qrSize) / 2;
          ctx.drawImage(img, x, y, qrSize, qrSize);
          resolve();
        };
        img.onerror = () => reject(new Error('QR Code generation failed'));
        img.src = qrDataUrl;
      });
    } else {
      const { default: JsBarcode } = await import('jsbarcode');
      
      // Calculate optimal barcode dimensions
      const availableHeight = dimensions.height - 80; // Reserve space for text
      const barcodeHeight = Math.min(availableHeight, 60); // Max 60px height
      const barcodeWidth = Math.max(1, Math.floor((dimensions.width - 40) / 100)); // Adjust width based on label
      
      if (this.options.codeType === 'ean13') {
        const ean13Code = this.generateEAN13Code(item.code);
        JsBarcode(canvas, ean13Code, {
          format: 'EAN13',
          width: barcodeWidth,
          height: barcodeHeight,
          displayValue: true,
          fontSize: 10,
          textMargin: 3,
          margin: 10
        });
      } else if (this.options.codeType === 'code128') {
        JsBarcode(canvas, item.code, {
          format: 'CODE128',
          width: barcodeWidth,
          height: barcodeHeight,
          displayValue: true,
          fontSize: 10,
          textMargin: 3,
          margin: 10
        });
      }
    }
  }
}
