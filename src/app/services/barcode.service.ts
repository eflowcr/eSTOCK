import { Injectable } from '@angular/core';
import { 
  BarcodeItem, 
  BarcodeOptions, 
  BarcodeGenerationRequest, 
  BarcodeGenerationResponse, 
  CodeType, 
  LABEL_SIZES 
} from '@app/models/barcode.model';

@Injectable({
  providedIn: 'root'
})
export class BarcodeService {
  
  constructor() {}

  /**
   * Genera un código EAN-13 válido a partir de cualquier string
   */
  generateEAN13Code(input: string): string {
    if (!input || typeof input !== 'string') {
      input = 'UNKNOWN';
    }
    
    // Limpiar el input: remover caracteres especiales
    let cleanInput = input.replace(/[^a-zA-Z0-9]/g, '');
    
    let numericString = '';
    for (let i = 0; i < cleanInput.length; i++) {
      const char = cleanInput[i];
      if (/\d/.test(char)) {
        // Si ya es un dígito, usarlo
        numericString += char;
      } else {
        // Convertir letra a número (A=0, B=1, etc., solo último dígito para mantener 0-9)
        const charCode = char.toUpperCase().charCodeAt(0) - 65;
        numericString += (charCode % 10).toString();
      }
    }
    
    // Asegurar exactamente 12 dígitos para EAN-13 (el 13º es dígito de verificación)
    if (numericString.length < 12) {
      numericString = numericString.padEnd(12, '0');
    } else if (numericString.length > 12) {
      numericString = numericString.substring(0, 12);
    }
    
    // Calcular dígito de verificación
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(numericString[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    
    return numericString + checkDigit;
  }

  /**
   * Genera un código de barras en un canvas
   */
  async generateBarcodeOnCanvas(
    item: BarcodeItem, 
    canvas: HTMLCanvasElement, 
    codeType: CodeType
  ): Promise<void> {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      if (codeType === 'qr') {
        // Generar código QR
        canvas.width = 200;
        canvas.height = 200;

        // Usar servicio externo como fallback para QR
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(item.code)}`;
        
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            try {
              ctx.drawImage(img, 0, 0, 200, 200);
              resolve();
            } catch (error) {
              reject(error);
            }
          };
          img.onerror = () => {
            // Fallback si falla la imagen
            ctx.fillStyle = '#ff0000';
            ctx.font = '12px Arial';
            ctx.fillText('QR Code Error', 10, 100);
            reject(new Error('QR Code generation failed'));
          };
          img.src = qrUrl;
        });
      } else {
        // Para códigos lineales, usar representación de texto simple
        canvas.width = 300;
        canvas.height = 100;

        let displayCode = item.code;
        if (codeType === 'ean13') {
          displayCode = this.generateEAN13Code(item.code);
        }

        // Dibujar representación simple del código de barras
        ctx.fillStyle = '#000000';
        ctx.font = '10px monospace';
        
        // Dibujar barras simuladas
        const barWidth = 2;
        const barHeight = 60;
        const startY = 10;
        
        for (let i = 0; i < displayCode.length; i++) {
          const x = 10 + (i * (barWidth + 1));
          const charCode = displayCode.charCodeAt(i);
          const barCount = (charCode % 5) + 1;
          
          for (let j = 0; j < barCount; j++) {
            ctx.fillRect(x + (j * barWidth), startY, barWidth, barHeight);
          }
        }
        
        // Dibujar texto del código
        ctx.fillText(displayCode, 10, startY + barHeight + 15);
      }
    } catch (error) {
      // Mostrar error en canvas
      canvas.width = 200;
      canvas.height = 100;
      ctx.fillStyle = '#ff0000';
      ctx.font = '12px Arial';
      ctx.fillText('Generation Error', 10, 50);
      throw error;
    }
  }

  /**
   * Convierte artículos a elementos de código de barras
   */
  convertArticlesToBarcodeItems(articles: any[]): BarcodeItem[] {
    return articles.map(article => ({
      id: `sku-${article.id || article.sku}`,
      code: article.sku,
      name: article.name,
      description: article.description || undefined,
      type: 'sku' as const,
      metadata: {
        id: article.id,
        sku: article.sku,
        name: article.name,
        description: article.description,
        unit_price: article.unit_price,
        presentation: article.presentation,
        track_by_lot: article.track_by_lot,
        track_by_serial: article.track_by_serial,
        track_expiration: article.track_expiration,
        min_quantity: article.min_quantity,
        max_quantity: article.max_quantity,
        image_url: article.image_url,
        is_active: article.is_active,
        created_at: article.created_at,
        updated_at: article.updated_at
      }
    }));
  }

  /**
   * Convierte ubicaciones a elementos de código de barras
   */
  convertLocationsToBarcodeItems(locations: any[]): BarcodeItem[] {
    return locations.map(location => ({
      id: `location-${location.id}`,
      code: location.location_code,
      name: `${location.location_code}${location.zone ? ` - ${location.zone}` : ''}`,
      description: location.description || `Ubicación: ${location.location_code}`,
      type: 'location' as const,
      metadata: {
        id: location.id,
        location_code: location.location_code,
        description: location.description,
        zone: location.zone,
        type: location.type,
        is_active: location.is_active,
        created_at: location.created_at,
        updated_at: location.updated_at
      }
    }));
  }

  /**
   * Convierte tareas de recepción y picking a elementos de código de barras
   */
  convertTasksToBarcodeItems(tasks: any[]): BarcodeItem[] {
    return tasks.map(task => {
      const isReceivingTask = task.inbound_number !== undefined;
      const isPickingTask = task.outbound_number !== undefined;
      
      const taskType = isReceivingTask ? 'Recepción' : (isPickingTask ? 'Picking' : 'Tarea');
      const taskNumber = task.inbound_number || task.outbound_number || task.task_id;
      
      return {
        id: `task-${task.id}`,
        code: task.task_id,
        name: `${taskType} - ${task.task_id}`,
        description: `${taskNumber}${task.notes ? ` - ${task.notes}` : ''}`,
        type: 'task' as const,
        metadata: {
          id: task.id,
          task_id: task.task_id,
          inbound_number: task.inbound_number,
          outbound_number: task.outbound_number,
          created_by: task.created_by,
          assigned_to: task.assigned_to,
          status: task.status,
          priority: task.priority,
          notes: task.notes,
          items: task.items,
          created_at: task.created_at,
          updated_at: task.updated_at,
          completed_at: task.completed_at,
          task_type: taskType
        }
      };
    });
  }

  /**
   * Convierte lotes a elementos de código de barras
   */
  convertLotsToBarcodItems(lots: any[], sku: string): BarcodeItem[] {
    return lots.map(lot => ({
      id: `lot-${lot.id}`,
      code: `${sku}-LOT${lot.lotNumber}`,
      name: `${sku} - Lote ${lot.lotNumber}`,
      description: `Exp: ${lot.expirationDate ? new Date(lot.expirationDate).toLocaleDateString() : 'N/A'} | Qty: ${lot.quantity || 0}`,
      type: 'sku' as const,
      metadata: {
        lotNumber: lot.lotNumber,
        expirationDate: lot.expirationDate,
        quantity: lot.quantity
      }
    }));
  }

  /**
   * Convierte series a elementos de código de barras
   */
  convertSerialsToBarcodItems(serials: any[], sku: string): BarcodeItem[] {
    return serials.map(serial => ({
      id: `serial-${serial.serialNumber || serial.id}`,
      code: `${sku}-SN${serial.serialNumber}`,
      name: `${sku} - Serie ${serial.serialNumber}`,
      description: undefined,
      type: 'sku' as const,
      metadata: {
        serialNumber: serial.serialNumber
      }
    }));
  }

  /**
   * Obtiene las dimensiones de la etiqueta
   */
  getLabelDimensions(labelSize: string) {
    return LABEL_SIZES[labelSize as keyof typeof LABEL_SIZES] || LABEL_SIZES['4x2'];
  }

  /**
   * Genera un PDF real con las etiquetas usando jsPDF
   */
  async generatePDF(request: BarcodeGenerationRequest): Promise<BarcodeGenerationResponse> {
    try {

      // Importar jsPDF dinámicamente
      const { jsPDF } = await import('jspdf');
      
      // Crear nuevo documento PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const labelWidth = 80;
      const labelHeight = 40;
      const labelsPerRow = Math.floor((pageWidth - 2 * margin) / (labelWidth + 5));
      const labelsPerPage = Math.floor((pageHeight - 2 * margin) / (labelHeight + 5)) * labelsPerRow;

      let currentPage = 0;
      let currentRow = 0;
      let currentCol = 0;

      for (let i = 0; i < request.items.length; i++) {
        const item = request.items[i];
        
        // Nueva página si es necesario
        if (i > 0 && i % labelsPerPage === 0) {
          pdf.addPage();
          currentPage++;
          currentRow = 0;
          currentCol = 0;
        }

        // Calcular posición de la etiqueta
        const x = margin + (currentCol * (labelWidth + 5));
        const y = margin + (currentRow * (labelHeight + 5));

        // Dibujar borde de la etiqueta
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.1);
        pdf.rect(x, y, labelWidth, labelHeight);

        // Configurar fuente
        pdf.setFontSize(8);
        pdf.setTextColor(0, 0, 0);

        // Agregar nombre de la empresa si está habilitado
        if (request.options.includeCompanyLogo && request.options.companyName) {
          pdf.setFontSize(6);
          pdf.setFont('helvetica', 'bold');
          pdf.text(request.options.companyName, x + 2, y + 4);
        }

        // Agregar código del item
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(item.code, x + 2, y + 12);

        // Agregar nombre del item si está habilitado
        if (request.options.includeName && item.name) {
          pdf.setFontSize(6);
          pdf.setFont('helvetica', 'normal');
          const truncatedName = item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name;
          pdf.text(truncatedName, x + 2, y + 18);
        }

        // Agregar descripción si está habilitada
        if (request.options.includeDescription && item.description) {
          pdf.setFontSize(5);
          const truncatedDesc = item.description.length > 25 ? item.description.substring(0, 25) + '...' : item.description;
          pdf.text(truncatedDesc, x + 2, y + 24);
        }

        // Agregar tipo de código
        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'italic');
        pdf.text(request.options.codeType.toUpperCase(), x + 2, y + 30);

        // Agregar fecha de generación
        pdf.setFontSize(5);
        pdf.setFont('helvetica', 'normal');
        const today = new Date().toLocaleDateString('es-ES');
        pdf.text(`Generado: ${today}`, x + 2, y + 35);

        // Actualizar posición para la siguiente etiqueta
        currentCol++;
        if (currentCol >= labelsPerRow) {
          currentCol = 0;
          currentRow++;
        }
      }

      // Generar el PDF como blob
      const pdfBlob = pdf.output('blob');

      return {
        success: true,
        message: `PDF generado exitosamente con ${request.items.length} etiquetas`,
        pdfData: pdfBlob
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Descarga un archivo PDF
   */
  downloadPDF(blob: Blob, filename: string = `estock-labels-${new Date().toISOString().split('T')[0]}.pdf`) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
