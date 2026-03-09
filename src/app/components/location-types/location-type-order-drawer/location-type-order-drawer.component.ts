import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { LocationType } from '@app/models/location-type.model';
import { LocationTypesService } from '@app/services/location-types.service';
import { LanguageService } from '@app/services/extras/language.service';
import { AlertService } from '@app/services/extras/alert.service';
import { handleApiError } from '@app/utils';
import { DrawerComponent } from '@app/shared/components/drawer';
import { ZardButtonComponent } from '@app/shared/components/button/button.component';

@Component({
  selector: 'app-location-type-order-drawer',
  standalone: true,
  imports: [CommonModule, DrawerComponent, ZardButtonComponent],
  templateUrl: './location-type-order-drawer.component.html',
  styleUrls: ['./location-type-order-drawer.component.css'],
})
export class LocationTypeOrderDrawerComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() types: LocationType[] = [];
  @Output() success = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  /** Ordered list for the UI (sorted by sort_order, then editable by user). */
  orderedTypes: LocationType[] = [];
  isSaving = false;

  constructor(
    private locationTypesService: LocationTypesService,
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
      const updates = this.orderedTypes.map((type, index) => ({
        id: type.id,
        sort_order: (index + 1) * 10,
      }));
      for (const u of updates) {
        const type = this.orderedTypes.find((t) => t.id === u.id)!;
        await this.locationTypesService.update(type.id, {
          code: type.code,
          name: type.name,
          sort_order: u.sort_order,
          is_active: type.is_active,
        });
      }
      this.alertService.success(this.t('success'), this.t('location_type_order_saved'));
      this.success.emit();
      this.close();
    } catch (err: any) {
      this.alertService.error(this.t('error'), handleApiError(err, this.t('error_saving_location_type')));
    } finally {
      this.isSaving = false;
    }
  }
}
