import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { PresentationType } from '@app/models/presentation-type.model';
import { PresentationTypesService } from '@app/services/presentation-types.service';
import { LanguageService } from '@app/services/extras/language.service';
import { AlertService } from '@app/services/extras/alert.service';
import { handleApiError } from '@app/utils';
import { DrawerComponent } from '@app/shared/components/drawer';
import { ZardButtonComponent } from '@app/shared/components/button/button.component';

@Component({
  selector: 'app-presentation-type-order-drawer',
  standalone: true,
  imports: [CommonModule, DrawerComponent, ZardButtonComponent],
  templateUrl: './presentation-type-order-drawer.component.html',
  styleUrls: ['./presentation-type-order-drawer.component.css'],
})
export class PresentationTypeOrderDrawerComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() types: PresentationType[] = [];
  @Output() success = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  orderedTypes: PresentationType[] = [];
  isSaving = false;

  constructor(
    private presentationTypesService: PresentationTypesService,
    private languageService: LanguageService,
    private alertService: AlertService
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.orderedTypes = [...this.types].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }
  }

  close(): void {
    this.orderedTypes = [];
    this.closed.emit();
  }

  moveUp(index: number): void {
    if (index <= 0) return;
    [this.orderedTypes[index - 1], this.orderedTypes[index]] = [this.orderedTypes[index], this.orderedTypes[index - 1]];
  }

  moveDown(index: number): void {
    if (index >= this.orderedTypes.length - 1) return;
    [this.orderedTypes[index], this.orderedTypes[index + 1]] = [this.orderedTypes[index + 1], this.orderedTypes[index]];
  }

  async saveOrder(): Promise<void> {
    if (this.isSaving || this.orderedTypes.length === 0) return;
    try {
      this.isSaving = true;
      for (let i = 0; i < this.orderedTypes.length; i++) {
        const type = this.orderedTypes[i];
        const sort_order = (i + 1) * 10;
        await this.presentationTypesService.update(type.id, {
          code: type.code,
          name: type.name,
          sort_order,
          is_active: type.is_active,
        });
      }
      this.alertService.success(this.t('success'), this.t('presentation_type_order_saved'));
      this.success.emit();
      this.close();
    } catch (err: unknown) {
      this.alertService.error(this.t('error'), handleApiError(err, this.t('error_saving_presentation_type')));
    } finally {
      this.isSaving = false;
    }
  }
}
