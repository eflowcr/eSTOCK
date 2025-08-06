import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../services/extras/language.service';
import { AlertService } from '../../../services/extras/alert.service';

export interface DataExportConfig {
  title: string;
  endpoint: string;
  data?: any[];
  filename?: string;
}

export type ExportFormat = 'csv' | 'xlsx';

@Component({
  selector: 'app-data-export',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './data-export.component.html',
  styleUrls: ['./data-export.component.css']
})
export class DataExportComponent {
  @Input() config!: DataExportConfig;
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  @Output() exported = new EventEmitter<void>();
  
  format: 'csv' | 'xlsx' = 'csv';
  isExporting = false;

  constructor(
    private languageService: LanguageService,
    private alertService: AlertService
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  get dataCount(): number {
    return this.config.data?.length || 0;
  }

  close(): void {
    this.isOpen = false;
    this.closed.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  startExport(): void {
    this.export();
  }

  async export(): Promise<void> {
    if (this.dataCount === 0) {
      this.alertService.error(
        this.t('no_data'),
        this.t('no_data_to_export')
      );
      return;
    }

    this.isExporting = true;
    
    try {
      if (this.format === 'xlsx') {
        await this.exportXLSX();
      } else {
        await this.exportCSV();
      }

      this.alertService.success(
        `${this.t('export_successful')} - ${this.config.title} (${this.format.toUpperCase()})`,
        this.t('export_successful')
      );

      this.exported.emit();
      this.close();
    } catch (error: any) {
      console.error('Export error:', error);
      this.alertService.error(
        this.t('export_failed'),
        error.message || this.t('failed_to_export_data')
      );
    } finally {
      this.isExporting = false;
    }
  }

  private async exportXLSX(): Promise<void> {
    // Dynamic import of xlsx library
    const XLSX = await import('xlsx');
    
    let jsonData = this.config.data || [];
    
    if (jsonData.length === 0) {
      // Fetch from endpoint if no local data
      const response = await fetch(`${this.config.endpoint}?format=json`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(this.t('failed_to_export_data_error'));
      }

      jsonData = await response.json();
    }
    
    // Create XLSX workbook
    const ws = XLSX.utils.json_to_sheet(jsonData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, this.config.title);
    
    // Generate filename
    const filename = `${this.config.filename || `${this.config.title.toLowerCase().replace(/\s+/g, '_')}_export`}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, filename);
  }

  private async exportCSV(): Promise<void> {
    let data = this.config.data || [];
    
    if (data.length === 0) {
      // Fetch from endpoint if no local data
      const response = await fetch(`${this.config.endpoint}?format=csv`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(this.t('failed_to_export_data_error'));
      }

      // If backend returns CSV directly
      if (response.headers.get('content-type')?.includes('text/csv')) {
        const csvContent = await response.text();
        this.downloadCSV(csvContent);
        return;
      }

      // If backend returns JSON
      data = await response.json();
    }
    
    // Convert local data to CSV
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            // Escape quotes and wrap in quotes if contains comma or quote
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');
      
      this.downloadCSV(csvContent);
    }
  }

  private downloadCSV(csvContent: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.config.filename || `${this.config.title.toLowerCase().replace(/\s+/g, '_')}_export`}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
