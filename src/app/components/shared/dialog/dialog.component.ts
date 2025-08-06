import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../../services/extras/language.service';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dialog.component.html'
})
export class DialogComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() showFooter = true;
  @Input() showConfirm = true;
  @Input() cancelText = '';
  @Input() confirmText = '';
  @Input() confirmDisabled = false;
  @Input() confirmButtonClass = 'px-4 py-2 text-sm font-medium text-white bg-[#00113f] border border-transparent rounded-md hover:bg-[#3e66ea] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  
  @Output() closed = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<void>();

  constructor(private languageService: LanguageService) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  get defaultCancelText(): string {
    return this.cancelText || this.t('cancel');
  }

  get defaultConfirmText(): string {
    return this.confirmText || this.t('confirm');
  }

  close(): void {
    this.isOpen = false;
    this.closed.emit();
  }

  confirm(): void {
    this.confirmed.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
