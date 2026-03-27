import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Location } from '../../../models/location.model';
import { AuthorizationService } from '../../../services/extras/authorization.service';
import { AlertService } from '../../../services/extras/alert.service';
import { LanguageService } from '../../../services/extras/language.service';
import { LocationService } from '../../../services/location.service';
import { ZardDialogService } from '@app/shared/components/dialog';
import { MainLayoutComponent } from '../../layout/main-layout.component';
import { DataExportConfig } from '../../shared/data-export/data-export.component';
import { DataExportContentComponent } from '../../shared/data-export/data-export-content.component';
import { LocationListComponent } from '../location-list/location-list.component';
import { LocationFormComponent } from '../location-form/location-form.component';
import { LocationImportDialogComponent } from '../location-import-dialog/location-import-dialog.component';
import { humanizeApiError } from '@app/utils';

@Component({
  selector: 'app-location-management',
  standalone: true,
  imports: [
    CommonModule,
    MainLayoutComponent,
    LocationListComponent,
    LocationFormComponent
  ],
  templateUrl: './location-management.component.html',
  styleUrls: ['./location-management.component.css']
})
export class LocationManagementComponent implements OnInit {
  locations: Location[] = [];
  isLoading = false;
  isCreateDialogOpen = false;
  selectedLocation: Location | null = null;

  exportConfig: DataExportConfig = {
    title: 'Export Locations',
    endpoint: '/api/locations/export',
    data: [],
    filename: 'locations_export'
  };

  constructor(
    private locationService: LocationService,
    private languageService: LanguageService,
    private alertService: AlertService,
    private authService: AuthorizationService,
    private dialogService: ZardDialogService
  ) {}

  ngOnInit(): void {
    this.loadLocations();
  }

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  async loadLocations(): Promise<void> {
    try {
      this.isLoading = true;
      const response = await this.locationService.getAll();
      
      if (response.result.success && response.data) {
        this.locations = response.data;
        this.exportConfig.data = this.locations;
      }
      // When data is empty or load fails, no error toast; UI shows "No data" state.
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      this.isLoading = false;
    }
  }

  openCreateDialog(): void {
    this.selectedLocation = null;
    this.isCreateDialogOpen = true;
  }

  openImportDialog(): void {
    this.dialogService.create({
      zTitle: this.t('import_data'),
      zContent: LocationImportDialogComponent,
      zData: { onSuccess: () => this.loadLocations() },
      zHideFooter: true,
      zCustomClasses: 'sm:max-w-[95vw]',
    });
  }

  openExportDialog(): void {
    this.exportConfig.data = this.localizeLocationExport(this.locations);
    this.dialogService.create({
      zTitle: this.t('export_data'),
      zDescription: this.t('export_description'),
      zContent: DataExportContentComponent,
      zData: { config: this.exportConfig, onExported: () => {} },
      zHideFooter: true,
      zCustomClasses: 'sm:max-w-md',
    });
  }

  private localizeLocationExport(locations: Location[]): Record<string, any>[] {
    const isEs = this.languageService.getCurrentLanguage() !== 'en';
    const h = isEs ? {
      id: 'ID', location_code: 'Código', description: 'Descripción',
      zone: 'Zona', type: 'Tipo', is_active: 'Activo',
      is_way_out: 'Salida', created_at: 'Creado el', updated_at: 'Actualizado el',
    } : {
      id: 'ID', location_code: 'Code', description: 'Description',
      zone: 'Zone', type: 'Type', is_active: 'Active',
      is_way_out: 'Way Out', created_at: 'Created At', updated_at: 'Updated At',
    };
    return locations.map(l => ({
      [h.id]: (l as any).id ?? '',
      [h.location_code]: (l as any).location_code,
      [h.description]: (l as any).description ?? '',
      [h.zone]: (l as any).zone ?? '',
      [h.type]: (l as any).type,
      [h.is_active]: (l as any).is_active,
      [h.is_way_out]: (l as any).is_way_out ?? false,
      [h.created_at]: (l as any).created_at,
      [h.updated_at]: (l as any).updated_at,
    }));
  }

  closeCreateDialog(): void {
    this.isCreateDialogOpen = false;
    this.selectedLocation = null;
  }

  onLocationCreated(): void {
    this.loadLocations();
    this.closeCreateDialog();
  }

  onLocationUpdated(): void {
    this.loadLocations();
  }

  onLocationDeleted(): void {
    this.loadLocations();
  }

  onEditLocation(location: Location): void {
    this.selectedLocation = location;
    this.isCreateDialogOpen = true;
  }
}
