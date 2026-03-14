import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { StockTransfer, StockTransferLine } from '@app/models/stock-transfer.model';
import { StockTransfersService } from '@app/services/stock-transfers.service';
import { LocationService } from '@app/services/location.service';
import { LanguageService } from '@app/services/extras/language.service';
import { AlertService } from '@app/services/extras/alert.service';
import { handleApiError } from '@app/utils';
import { MainLayoutComponent } from '@app/components/layout/main-layout.component';
import { StockTransferListComponent, LocationOption } from '../stock-transfer-list/stock-transfer-list.component';
import { StockTransferFormComponent } from '../stock-transfer-form/stock-transfer-form.component';

@Component({
  selector: 'app-stock-transfers-management',
  standalone: true,
  imports: [
    CommonModule,
    MainLayoutComponent,
    StockTransferListComponent,
    StockTransferFormComponent,
  ],
  templateUrl: './stock-transfers-management.component.html',
  styleUrls: ['./stock-transfers-management.component.css'],
})
export class StockTransfersManagementComponent implements OnInit {
  transfers: StockTransfer[] = [];
  locations: LocationOption[] = [];
  isLoading = false;
  formOpen = false;
  selectedTransfer: StockTransfer | null = null;
  selectedTransferLines: StockTransferLine[] = [];

  constructor(
    private stockTransfersService: StockTransfersService,
    private locationService: LocationService,
    private languageService: LanguageService,
    private alertService: AlertService
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  async ngOnInit(): Promise<void> {
    await this.loadLocations();
    await this.loadTransfers();
  }

  async loadLocations(): Promise<void> {
    try {
      const res = await this.locationService.getAll();
      if (res?.result?.success && Array.isArray(res.data)) {
        this.locations = res.data.map((loc: { id: string | number; location_code?: string; description?: string }) => ({
          id: String(loc.id),
          location_code: loc.location_code,
          description: loc.description,
        }));
      }
    } catch (err: unknown) {
      this.alertService.error(this.t('error'), handleApiError(err, this.t('failed_to_load_locations')));
    }
  }

  async loadTransfers(): Promise<void> {
    try {
      this.isLoading = true;
      const res = await this.stockTransfersService.getList();
      if (res?.result?.success && Array.isArray(res.data)) {
        this.transfers = res.data;
      }
    } catch (err: unknown) {
      this.alertService.error(this.t('error'), handleApiError(err, this.t('failed_to_load_stock_transfers')));
    } finally {
      this.isLoading = false;
    }
  }

  openCreate(): void {
    this.selectedTransfer = null;
    this.selectedTransferLines = [];
    this.formOpen = true;
  }

  async openEdit(t: StockTransfer): Promise<void> {
    this.selectedTransfer = t;
    this.selectedTransferLines = [];
    try {
      const res = await this.stockTransfersService.getLines(t.id);
      if (res?.result?.success && Array.isArray(res.data)) {
        this.selectedTransferLines = res.data;
      }
    } catch {
      // keep empty lines
    }
    this.formOpen = true;
  }

  onSuccess(): void {
    this.loadTransfers();
  }

  closeForm(): void {
    this.formOpen = false;
    this.selectedTransfer = null;
    this.selectedTransferLines = [];
  }

  async deleteTransfer(t: StockTransfer): Promise<void> {
    if (!confirm(this.t('delete_stock_transfer_confirm'))) return;
    try {
      const res = await this.stockTransfersService.delete(t.id);
      if (res?.result?.success) {
        this.alertService.success(this.t('success'), this.t('stock_transfer_deleted'));
        this.loadTransfers();
      } else {
        this.alertService.error(this.t('error'), res?.result?.message ?? this.t('failed_to_delete_stock_transfer'));
      }
    } catch (err: unknown) {
      this.alertService.error(this.t('error'), handleApiError(err, this.t('failed_to_delete_stock_transfer')));
    }
  }

  async executeTransfer(t: StockTransfer): Promise<void> {
    if (!confirm(this.t('stock_transfer_execute_confirm'))) return;
    try {
      const res = await this.stockTransfersService.execute(t.id);
      if (res?.result?.success) {
        this.alertService.success(this.t('success'), this.t('stock_transfer_executed'));
        this.loadTransfers();
      } else {
        this.alertService.error(this.t('error'), res?.result?.message ?? this.t('failed_to_execute_stock_transfer'));
      }
    } catch (err: unknown) {
      this.alertService.error(this.t('error'), handleApiError(err, this.t('failed_to_execute_stock_transfer')));
    }
  }
}
