import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Presentation } from '@app/models/presentation.model';
import { PresentationService } from '@app/services';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';

@Component({
  selector: 'app-dialog-presentations',
  templateUrl: './dialog-presentations.component.html',
  styleUrls: ['./dialog-presentations.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class DialogPresentationsComponent implements OnInit {
  @Input() show = false;
  @Output() close = new EventEmitter<void>();
  @Output() presentationSelected = new EventEmitter<Presentation>();

  presentations: Presentation[] = [];
  loading = false;
  
  // Form for new presentation
  showCreateForm = false;
  newPresentation = {
    presentation_id: '',
    description: ''
  };

  // Delete confirmation
  showDeleteDialog = false;
  presentationToDelete: Presentation | null = null;

  constructor(
    private presentationService: PresentationService,
    private alertService: AlertService,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    if (this.show) {
      this.loadPresentations();
    }
  }

  ngOnChanges(): void {
    if (this.show) {
      this.loadPresentations();
    }
  }

  async loadPresentations(): Promise<void> {
    this.loading = true;
    try {
      const response = await this.presentationService.getAll();
      if (response.result.success) {
        this.presentations = response.data;
      } else {
        this.alertService.error(response.result.message, this.t('error'));
      }
    } catch (error) {
      this.alertService.error(this.t('failed_to_load_presentations'), this.t('error'));
    } finally {
      this.loading = false;
    }
  }

  onClose(): void {
    this.show = false;
    this.showCreateForm = false;
    this.showDeleteDialog = false;
    this.resetForm();
    this.close.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  // Create presentation
  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) {
      this.resetForm();
    }
  }

  resetForm(): void {
    this.newPresentation = {
      presentation_id: '',
      description: ''
    };
  }

  async createPresentation(): Promise<void> {
    if (!this.newPresentation.presentation_id.trim() || !this.newPresentation.description.trim()) {
      this.alertService.error(this.t('please_fill_all_fields'), this.t('error'));
      return;
    }

    this.loading = true;
    try {
      const response = await this.presentationService.create(this.newPresentation);
      if (response.result.success) {
        this.alertService.success(this.t('presentation_created_successfully'), this.t('success'));
        this.resetForm();
        this.showCreateForm = false;
        await this.loadPresentations();
      } else {
        this.alertService.error(response.result.message, this.t('error'));
      }
    } catch (error) {
      this.alertService.error(this.t('failed_to_create_presentation'), this.t('error'));
    } finally {
      this.loading = false;
    }
  }

  // Delete presentation
  confirmDelete(presentation: Presentation): void {
    this.presentationToDelete = presentation;
    this.showDeleteDialog = true;
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
    this.presentationToDelete = null;
  }

  async deletePresentation(): Promise<void> {
    if (!this.presentationToDelete) return;

    this.loading = true;
    try {
      const response = await this.presentationService.delete(this.presentationToDelete.presentation_id);
      if (response.result.success) {
        this.alertService.success(this.t('presentation_deleted_successfully'), this.t('success'));
        await this.loadPresentations();
      } else {
        this.alertService.error(response.result.message, this.t('error'));
      }
    } catch (error) {
      this.alertService.error(this.t('failed_to_delete_presentation'), this.t('error'));
    } finally {
      this.loading = false;
      this.closeDeleteDialog();
    }
  }

  // Select presentation (if needed for selection mode)
  selectPresentation(presentation: Presentation): void {
    this.presentationSelected.emit(presentation);
    this.onClose();
  }

  t(key: string): string {
    return this.languageService.translate(key);
  }
}
