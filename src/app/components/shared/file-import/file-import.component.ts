import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../../services/extras/language.service';
import { AlertService } from '../../../services/extras/alert.service';
import { FetchService } from '../../../services/extras/fetch.service';
import { ApiResponse } from '../../../models';

export interface ImportResult {
  successful: number;
  failed: number;
  errors: string[];
}

export interface FileImportConfig {
  title: string;
  endpoint: string;
  acceptedFormats: string[];
  templateFields: string[];
  maxFileSize?: number; // in MB
  templateType?: string; // Type identifier for specific templates
}

@Component({
  selector: 'app-file-import',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-import.component.html',
  styleUrls: ['./file-import.component.css']
})
export class FileImportComponent {
  @Input() config!: FileImportConfig;
  @Input() isOpen = false;
  @Output() success = new EventEmitter<ImportResult>();
  @Output() error = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectedFile: File | null = null;
  showTemplate = false;
  isImporting = false;
  importProgress = 0;
  importResult: ImportResult | null = null;

  constructor(
    private languageService: LanguageService,
    private alertService: AlertService,
    private fetchService: FetchService
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  close(): void {
    this.isOpen = false;
    this.resetState();
    this.closed.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  resetState(): void {
    this.selectedFile = null;
    this.isImporting = false;
    this.importProgress = 0;
    this.importResult = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      const isValidFormat = this.config.acceptedFormats.some(format => 
        file.name.toLowerCase().endsWith(format.toLowerCase()) ||
        file.type.includes(format.replace('.', ''))
      );
      
      const maxSize = (this.config.maxFileSize || 10) * 1024 * 1024; // Convert MB to bytes
      
      if (!isValidFormat) {
        this.alertService.error(
          `${this.t('invalid_file_format')} - ${this.t('select_valid_format')}: ${this.config.acceptedFormats.join(', ')}`,
          this.t('file_error')
        );
        this.clearFile();
        return;
      }
      
      if (file.size > maxSize) {
        this.alertService.error(
          `${this.t('file_too_large')} - ${this.t('max_file_size')}: ${this.config.maxFileSize || 10}MB`,
          this.t('file_error')
        );
        this.clearFile();
        return;
      }
      
      this.selectedFile = file;
      this.importResult = null;
    }
  }

  removeFile(): void {
    this.selectedFile = null;
    this.importResult = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  clearFile(): void {
    this.removeFile();
  }

  downloadTemplate(): void {
    if (!this.config.templateFields?.length) return;
    
    if (this.config.templateType === 'users') {
      this.downloadUsersExcelTemplate();
      return;
    }

    if (this.config.templateType === 'locations') {
      this.downloadLocationsExcelTemplate();
      return;
    }
    
    // Para otros casos, generar CSV
    const csvContent = this.config.templateFields.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.config.title.toLowerCase().replace(/\s+/g, '_')}_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  private downloadUsersExcelTemplate(): void {
    const link = document.createElement('a');
    link.href = '/assets/files/ImportUsers.xlsx';
    link.download = 'ImportUsers.xlsx';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private downloadLocationsExcelTemplate(): void {
    const link = document.createElement('a');
    link.href = '/assets/files/ImportLocations.xlsx';
    link.download = 'ImportLocations.xlsx';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async startImport(): Promise<void> {
    if (!this.selectedFile || !this.config.endpoint) return;
    
    this.isImporting = true;
    this.importProgress = 0;
    this.importResult = null;
    
    try {
      const formData = new FormData();
      formData.append('file', this.selectedFile);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        if (this.importProgress < 90) {
          this.importProgress += 10;
        }
      }, 200);
      
      // Use FetchService for consistent API calls
      const response = await this.fetchService.upload<ApiResponse<any>>({
        API_Gateway: this.config.endpoint,
        data: formData
      });
      
      clearInterval(progressInterval);
      this.importProgress = 100;
      
      if (!response.result.success) {
        throw new Error(response.result.message || this.t('import_failed'));
      }
      
      const data = response.data;
      
      // Extract import result from response data
      const importResult: ImportResult = {
        successful: data?.successful || 0,
        failed: data?.failed || 0,
        errors: data?.errors || []
      };
      
      this.importResult = importResult;
      
      this.alertService.success(
        `${this.t('import_complete')} - ${this.t('successful')}: ${importResult.successful}, ${this.t('failed')}: ${importResult.failed}`,
        this.t('import_complete')
      );
      
      this.success.emit(importResult);
      
    } catch (error: any) {
      console.error('Import error:', error);
      this.alertService.error(
        error.message || this.t('import_failed'),
        this.t('import_error')
      );
      this.error.emit(error.message || this.t('import_failed'));
    } finally {
      this.isImporting = false;
    }
  }
}
