import { Component, Input, OnInit, OnChanges, SimpleChanges, ElementRef, ViewChild, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BarcodeService } from '@app/services/barcode.service';
import { BarcodeItem, CodeType } from '@app/models/barcode.model';
import { LanguageService } from '@app/services/extras/language.service';

@Component({
  selector: 'app-barcode-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './barcode-display.component.html',
  styleUrl: './barcode-display.component.css'
})
export class BarcodeDisplayComponent implements OnInit, OnChanges {
  @Input() code!: string;
  @Input() type: CodeType = 'qr';
  @Input() name?: string;
  @Input() width: number = 200;
  @Input() height: number = 60;

  @ViewChild('barcodeCanvas', { static: false }) canvasRef?: ElementRef<HTMLCanvasElement>;

  error = signal<string | null>(null);
  isLoading = signal(true);
  showCanvas = signal(false);
  displayCode = signal('');
  barcodeDataUrl = signal<string | null>(null);

  // Computed properties for better performance
  isQRCode = computed(() => this.type === 'qr');
  isLinearBarcode = computed(() => this.type === 'code128' || this.type === 'ean13');
  canvasWidth = computed(() => this.isQRCode() ? Math.min(this.width, this.height) : this.width);
  canvasHeight = computed(() => this.isQRCode() ? Math.min(this.width, this.height) : this.height);

  constructor(
    private barcodeService: BarcodeService,
    public languageService: LanguageService
  ) {}

  ngOnInit() {
    this.generateBarcode();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['code'] || changes['type'] || changes['width'] || changes['height']) {
      this.generateBarcode();
    }
  }

  // Translation helper
  t(key: string): string {
    return this.languageService.translate(key);
  }

  private async generateBarcode() {
    this.isLoading.set(true);
    this.error.set(null);
    this.showCanvas.set(false);
    this.barcodeDataUrl.set(null);

    try {
      if (this.isQRCode()) {
        await this.generateQRCode();
      } else {
        await this.generateLinearBarcode();
      }
    } catch (err) {
      this.error.set(
        this.t('BARCODE.GENERATION_ERROR') + ': ' + 
        (err instanceof Error ? err.message : 'Error desconocido')
      );
      this.isLoading.set(false);
    }
  }

  private async generateQRCode() {
    try {
      // Try to generate QR code using library
      const { default: QRCode } = await import('qrcode');
      
      // Wait for canvas to be available
      let attempts = 0;
      while (!this.canvasRef && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (this.canvasRef) {
        const canvas = this.canvasRef.nativeElement;
        const size = this.canvasWidth();
        canvas.width = size;
        canvas.height = size;

        await QRCode.toCanvas(canvas, this.code, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        });

        this.displayCode.set(this.code);
        this.showCanvas.set(true);
        this.isLoading.set(false);
      } else {
        throw new Error('Canvas not available, using fallback');
      }
    } catch (error) {
      // Fallback to external service
      const size = this.canvasWidth();
      this.barcodeDataUrl.set(`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(this.code)}`);
      this.displayCode.set(this.code);
      this.isLoading.set(false);
    }
  }

  private async generateLinearBarcode() {
    try {
      // Try to generate barcode using JsBarcode
      const { default: JsBarcode } = await import('jsbarcode');
      
      // Create a temporary canvas for barcode generation with optimal size
      const tempCanvas = document.createElement('canvas');
      
      // Set optimal dimensions for barcode generation
      if (this.type === 'ean13') {
        tempCanvas.width = 200;
        tempCanvas.height = 100;
      } else {
        tempCanvas.width = Math.max(200, this.canvasWidth());
        tempCanvas.height = Math.max(80, this.canvasHeight());
      }
      
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) {
        throw new Error('Contexto de canvas no disponible');
      }

      let displayCode = this.code;
      if (this.type === 'ean13') {
        displayCode = this.generateEAN13Code(this.code);
      }

      // Clear canvas with white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

      try {
        if (this.type === 'ean13') {
          JsBarcode(tempCanvas, displayCode, {
            format: 'EAN13',
            width: 2,
            height: 60,
            displayValue: true,
            fontSize: 14,
            textMargin: 5,
            margin: 10,
            background: '#FFFFFF',
            lineColor: '#000000'
          });
        } else if (this.type === 'code128') {
          JsBarcode(tempCanvas, this.code, {
            format: 'CODE128',
            width: 2,
            height: 50,
            displayValue: true,
            fontSize: 12,
            textMargin: 5,
            margin: 10,
            background: '#FFFFFF',
            lineColor: '#000000'
          });
        }

        // Convert canvas to data URL for display
        const dataUrl = tempCanvas.toDataURL('image/png');
        this.barcodeDataUrl.set(dataUrl);
        this.displayCode.set(displayCode);
        this.isLoading.set(false);
      } catch (jsbarcodeError) {
        // Fallback to simple representation
        await this.generateFallbackBarcode(ctx, tempCanvas);
      }
    } catch (error) {
      // Use external service as final fallback
      await this.useExternalBarcodeService();
    }
  }

  private async generateFallbackBarcode(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    let displayCode = this.code;
    if (this.type === 'ean13') {
      displayCode = this.generateEAN13Code(this.code);
    }

    // Simple barcode representation
    ctx.fillStyle = '#000000';
    ctx.font = '10px monospace';
    
    const barWidth = 2;
    const barHeight = Math.max(30, this.canvasHeight() - 30);
    const startY = 5;
    const startX = 10;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw bar pattern based on code
    for (let i = 0; i < displayCode.length && i < 20; i++) {
      const x = startX + (i * (barWidth + 1));
      const charCode = displayCode.charCodeAt(i);
      const barCount = (charCode % 3) + 1;
      
      for (let j = 0; j < barCount; j++) {
        if (x + (j * barWidth) < canvas.width - 10) {
          ctx.fillRect(x + (j * barWidth), startY, barWidth, barHeight);
        }
      }
    }
    
    // Draw code text
    const textY = startY + barHeight + 15;
    const textX = Math.max(startX, (canvas.width - ctx.measureText(displayCode).width) / 2);
    ctx.fillText(displayCode, textX, textY);

    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/png');
    this.barcodeDataUrl.set(dataUrl);
    this.displayCode.set(displayCode);
    this.isLoading.set(false);
  }

  private async useExternalBarcodeService() {
    let displayCode = this.code;
    if (this.type === 'ean13') {
      displayCode = this.generateEAN13Code(this.code);
    }

    try {
      let externalUrl = '';
      
      if (this.type === 'ean13') {
        // Use external EAN-13 service
        externalUrl = `https://bwipjs-api.metafloor.com/?bcid=ean13&text=${displayCode}&scale=3&includetext`;
      } else if (this.type === 'code128') {
        // Use external Code128 service
        externalUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(this.code)}&code=Code128&translate-esc=on`;
      }

      if (externalUrl) {
        this.barcodeDataUrl.set(externalUrl);
        this.displayCode.set(displayCode);
        this.isLoading.set(false);
      } else {
        throw new Error('No external service available');
      }
    } catch (error) {
      // Final fallback - show text representation
      this.error.set('No se pudo generar el código de barras. Usando representación de texto.');
      this.displayCode.set(displayCode);
      this.isLoading.set(false);
    }
  }

  // Helper function to generate EAN-13 code from any string (same as React reference)
  private generateEAN13Code(input: string): string {
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

  onImageError() {
    this.error.set(this.t('BARCODE.IMAGE_LOAD_ERROR'));
  }

  onImageLoad() {
    // Image loaded successfully
  }

  // Get the type display text for the preview
  getTypeDisplayText(): string {
    switch (this.type) {
      case 'qr':
        return 'QR: ' + this.displayCode();
      case 'code128':
        return 'CODE128: ' + this.displayCode();
      case 'ean13':
        return 'EAN-13: ' + this.displayCode();
      default:
        return this.displayCode();
    }
  }
}
