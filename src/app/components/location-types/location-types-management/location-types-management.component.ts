import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { LocationType } from '@app/models/location-type.model';
import { LocationTypesService } from '@app/services/location-types.service';
import { LanguageService } from '@app/services/extras/language.service';
import { AlertService } from '@app/services/extras/alert.service';
import { handleApiError } from '@app/utils';
import { MainLayoutComponent } from '@app/components/layout/main-layout.component';
import { LocationTypeFormComponent } from '../location-type-form/location-type-form.component';
import { LocationTypeListComponent } from '../location-type-list/location-type-list.component';
import { LocationTypeOrderDrawerComponent } from '../location-type-order-drawer/location-type-order-drawer.component';

@Component({
  selector: 'app-location-types-management',
  standalone: true,
  imports: [CommonModule, MainLayoutComponent, LocationTypeListComponent, LocationTypeFormComponent, LocationTypeOrderDrawerComponent],
  templateUrl: './location-types-management.component.html',
  styleUrls: ['./location-types-management.component.css'],
})
export class LocationTypesManagementComponent implements OnInit {
  types: LocationType[] = [];
  isLoading = false;
  formOpen = false;
  orderDrawerOpen = false;
  selectedType: LocationType | null = null;

  constructor(
    private locationTypesService: LocationTypesService,
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
      const res = await this.locationTypesService.getListAdmin();
      if (res?.result?.success && Array.isArray(res.data)) {
        this.types = res.data;
      }
    } catch (err: any) {
      this.alertService.error(this.t('error'), handleApiError(err, this.t('failed_to_load_location_types')));
    } finally {
      this.isLoading = false;
    }
  }

  openCreate(): void {
    this.selectedType = null;
    this.formOpen = true;
  }

  openEdit(type: LocationType): void {
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

  async delete(type: LocationType): Promise<void> {
    if (!confirm(this.t('delete_location_type_confirm'))) return;
    try {
      const res = await this.locationTypesService.delete(type.id);
      if (res?.result?.success) {
        this.alertService.success(this.t('success'), this.t('location_type_deleted'));
        this.loadTypes();
      } else {
        this.alertService.error(this.t('error'), res?.result?.message ?? this.t('failed_to_delete_location_type'));
      }
    } catch (err: any) {
      this.alertService.error(this.t('error'), handleApiError(err, this.t('failed_to_delete_location_type')));
    }
  }
}
