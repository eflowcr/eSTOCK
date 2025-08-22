import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Location } from '../../../models/location.model';
import { AuthorizationService } from '../../../services/extras/authorization.service';
import { AlertService } from '../../../services/extras/alert.service';
import { LanguageService } from '../../../services/extras/language.service';
import { LocationService } from '../../../services/location.service';
import { MainLayoutComponent } from '../../layout/main-layout.component';
import { DataExportComponent, DataExportConfig } from '../../shared/data-export/data-export.component';
import { FileImportComponent, FileImportConfig, ImportResult } from '../../shared/file-import/file-import.component';
import { LocationListComponent } from '../location-list/location-list.component';
import { LocationFormComponent } from '../location-form/location-form.component';

@Component({
  selector: 'app-location-management',
  standalone: true,
  imports: [
    CommonModule,
    FileImportComponent,
    DataExportComponent,
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
  isImportDialogOpen = false;
  isExportDialogOpen = false;
  selectedLocation: Location | null = null;

  // Export configuration
  exportConfig: DataExportConfig = {
    title: 'Export Locations',
    endpoint: '/api/locations/export',
    data: [],
    filename: 'locations_export'
  };

  // Import configuration
  importConfig: FileImportConfig = {
    title: 'import_locations',
    endpoint: '/api/locations/import',
    acceptedFormats: ['.csv', '.xlsx', '.xls'],
    templateFields: ['id', 'descripcion', 'zona', 'tipo'],
    maxFileSize: 10,
    templateType: 'locations'
  };

  constructor(
    private locationService: LocationService,
    private languageService: LanguageService,
    private alertService: AlertService,
    private authService: AuthorizationService
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
      } else {
        this.alertService.error(
          this.t('error'),
          this.t('failed_to_load_locations')
        );
      }
    } catch (error) {
      console.error('Error loading locations:', error);
      this.alertService.error(
        this.t('error'),
        this.t('failed_to_load_locations')
      );
    } finally {
      this.isLoading = false;
    }
  }

  openCreateDialog(): void {
    this.selectedLocation = null;
    this.isCreateDialogOpen = true;
  }

  openImportDialog(): void {
    this.isImportDialogOpen = true;
  }

  openExportDialog(): void {
    this.isExportDialogOpen = true;
  }

  closeCreateDialog(): void {
    this.isCreateDialogOpen = false;
    this.selectedLocation = null;
  }

  closeImportDialog(): void {
    this.isImportDialogOpen = false;
  }

  closeExportDialog(): void {
    this.isExportDialogOpen = false;
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

  onImportSuccess(result: ImportResult): void {
    this.alertService.success(
      this.t('success'),
      this.t('locations_imported_successfully')
    );
    this.loadLocations();
    this.closeImportDialog();
  }

  onImportError(error: string): void {
    this.alertService.error(this.t('error'), error);
  }

  onEditLocation(location: Location): void {
    this.selectedLocation = location;
    this.isCreateDialogOpen = true;
  }
}
