import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { PresentationType } from '@app/models/presentation-type.model';
import { PresentationTypesService } from '@app/services/presentation-types.service';
import { LanguageService } from '@app/services/extras/language.service';
import { AlertService } from '@app/services/extras/alert.service';
import { handleApiError } from '@app/utils';
import { MainLayoutComponent } from '@app/components/layout/main-layout.component';
import { PresentationTypeFormComponent } from '../presentation-type-form/presentation-type-form.component';
import { PresentationTypeListComponent } from '../presentation-type-list/presentation-type-list.component';
import { PresentationTypeOrderDrawerComponent } from '../presentation-type-order-drawer/presentation-type-order-drawer.component';

@Component({
  selector: 'app-presentation-types-management',
  standalone: true,
  imports: [
    CommonModule,
    MainLayoutComponent,
    PresentationTypeListComponent,
    PresentationTypeFormComponent,
    PresentationTypeOrderDrawerComponent,
  ],
  templateUrl: './presentation-types-management.component.html',
  styleUrls: ['./presentation-types-management.component.css'],
})
export class PresentationTypesManagementComponent implements OnInit {
  types: PresentationType[] = [];
  isLoading = false;
  formOpen = false;
  orderDrawerOpen = false;
  selectedType: PresentationType | null = null;

  constructor(
    private presentationTypesService: PresentationTypesService,
    private languageService: LanguageService,
    private alertService: AlertService
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  ngOnInit(): void {
    this.loadTypes();
  }

  async loadTypes(): Promise<void> {
    try {
      this.isLoading = true;
      const res = await this.presentationTypesService.getListAdmin();
      if (res?.result?.success && Array.isArray(res.data)) {
        this.types = res.data;
      }
    } catch (err: unknown) {
      this.alertService.error(this.t('error'), handleApiError(err, this.t('failed_to_load_presentation_types')));
    } finally {
      this.isLoading = false;
    }
  }

  openCreate(): void {
    this.selectedType = null;
    this.formOpen = true;
  }

  openEdit(type: PresentationType): void {
    this.selectedType = type;
    this.formOpen = true;
  }

  onSuccess(): void {
    this.loadTypes();
  }

  closeForm(): void {
    this.formOpen = false;
    this.selectedType = null;
  }

  openOrderDrawer(): void {
    this.orderDrawerOpen = true;
  }

  closeOrderDrawer(): void {
    this.orderDrawerOpen = false;
  }

  onOrderSaved(): void {
    this.loadTypes();
    this.closeOrderDrawer();
  }

  async delete(type: PresentationType): Promise<void> {
    if (!confirm(this.t('delete_presentation_type_confirm'))) return;
    try {
      const res = await this.presentationTypesService.delete(type.id);
      if (res?.result?.success) {
        this.alertService.success(this.t('success'), this.t('presentation_type_deleted'));
        this.loadTypes();
      } else {
        this.alertService.error(this.t('error'), res?.result?.message ?? this.t('failed_to_delete_presentation_type'));
      }
    } catch (err: unknown) {
      this.alertService.error(this.t('error'), handleApiError(err, this.t('failed_to_delete_presentation_type')));
    }
  }
}
